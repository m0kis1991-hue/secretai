module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, name, date, time, services } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Missing phone' });

  const svcLine = services ? `\n🚿 ${services}` : '';
  const message =
    `Γεια σας ${name || 'σας'}! 👋\n` +
    `Το ραντεβού σας επιβεβαιώθηκε ✅\n\n` +
    `📅 ${date}\n` +
    `🕐 ${time}` +
    `${svcLine}\n\n` +
    `Σας περιμένουμε!`;

  const waUrl  = buildWaUrl(phone, message);
  const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;

  // Try Twilio if credentials are present
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_PHONE;

  if (sid && token && from) {
    try {
      const to = formatPhoneGR(phone);
      const r  = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          },
          body: new URLSearchParams({ To: to, From: from, Body: message }),
        }
      );
      const data = await r.json();
      if (r.ok) return res.json({ sent: true, method: 'sms' });
      // Twilio error — fall through to manual links
      return res.json({ sent: false, twilioError: data.message, waUrl, smsUrl });
    } catch (e) {
      return res.json({ sent: false, twilioError: e.message, waUrl, smsUrl });
    }
  }

  // No Twilio configured — return manual links
  return res.json({ sent: false, waUrl, smsUrl });
};

function formatPhoneGR(phone) {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('30')) return '+' + d;
  if (d.startsWith('0'))  return '+30' + d.slice(1);
  return '+30' + d;
}

function buildWaUrl(phone, message) {
  const d    = phone.replace(/\D/g, '');
  const intl = d.startsWith('30') ? d : '30' + (d.startsWith('0') ? d.slice(1) : d);
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}
