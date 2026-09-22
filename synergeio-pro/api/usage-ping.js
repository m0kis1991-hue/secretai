// Anonymous usage counters, reported by client apps so the super admin can see
// activity/usage trends WITHOUT ever receiving customer/vehicle/personal data.
// Only integer counts + a timestamp are accepted — nothing else is stored here.
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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(200).json({ ok: false, configured: false });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
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
      console.error('usage-ping upsert error:', errText);
      return res.status(200).json({ ok: false });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('usage-ping error:', e);
    return res.status(200).json({ ok: false });
  }
};
