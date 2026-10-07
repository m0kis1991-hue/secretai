// Public self-signup endpoint: a prospective workshop registers itself.
// Always creates the account INACTIVE — the super admin activates it from
// the Πληρωμές (payments) flow once the subscription is paid. Deliberately
// only accepts a fixed set of fields; is_active/workshop_id are never
// taken from the request body.
//
// Uses the same gearlog_clients table as api/admin-clients.js — see that
// file for the CREATE TABLE SQL.

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genWorkshopId() {
  const seg = (n) => Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  return `GL-${seg(4)}-${seg(4)}`;
}

async function safeJson(resp) {
  const text = await resp.text();
  try { return text ? JSON.parse(text) : null; } catch (_) { return { message: text }; }
}

// Verifies a Google "Sign in with Google" ID token server-side, without a
// client library (this project has no npm dependencies/build step — see
// vercel.json). This is Google's own documented approach for backends that
// don't use their client libraries: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
async function verifyGoogleCredential(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return { ok: false, error: 'Η εγγραφή με Google δεν είναι διαθέσιμη αυτή τη στιγμή' };
  if (!credential || typeof credential !== 'string') return { ok: false, error: 'Μη έγκυρο Google credential' };

  const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  const info = await safeJson(resp);
  if (!resp.ok || !info) return { ok: false, error: 'Η επαλήθευση Google απέτυχε' };
  if (info.aud !== clientId) return { ok: false, error: 'Μη έγκυρο Google credential (λάθος client)' };
  if (info.email_verified !== 'true' && info.email_verified !== true) {
    return { ok: false, error: 'Το email Google δεν είναι επιβεβαιωμένο' };
  }
  return { ok: true, email: info.email, name: info.name || info.given_name || '' };
}

// Creates a Stripe Checkout Session for a recurring monthly subscription so
// a self-signup customer can pay immediately instead of waiting for the
// admin to log a manual payment. Returns null (never throws) if Stripe isn't
// configured yet, or if session creation fails for any reason — signup
// itself must never fail just because Stripe had a hiccup; the admin can
// always activate manually as before.
async function createStripeCheckoutSession({ clientId, workshopId, email, stripeCustomerId }) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!secretKey || !priceId) return null;

  const base = (process.env.PUBLIC_APP_URL || 'https://synergeio-pro.vercel.app').replace(/\/$/, '');
  const params = new URLSearchParams();
  params.append('mode', 'subscription');
  params.append('line_items[0][price]', priceId);
  params.append('line_items[0][quantity]', '1');
  params.append('client_reference_id', clientId);
  params.append('success_url', `${base}/app.html?stripe=success`);
  params.append('cancel_url', `${base}/app.html?stripe=cancel`);
  params.append('metadata[workshop_id]', workshopId);
  params.append('subscription_data[metadata][workshop_id]', workshopId);
  // Reuse the existing Stripe customer on a retry (e.g. a failed/canceled
  // subscription paying again) instead of creating a duplicate customer —
  // customer and customer_email are mutually exclusive on a Checkout Session.
  if (stripeCustomerId) params.append('customer', stripeCustomerId);
  else if (email) params.append('customer_email', email);

  try {
    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data = await safeJson(resp);
    if (!resp.ok) {
      console.error('stripe checkout session error:', JSON.stringify(data));
      return null;
    }
    return data?.url || null;
  } catch (e) {
    console.error('stripe checkout session exception:', e);
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Public, non-secret runtime config (e.g. whether Google signup is turned
  // on). Folded into this file rather than its own api/config.js — Vercel's
  // Hobby plan caps a deployment at 12 serverless functions.
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Η εγγραφή δεν είναι διαθέσιμη αυτή τη στιγμή. Δοκιμάστε αργότερα.' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (_) {
    return res.status(400).json({ error: 'Μη έγκυρα δεδομένα αίτησης' });
  }

  // Honeypot: a hidden field real users never fill in. Reject outright — no
  // workshop_id is ever created for it, so the caller must not treat this as
  // success (a "fake success" here would let anyone tripping the honeypot get
  // permanent local app access with no matching record for the admin to bill).
  if ((body.website || '').toString().trim()) {
    return res.status(400).json({ error: 'Η υποβολή απορρίφθηκε' });
  }

  const workshopName = (body.workshop_name || '').toString().trim().slice(0, 120);
  const phone = (body.phone || '').toString().trim().slice(0, 30);

  // Two signup paths: a verified Google identity (contact_name/email come
  // from Google, never trusted from the client), or plain form fields.
  let contactName, email, signupSource;
  if (body.google_credential) {
    const g = await verifyGoogleCredential(body.google_credential);
    if (!g.ok) return res.status(400).json({ error: g.error });
    contactName = g.name || null;
    email = g.email;
    signupSource = 'Google';
  } else {
    contactName = (body.contact_name || '').toString().trim().slice(0, 120) || null;
    email = (body.email || '').toString().trim().slice(0, 200) || null;
    signupSource = 'φόρμα';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Μη έγκυρο email' });
    }
  }

  if (!workshopName) return res.status(400).json({ error: 'Το όνομα συνεργείου είναι υποχρεωτικό' });
  if (!phone) return res.status(400).json({ error: 'Το τηλέφωνο είναι υποχρεωτικό' });

  const baseUrl = `${supabaseUrl}/rest/v1/gearlog_clients`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Prefer': 'return=representation',
  };

  const payload = {
    workshop_name: workshopName,
    contact_name: contactName,
    email,
    phone,
    monthly_fee: 0,
    payment_day: 1,
    is_active: false,
    notes: `Εγγραφή από ${signupSource} (self-signup) — ${new Date().toISOString().slice(0, 10)}`,
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    const workshopId = genWorkshopId();
    try {
      const resp = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...payload, workshop_id: workshopId }),
      });
      const data = await safeJson(resp);
      if (resp.ok) {
        const created = Array.isArray(data) ? data[0] : data;
        const checkoutUrl = await createStripeCheckoutSession({
          clientId: created.id,
          workshopId: created.workshop_id,
          email,
        });
        return res.status(201).json({ workshopId: created.workshop_id, workshopName: created.workshop_name, checkoutUrl });
      }
      if (data?.code !== '23505') {
        console.error('signup insert error:', JSON.stringify(data));
        return res.status(500).json({ error: 'Αποτυχία εγγραφής. Δοκιμάστε ξανά.' });
      }
      // 23505 = workshop_id collision (astronomically unlikely) — retry with a new code.
    } catch (e) {
      console.error('signup error:', e);
      return res.status(500).json({ error: e.message });
    }
  }
  return res.status(500).json({ error: 'Αποτυχία δημιουργίας μοναδικού κωδικού. Δοκιμάστε ξανά.' });
};

// Reused by api/license-check.js so a locked-out (unpaid) existing account
// can retry payment directly, without a new signup.
module.exports.createStripeCheckoutSession = createStripeCheckoutSession;
