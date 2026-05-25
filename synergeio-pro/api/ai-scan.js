const REG_PROMPT = `You are an expert OCR assistant specialised in reading Greek vehicle registration certificates (Άδεια Κυκλοφορίας — green booklet issued by the Greek Ministry of Transport).

The Greek registration booklet has THREE distinct pages. Read ALL pages provided carefully:

═══ PAGE: ΕΞΩΦΥΛΛΟ (Cover / Front page) ═══
At the bottom of the cover you will find:
  (Α) ΑΡΙΘΜΟΣ ΚΥΚΛΟΦΟΡΙΑΣ : [PLATE NUMBER HERE]
  ΑΡΙΘΜΟΣ ΕΓΓΡΑΦΟΥ : [document number — do NOT use this as the plate]

⚠ CRITICAL: The PLATE NUMBER is ONLY the value next to "(Α) ΑΡΙΘΜΟΣ ΚΥΚΛΟΦΟΡΙΑΣ".
  ΑΡΙΘΜΟΣ ΕΓΓΡΑΦΟΥ is a different document reference (starts with a letter like "Α 3043834") — NEVER use it as the plate.
  Greek car plates: 3 Greek letters + 4 digits (e.g. ΑΒΓ 1234)
  Greek motorcycle plates: 3 letters + 3 digits (e.g. ZKZ 267)

═══ PAGE: ΣΤΟΙΧΕΙΑ ΟΧΗΜΑΤΟΣ (Vehicle Data) ═══
Field codes printed on this inner page:
  (B)   = EU first registration date (may be blank on old Greek certs — prefer field (4) instead)
  (4)   = Ημερομηνία πρώτης άδειας στην Ελλάδα = first registration date IN GREECE → extract year only
  (D.1) = ΜΑΡΚΑ = manufacturer / brand (e.g. B.M.W.)
  (D.2) = ΤΥΠΟΣ = type/variant code (e.g. 259)
  (D.3) = ΕΜΠΟΡΙΚΗ ΟΝΟΜΑΣΙΑ = commercial model name (e.g. R 850 GS)
  (E)   = ΑΡΙΘΜΟΣ ΑΝΑΓΝΩΡΙΣΗΣ ΟΧΗΜΑΤΟΣ = VIN / chassis number — EXACTLY 17 uppercase alphanumeric chars.
          Read each character carefully: never confuse O (letter) with 0 (zero), I/i/l with 1 (one), B with 8, S with 5, Z with 2.
          VIN never contains I, O, or Q. Example from this doc: WB10403D6XZC98918
  (J)   = ΚΑΤΗΓΟΡΙΑ ΟΧΗΜΑΤΟΣ = vehicle category:
            M1 → car, L3E / L / ΔΙΚΥΚΛΟ → moto, N → truck, other → car
  (7)   = ΕΙΔΟΣ ΟΧΗΜΑΤΟΣ in Greek (ΔΙΚΥΚΛΟ = motorcycle, ΕΠΙΒΑΤΙΚΟ = car, ΦΟΡΤΗΓΟ = truck)
  (15)  = ΤΥΠΟΣ ΑΜΑΞΗΣ (ΔΙΚΥΚΛΗ ΜΟΤΟΣ = motorcycle body)
  (P.1) = ΚΥΛΙΝΔΡΙΣΜΟΣ = engine displacement in cm³/cc (integer, e.g. 848)
  (P.3) = ΤΥΠΟΣ ΚΑΥΣΙΜΟΥ in Greek:
            ΒΕΝΖΙΝΗ / ΒΕΝΖΙNH → gasoline
            ΠΕΤΡΕΛΑΙΟ / DIESEL → diesel
            ΥΓΡΑΕΡΙΟ / LPG → lpg
            ΥΒΡΙΔΙΚΟ → hybrid
            ΗΛΕΚΤΡΙΚΟ → electric
  (R)   = ΧΡΩΜΑ = colour in Greek (e.g. ΕΡΥΘΡΟ=red, ΛΕΥΚΟ=white, ΜΑΥΡΟ=black, ΑΣΗΜΙ=silver, ΓΚΡΙ=grey)

═══ PAGE: ΟΝΟΜΑΣΤΙΚΑ ΣΤΟΙΧΕΙΑ (Personal Data) ═══
  (C.1.1) = ΕΠΩΝΥΜΟ = holder's SURNAME (family name)
  (C.1.2) = ΜΙΚΡΟ ΟΝΟΜΑ = holder's FIRST NAME(S)
  Combine as "Firstname Lastname" (C.1.2 + space + C.1.1)

Return ONLY a valid JSON object (use null for any field not clearly visible):
{
  "plate": "value from (Α) ΑΡΙΘΜΟΣ ΚΥΚΛΟΦΟΡΙΑΣ on cover — uppercase, keep letters and digits and dash/space",
  "vin": "17-char VIN from field (E)",
  "brand": "manufacturer from D.1",
  "model": "commercial name from D.3",
  "year": first_registration_year_integer_from_field_4_or_B,
  "engine": engine_cc_integer_from_P1,
  "fuel": "one of exactly: gasoline, diesel, lpg, hybrid, electric",
  "color": "colour from R, translated to English",
  "type": "one of exactly: car, moto, boat, truck",
  "ownerName": "Firstname Lastname from C.1.2 + C.1.1",
  "mileage": null
}`;

const ODO_SUFFIX = `\n\nAn additional odometer/instrument-cluster photo is also included as the last image. Read the current mileage reading (km) from it and set the "mileage" field to that integer. If unreadable set "mileage" to null.`;

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

  const regUrls = parsed.imageDataUrls || (parsed.imageDataUrl ? [parsed.imageDataUrl] : []);
  const odoUrl = parsed.odometerDataUrl || null;
  if (!regUrls.length) return res.status(400).json({ error: 'Missing image(s)' });

  function urlToBlock(url) {
    const [header, b64] = url.split(',');
    const mediaType = (header && header.match(/:(.*?);/)?.[1]) || 'image/jpeg';
    return { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } };
  }

  const imageBlocks = regUrls.map(urlToBlock);
  if (odoUrl) imageBlocks.push(urlToBlock(odoUrl));

  const prompt = REG_PROMPT + (odoUrl ? ODO_SUFFIX : '');

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
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: [
            ...imageBlocks,
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message || 'Anthropic error' });

    const txt = data?.content?.[0]?.text || '';
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ error: 'Could not parse AI response' });

    const result = JSON.parse(m[0]);

    // Normalize plate: uppercase, keep Greek/Latin letters and digits, preserve dash
    if (result.plate) {
      result.plate = result.plate
        .toUpperCase()
        .replace(/[^A-ZΑ-ΩΆΈΉΊΌΎΏ0-9\-\s]/g, '')
        .trim();
    }

    return res.status(200).json(result);
  } catch (e) {
    console.error('AI scan error:', e);
    return res.status(500).json({ error: e.message || 'AI scan failed' });
  }
};
