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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
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
  const contactName = (body.contact_name || '').toString().trim().slice(0, 120) || null;
  const phone = (body.phone || '').toString().trim().slice(0, 30);
  const email = (body.email || '').toString().trim().slice(0, 200) || null;

  if (!workshopName) return res.status(400).json({ error: 'Το όνομα συνεργείου είναι υποχρεωτικό' });
  if (!phone) return res.status(400).json({ error: 'Το τηλέφωνο είναι υποχρεωτικό' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Μη έγκυρο email' });
  }

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
    notes: `Εγγραφή από φόρμα (self-signup) — ${new Date().toISOString().slice(0, 10)}`,
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
        return res.status(201).json({ workshopId: created.workshop_id, workshopName: created.workshop_name });
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
