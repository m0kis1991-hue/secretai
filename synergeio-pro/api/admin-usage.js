// Super admin read-only view of anonymous usage counters (see api/usage-ping.js).
// Requires env vars: SUPERADMIN_PIN, SUPABASE_URL, SUPABASE_SERVICE_KEY

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const adminPin = process.env.SUPERADMIN_PIN;
  if (!adminPin) return res.status(503).json({ error: 'Super admin not configured. Set SUPERADMIN_PIN env var.' });

  const pin = req.headers['x-admin-pin'];
  if (pin !== adminPin) return res.status(401).json({ error: 'Λάθος PIN' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.' });
  }

  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/gearlog_usage?select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
    });
    const data = await resp.json();
    return res.status(200).json(Array.isArray(data) ? data : []);
  } catch (e) {
    console.error('admin-usage error:', e);
    return res.status(500).json({ error: e.message });
  }
};
