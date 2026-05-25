const PARTS_PROMPT = `You are an expert automotive mechanic and parts specialist with access to OEM catalogs.

Vehicle: {vehicle}
Task: {task}

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "parts": [
    {
      "name": "part name in Greek",
      "specs": "exact technical specifications (viscosity grade, dimensions, capacity, material, tolerance)",
      "oemRef": "manufacturer OEM part number if you are confident (e.g. 11427512300 for BMW), otherwise null",
      "brands": [
        { "name": "BrandName", "partNumber": "exact part number for this vehicle" }
      ],
      "searchQuery": "optimal search string for Greek online stores (part name + key specs, no make/model)"
    }
  ],
  "note": "important compatibility notes, specific engine codes this applies to, warnings"
}

Rules:
- Provide 2-4 aftermarket brands per part WITH their specific part numbers for this exact vehicle (e.g. Bosch 0451103370, Mann W712/43, NGK BKR6EKB)
- specs must be actionable: oil capacity in liters, viscosity (e.g. "5W-30 ACEA C3"), filter thread pitch, spark plug gap, pad thickness
- OEM ref: only include if you are highly confident it matches this exact vehicle configuration
- If the task requires no physical parts (wheel alignment, diagnostics, cleaning), return parts: [] with explanation in note
- searchQuery: short, precise, suitable for searching in AutoDoc / Skroutz (e.g. "φίλτρο λαδιού W712/43" or "μπουζί BKR6EKB")`;

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
  const { task, brand, model, year, engine, fuel } = parsed;
  if (!task) return res.status(400).json({ error: 'Missing task' });

  // Build a rich vehicle description for the AI
  const vehicleParts = [
    brand, model,
    year ? `(${year})` : '',
    engine ? `${engine}cc` : '',
    fuel ? fuel : '',
  ].filter(Boolean);
  const vehicle = vehicleParts.join(' ') || parsed.vehicle || 'Unknown vehicle';

  const prompt = PARTS_PROMPT
    .replace('{vehicle}', vehicle)
    .replace('{task}', task);

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
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message || 'Anthropic error' });

    const txt = data?.content?.[0]?.text || '';
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ error: 'Could not parse AI response' });

    return res.status(200).json(JSON.parse(m[0]));
  } catch (e) {
    console.error('Parts AI error:', e);
    return res.status(500).json({ error: e.message || 'Parts AI failed' });
  }
};
