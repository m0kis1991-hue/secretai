// Called by client apps on every load to check subscription status
// Returns: { active, paymentDay, monthlyFee, workshopName, daysUntilPayment }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
};
