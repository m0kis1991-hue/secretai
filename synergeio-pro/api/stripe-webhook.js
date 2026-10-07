// Stripe webhook: keeps gearlog_clients.is_active in sync with real payments,
// automatically — no admin action needed for a self-signup customer who pays
// via Stripe. Verifies the signature itself with Node's built-in `crypto`
// (no stripe npm package — this project has no dependencies/build step).
//
// Register this URL in the Stripe Dashboard → Developers → Webhooks:
//   https://synergeio-pro.vercel.app/api/stripe-webhook
// Listening for: checkout.session.completed, invoice.paid,
//   invoice.payment_failed, customer.subscription.deleted
// Then set STRIPE_WEBHOOK_SECRET to the "Signing secret" Stripe shows you.
//
// Additional SQL (run once, alongside gearlog_payments/gearlog_usage):
//   ALTER TABLE gearlog_clients ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
//   ALTER TABLE gearlog_clients ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
//   ALTER TABLE gearlog_payments ADD COLUMN IF NOT EXISTS stripe_event_id TEXT UNIQUE;
//     (the UNIQUE constraint is what makes webhook retries safe — Stripe can
//     and does redeliver the same event, and a 23505 conflict on insert is
//     treated below as "already recorded", not an error)

const crypto = require('crypto');

module.exports.config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Stripe's own documented verification algorithm, reimplemented without their SDK:
// https://docs.stripe.com/webhooks#verify-manually
function verifyStripeSignature(rawBody, sigHeader, secret, toleranceSeconds) {
  if (!sigHeader || !secret) return false;
  const parts = {};
  sigHeader.split(',').forEach((kv) => {
    const idx = kv.indexOf('=');
    if (idx === -1) return;
    const k = kv.slice(0, idx);
    const v = kv.slice(idx + 1);
    if (k === 't') parts.t = v;
    if (k === 'v1') { parts.v1 = parts.v1 || []; parts.v1.push(v); }
  });
  if (!parts.t || !parts.v1 || !parts.v1.length) return false;

  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const matches = parts.v1.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig, 'utf8');
      return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch (_) {
      return false;
    }
  });
  if (!matches) return false;

  const age = Math.abs(Date.now() / 1000 - Number(parts.t));
  return age <= (toleranceSeconds || 300);
}

async function supaFetch(path, options) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      ...(options?.headers || {}),
    },
  });
}

async function findClientBy(field, value) {
  if (!value) return null;
  const resp = await supaFetch(`gearlog_clients?${field}=eq.${encodeURIComponent(value)}&select=id,is_active,stripe_customer_id,stripe_subscription_id`);
  const data = await resp.json().catch(() => null);
  return Array.isArray(data) && data[0] ? data[0] : null;
}

// invoice.paid / invoice.payment_failed both need "which of our clients does
// this Stripe invoice belong to" — try the subscription id first (stable for
// the life of the subscription), falling back to the customer id (covers an
// invoice arriving before checkout.session.completed has backfilled either).
async function findClientForInvoice(invoice) {
  return (await findClientBy('stripe_subscription_id', invoice.subscription))
    || (await findClientBy('stripe_customer_id', invoice.customer));
}

// Throws on a failed PATCH (rather than swallowing it) so the caller's outer
// try/catch turns it into a 500 — Stripe retries a non-2xx webhook response,
// which is what we want here: a customer who genuinely paid must not end up
// silently stuck inactive with no error anywhere because a transient
// Supabase hiccup was never surfaced.
async function activateClient(clientId, extra) {
  const resp = await supaFetch(`gearlog_clients?id=eq.${encodeURIComponent(clientId)}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({ is_active: true, ...extra }),
  });
  if (!resp.ok) throw new Error(`activateClient failed for ${clientId}: ${resp.status}`);
}

async function deactivateClient(clientId, note) {
  const resp = await supaFetch(`gearlog_clients?id=eq.${encodeURIComponent(clientId)}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({ is_active: false, notes: note }),
  });
  if (!resp.ok) throw new Error(`deactivateClient failed for ${clientId}: ${resp.status}`);
}

