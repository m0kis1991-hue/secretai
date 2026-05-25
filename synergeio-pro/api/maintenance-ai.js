const PROMPT = `You are an expert automotive technician with precise knowledge of specific vehicle mechanics and manufacturer maintenance schedules.

Vehicle: {vehicle}
Current mileage: {mileage} km

⚠ CRITICAL — TECHNICAL ACCURACY FIRST:
Before listing any tasks, you MUST consider the actual mechanical design of this specific vehicle:
- DRIVETRAIN: BMW R-series (R850GS, R1100GS, R1200GS, etc.) → shaft drive, NO chain/belt. Chain-drive bikes → suggest chain & sprockets. Belt-drive (Harley-Davidson, some Indian) → suggest belt inspection.
- ENGINE COOLING: air-cooled engines → NO coolant flush. Liquid-cooled → include coolant.
- IGNITION: diesel engines → NO spark plugs. Petrol/gasoline → suggest spark plugs.
- ELECTRIC VEHICLES → NO oil change, NO spark plugs, NO fuel filter, NO timing belt.
- AUTOMATIC TRANSMISSION → NO clutch cable/plate service (unless wet-clutch auto).
- Only suggest tasks that physically exist on this vehicle's actual design.

Based on the manufacturer's official maintenance schedule, list recommended maintenance tasks for this vehicle at this mileage. Focus on tasks that are due or overdue.

Return ONLY a valid JSON object (no markdown, no extra text):
{
  "tasks": [
    {
      "name": "task name in Greek",
      "reason": "brief interval note in Greek (e.g. κάθε 15.000km ή κάθε 2 χρόνια)",
      "priority": "urgent|recommended|suggested"
    }
  ],
  "note": "important note about this vehicle's specific design/specs in Greek (or empty string)"
}

Rules:
- ALL text must be in Greek
- priority "urgent": overdue or safety-critical
- priority "recommended": due at this mileage/age per manufacturer schedule
- priority "suggested": good practice but not strictly required
- Be specific to the make/model/year — account for the actual mechanical design
- Return 5-10 tasks maximum
- NEVER suggest a task that does not apply to this vehicle's actual mechanical design`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI not configured' });

  const body = req.body || {};
  const parsed = typeof body === 'string' ? JSON.parse(body) : body;
  const { brand, model, year, mileage, engine, fuel } = parsed;

  const vehicleParts = [brand, model, year ? `(${year})` : '', engine ? `${engine}cc` : '', fuel || ''].filter(Boolean);
  const vehicle = vehicleParts.join(' ') || 'Unknown vehicle';
  const mileageStr = mileage ? `${Number(mileage).toLocaleString()} km` : 'άγνωστα χιλιόμετρα';

  const prompt = PROMPT.replace('{vehicle}', vehicle).replace('{mileage}', mileageStr);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const txt = data?.content?.[0]?.text || '';
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ error: 'Could not parse AI response' });
    return res.status(200).json(JSON.parse(m[0]));
  } catch (e) {
    return res.status(500).json({ error: e.message || 'AI failed' });
  }
};
