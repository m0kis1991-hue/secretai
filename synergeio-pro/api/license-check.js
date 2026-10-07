// GET: called by client apps on every load to check subscription status.
//   Returns: { active, paymentDay, monthlyFee, workshopName, daysUntilPayment }
// POST: anonymous usage counters, reported by client apps so the super admin
//   can see activity/usage trends WITHOUT ever receiving customer/vehicle/
//   personal data (folded in here rather than its own file — Vercel's Hobby
//   plan caps a deployment at 12 serverless functions).
//
// SQL to run once in Supabase:
//   CREATE TABLE gearlog_usage (
//     workshop_id TEXT PRIMARY KEY,
//     last_active_at TIMESTAMPTZ,
//     customers_count INTEGER DEFAULT 0,
//     vehicles_count INTEGER DEFAULT 0,
//     services_count INTEGER DEFAULT 0,
//     job_orders_count INTEGER DEFAULT 0,
//     appointments_count INTEGER DEFAULT 0,
//     app_version TEXT,
//     updated_at TIMESTAMPTZ DEFAULT NOW()
//   );
//   ALTER TABLE gearlog_usage ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "service_role_all" ON gearlog_usage USING (true) WITH CHECK (true);

function toCount(n) {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

async function handleLicenseCheck(req, res) {
  const workshopId = req.query?.workshopId;

  // Super admin access code — bypass Supabase lookup entirely
  const superadminCode = process.env.SUPERADMIN_ACCESS_CODE;
  if (superadminCode && workshopId === superadminCode) {
    return res.status(200).json({ active: true, registered: true, superadmin: true });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  // Not configured → fail-open (allow access)
  if (!supabaseUrl || !supabaseKey || !workshopId) {
    return res.status(200).json({ active: true, configured: false });
  }

  try {
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/gearlog_clients?workshop_id=eq.${encodeURIComponent(workshopId)}&select=is_active,payment_day,monthly_fee,workshop_name`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const data = await resp.json();

    if (!resp.ok) {
      // A real Supabase failure (bad key, RLS, outage) must not look identical
      // to "this workshop was never registered" — same fail-open response as
      // the network-error catch below, but logged so it's actually diagnosable.
      console.error('license-check lookup error:', JSON.stringify(data));
      return res.status(200).json({ active: true, configured: false });
    }

    if (!Array.isArray(data) || !data.length) {
      return res.status(200).json({ active: true, registered: false });
    }

    const client = data[0];

    // Calculate days until next payment
    let daysUntilPayment = null;
    if (client.payment_day) {
      const today = new Date();
      let payDate = new Date(today.getFullYear(), today.getMonth(), client.payment_day);
      if (payDate < today) payDate = new Date(today.getFullYear(), today.getMonth() + 1, client.payment_day);
      daysUntilPayment = Math.ceil((payDate - today) / 86400000);
    }

    return res.status(200).json({
      active: client.is_active,
      registered: true,
      paymentDay: client.payment_day,
      monthlyFee: client.monthly_fee,
      workshopName: client.workshop_name,
      daysUntilPayment,
    });
  } catch (e) {
    console.error('license-check error:', e);
    return res.status(200).json({ active: true, configured: false });
  }
}

// Lets an already-registered but inactive (unpaid/frozen) account get a
// fresh Stripe Checkout link to pay immediately, without admin involvement.
// Reuses the same session-creation logic as a brand-new signup.
async function handleRetryPayment(req, res, body) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const workshopId = (body.workshopId || '').toString().trim();
  if (!supabaseUrl || !supabaseKey || !workshopId) {
    return res.status(400).json({ error: 'Λείπει workshopId' });
  }
  try {
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/gearlog_clients?workshop_id=eq.${encodeURIComponent(workshopId)}&select=id,email,is_active,stripe_customer_id`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const data = await resp.json();
    if (!resp.ok) {
      console.error('retry-payment lookup error:', JSON.stringify(data));
      return res.status(502).json({ error: 'Σφάλμα βάσης δεδομένων. Δοκιμάστε ξανά.' });
    }
    const client = Array.isArray(data) && data[0] ? data[0] : null;
    if (!client) return res.status(404).json({ error: 'Δεν βρέθηκε ο λογαριασμός' });
    if (client.is_active) return res.status(400).json({ error: 'Ο λογαριασμός είναι ήδη ενεργός' });

    const { createStripeCheckoutSession } = require('./signup.js');
    const checkoutUrl = await createStripeCheckoutSession({
      clientId: client.id,
      workshopId,
      email: client.email,
      stripeCustomerId: client.stripe_customer_id,
    });
    if (!checkoutUrl) return res.status(503).json({ error: 'Η πληρωμή μέσω Stripe δεν είναι διαθέσιμη αυτή τη στιγμή. Επικοινωνήστε με τον πάροχο.' });
    return res.status(200).json({ checkoutUrl });
  } catch (e) {
    console.error('retry-payment error:', e);
    return res.status(500).json({ error: e.message });
  }
}

async function handleUsagePing(req, res, body) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(200).json({ ok: false, configured: false });

  const workshopId = (body.workshopId || '').toString().trim();
  if (!workshopId) return res.status(400).json({ error: 'Λείπει workshopId' });

  const counts = body.counts || {};
  const payload = {
    workshop_id: workshopId,
    last_active_at: new Date().toISOString(),
    customers_count: toCount(counts.customers),
    vehicles_count: toCount(counts.vehicles),
    services_count: toCount(counts.services),
    job_orders_count: toCount(counts.jobOrders),
    appointments_count: toCount(counts.appointments),
    app_version: (body.appVersion || '').toString().slice(0, 40) || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/gearlog_usage?on_conflict=workshop_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error('license-check usage-ping upsert error:', errText);
      return res.status(200).json({ ok: false });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('license-check usage-ping error:', e);
    return res.status(200).json({ ok: false });
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (_) {
      return res.status(400).json({ error: 'Μη έγκυρα δεδομένα' });
    }
    if (body.action === 'retry_payment') return handleRetryPayment(req, res, body);
    return handleUsagePing(req, res, body);
  }
  return handleLicenseCheck(req, res);
};
