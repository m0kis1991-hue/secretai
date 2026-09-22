// Super admin payment history for GearLog clients
// Requires env vars: SUPERADMIN_PIN, SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// SQL to run once in Supabase:
//   CREATE TABLE gearlog_payments (
//     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//     client_id UUID NOT NULL REFERENCES gearlog_clients(id) ON DELETE CASCADE,
//     amount DECIMAL(10,2) NOT NULL,
//     paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
//     method TEXT,
//     note TEXT,
//     created_at TIMESTAMPTZ DEFAULT NOW()
//   );
//   ALTER TABLE gearlog_payments ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "service_role_all" ON gearlog_payments USING (true) WITH CHECK (true);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminPin = process.env.SUPERADMIN_PIN;
  if (!adminPin) return res.status(503).json({ error: 'Super admin not configured. Set SUPERADMIN_PIN env var.' });

  const pin = req.headers['x-admin-pin'];
  if (pin !== adminPin) return res.status(401).json({ error: 'Λάθος PIN' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.' });
  }

  const baseUrl = `${supabaseUrl}/rest/v1/gearlog_payments`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Prefer': 'return=representation',
  };

  try {
    if (req.method === 'GET') {
      const clientId = req.query?.client_id;
      const qs = clientId
        ? `?client_id=eq.${encodeURIComponent(clientId)}&select=*&order=paid_at.desc,created_at.desc`
        : `?select=*&order=paid_at.desc,created_at.desc`;
      const resp = await fetch(`${baseUrl}${qs}`, { headers });
      const data = await resp.json();
      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const clientId = body?.client_id;
      const amount = Number(body?.amount);
      if (!clientId) return res.status(400).json({ error: 'Λείπει client_id' });
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Μη έγκυρο ποσό' });

      const payload = {
        client_id: clientId,
        amount,
        paid_at: body?.paid_at || new Date().toISOString().slice(0, 10),
        method: (body?.method || '').trim() || null,
        note: (body?.note || '').trim() || null,
      };
      const resp = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
      const data = await resp.json();
      if (!resp.ok) {
        console.error('admin-payments insert error:', JSON.stringify(data));
        return res.status(resp.status).json({ error: data?.message || 'Αποτυχία καταγραφής πληρωμής' });
      }
      return res.status(201).json(Array.isArray(data) ? data[0] : data);
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id || (typeof req.body === 'string' ? JSON.parse(req.body) : req.body)?.id;
      if (!id) return res.status(400).json({ error: 'Λείπει id' });
      await fetch(`${baseUrl}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('admin-payments error:', e);
    return res.status(500).json({ error: e.message });
  }
};
