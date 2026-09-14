// Super admin CRUD for GearLog clients
// Requires env vars: SUPERADMIN_PIN, SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// SQL to run once in Supabase:
//   CREATE TABLE gearlog_clients (
//     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//     workshop_id TEXT UNIQUE,
//     workshop_name TEXT NOT NULL,
//     contact_name TEXT,
//     email TEXT,
//     phone TEXT,
//     monthly_fee DECIMAL(10,2) DEFAULT 0,
//     payment_day INTEGER DEFAULT 1,
//     is_active BOOLEAN DEFAULT true,
//     notes TEXT,
//     created_at TIMESTAMPTZ DEFAULT NOW()
//   );
//   ALTER TABLE gearlog_clients ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "service_role_all" ON gearlog_clients USING (true) WITH CHECK (true);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

  const baseUrl = `${supabaseUrl}/rest/v1/gearlog_clients`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Prefer': 'return=representation',
  };

  try {
    if (req.method === 'GET') {
      const resp = await fetch(`${baseUrl}?select=*&order=created_at.desc`, { headers });
      const data = await resp.json();
      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const resp = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await resp.json();
      return res.status(201).json(Array.isArray(data) ? data[0] : data);
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { id, ...data } = body;
      const resp = await fetch(`${baseUrl}?id=eq.${id}`, { method: 'PATCH', headers, body: JSON.stringify(data) });
      const result = await resp.json();
      return res.status(200).json(Array.isArray(result) ? result[0] : result);
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id || (typeof req.body === 'string' ? JSON.parse(req.body) : req.body)?.id;
      await fetch(`${baseUrl}?id=eq.${id}`, { method: 'DELETE', headers });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('admin-clients error:', e);
    return res.status(500).json({ error: e.message });
  }
};
