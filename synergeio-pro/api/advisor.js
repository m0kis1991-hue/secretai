module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI not configured on server' });

  const body = req.body || {};
  const parsed = typeof body === 'string' ? JSON.parse(body) : body;
  const { stats, vehicleTypes } = parsed;

  const prompt = `Είσαι έμπειρος σύμβουλος επιχείρησης για αυτοκινητιστικά συνεργεία στην Ελλάδα. Ανάλυσε τα παρακάτω δεδομένα και δώσε συγκεκριμένες, πρακτικές συμβουλές για την ανάπτυξη της επιχείρησης και προσέλκυση νέων πελατών.

Δεδομένα συνεργείου:
${JSON.stringify(stats, null, 2)}

Τύποι οχημάτων που εξυπηρετεί: ${vehicleTypes || 'αυτοκίνητα'}

Οδηγίες:
- Δώσε 5-6 συγκεκριμένες συμβουλές βασισμένες ΑΠΟΚΛΕΙΣΤΙΚΑ στα παραπάνω δεδομένα
- Σύγκρινε με τα μέσα όρια αντίστοιχων συνεργείων στην Ελλάδα
- Κάθε συμβουλή να είναι εφαρμόσιμη αμέσως
- Χρησιμοποίησε απλή γλώσσα, χωρίς τεχνικούς όρους
- Συμπερίλαβε και ψηφιακές στρατηγικές marketing εφόσον ταιριάζουν

Απάντησε ΜΟΝΟ με έγκυρο JSON (χωρίς markdown, χωρίς εξηγήσεις):
{
  "summary": "Σύντομη αξιολόγηση 2-3 προτάσεων",
  "score": <αριθμός 1-10 υγεία επιχείρησης>,
  "advice": [
    {
      "title": "Σύντομος τίτλος (max 6 λέξεις)",
      "description": "Συγκεκριμένη περιγραφή τι να κάνεις (2-3 προτάσεις)",
      "impact": "Αναμενόμενο αποτέλεσμα",
      "priority": "high|medium|low"
    }
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data?.content?.[0]?.text || '';
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return res.status(500).json({ error: 'No JSON in response' });

    const result = JSON.parse(raw.slice(start, end + 1));
    return res.status(200).json(result);
  } catch (e) {
    console.error('Advisor error:', e);
    return res.status(500).json({ error: e.message });
  }
};