// Flags a payment problem WITHOUT locking the account out — Stripe retries a
// failed card charge several times (its own "Smart Retries" schedule) before
// giving up, and freezing on the very first attempt would lock out paying
// customers over a routine, often self-resolving decline (e.g. a temporary
// bank hold). customer.subscription.deleted (fired once Stripe's retries are
// exhausted and the subscription is actually canceled) is what really freezes
// the account — see that case below.
async function notePaymentIssue(clientId, note) {
  const resp = await supaFetch(`gearlog_clients?id=eq.${encodeURIComponent(clientId)}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({ notes: note }),
  });
  // Non-critical (no access change happens here) — log rather than throw, so
  // a failed-to-write note doesn't make Stripe retry this event forever.
  if (!resp.ok) console.error(`notePaymentIssue failed for ${clientId}: ${resp.status}`);
}

// stripeEventId + the UNIQUE constraint on gearlog_payments.stripe_event_id
// make this safe to call twice for the same Stripe event (Stripe retries
// webhook deliveries) — a 23505 conflict means "already recorded", not an error.
async function logPayment(clientId, amount, note, stripeEventId) {
  if (!amount || amount <= 0) return;
  try {
    const resp = await supaFetch('gearlog_payments', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        client_id: clientId,
        amount,
        paid_at: new Date().toISOString().slice(0, 10),
        method: 'Stripe',
        note,
        stripe_event_id: stripeEventId || null,
      }),
    });
    if (!resp.ok) {
      const errBody = await resp.json().catch(() => null);
      if (errBody?.code === '23505') return; // duplicate delivery of the same event — already logged
      console.error('stripe-webhook: payment log failed', JSON.stringify(errBody));
    }
  } catch (e) {
    console.error('stripe-webhook: payment log failed (gearlog_payments table missing?)', e.message);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!webhookSecret || !supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Stripe webhook not configured' });
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];
  if (!verifyStripeSignature(rawBody, sig, webhookSecret)) {
    console.error('stripe-webhook: signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.client_reference_id) {
          await activateClient(session.client_reference_id, {
            stripe_customer_id: session.customer || null,
            stripe_subscription_id: session.subscription || null,
          });
          // This IS the first payment — invoice.paid for the same charge has
          // billing_reason 'subscription_create' and deliberately skips
          // logging below, so this is the only place it gets recorded.
          await logPayment(session.client_reference_id, (session.amount_total || 0) / 100, 'Αρχική πληρωμή συνδρομής (Stripe)', event.id);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const client = await findClientForInvoice(invoice);
        if (client) {
          // Backfill either id if this invoice arrived before checkout.session.completed did.
          await activateClient(client.id, {
            stripe_customer_id: client.stripe_customer_id || invoice.customer || null,
            stripe_subscription_id: client.stripe_subscription_id || invoice.subscription || null,
          });
          const isRenewal = invoice.billing_reason !== 'subscription_create';
          if (isRenewal) {
            await logPayment(client.id, (invoice.amount_paid || 0) / 100, 'Αυτόματη ανανέωση συνδρομής (Stripe)', event.id);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const client = await findClientForInvoice(invoice);
        if (client) {
          // Doesn't lock the account — see notePaymentIssue's comment. Stripe
          // will retry; customer.subscription.deleted is the real freeze signal.
          await notePaymentIssue(client.id, `⚠ Αποτυχία πληρωμής Stripe (θα ξαναδοκιμάσει αυτόματα) — ${new Date().toISOString().slice(0, 10)}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const client = await findClientBy('stripe_subscription_id', subscription.id);
        if (client) {
          await deactivateClient(client.id, `Η συνδρομή Stripe ακυρώθηκε — ${new Date().toISOString().slice(0, 10)}`);
        }
        break;
      }

      default:
        break; // ignore event types we don't act on
    }
    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('stripe-webhook processing error:', e);
    return res.status(500).json({ error: e.message });
  }
};
