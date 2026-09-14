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
  const imageDataUrl = parsed.imageDataUrl;
  if (!imageDataUrl) return res.status(400).json({ error: 'Missing image' });

  const [header, b64] = imageDataUrl.split(',');
  const mediaType = (header && header.match(/:(.*?);/)?.[1]) || 'image/jpeg';

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
        max_tokens: 30,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
            { type: 'text', text: 'This is a photo of a Greek vehicle license plate. Extract ONLY the license plate number (letters and digits, e.g. ΑΒΓ1234 or ABC1234). Return ONLY the plate number with no spaces, dashes, or punctuation. If unreadable return empty string.' },
          ],
        }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const raw = (data?.content?.[0]?.text || '').trim().toUpperCase();
    // Extract just the plate-shaped substring instead of trusting the whole response body —
    // guards against the model wrapping the answer in a stray word or two despite instructions
    // (e.g. "ΠΙΝΑΚΙΔΑ ΑΒΓ1234") from silently mangling the result.
    const cleaned = raw.replace(/[^A-ZΑ-Ω0-9]/g, '');
    const m = cleaned.match(/[A-ZΑ-Ω]{2,3}\d{3,4}/);
    const plate = m ? m[0] : '';
    return res.status(200).json({ plate });
  } catch (e) {
    console.error('Plate OCR error:', e);
    return res.status(500).json({ error: e.message });
  }
};
