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
  (4)   = Ημερομηνία πρώτης άδειας στην Ελλάδα = first registration date IN GREECE → extract year only (4-digit integer)
  (D.1) = ΜΑΡΚΑ = manufacturer / brand (e.g. B.M.W., TOYOTA, VOLKSWAGEN)
  (D.2) = ΤΥΠΟΣ = type/variant code
  (D.3) = ΕΜΠΟΡΙΚΗ ΟΝΟΜΑΣΙΑ = commercial model name (e.g. R 850 GS, GOLF, YARIS)
  (E)   = ΑΡΙΘΜΟΣ ΑΝΑΓΝΩΡΙΣΗΣ ΟΧΗΜΑΤΟΣ = VIN / chassis number — EXACTLY 17 uppercase alphanumeric characters.
          ⚠ Read each character individually and carefully:
          • Never confuse letter O with digit 0 (zero)
          • Never confuse letters I or l with digit 1 (one)
          • Never confuse letter B with digit 8
          • Never confuse letter S with digit 5
          • Never confuse letter Z with digit 2
          • VIN NEVER contains the letters I, O, or Q — if you see them, it is a misread
          • A valid VIN example: WB10403D6XZC98918
  (J)   = ΚΑΤΗΓΟΡΙΑ ΟΧΗΜΑΤΟΣ = vehicle category:
            M1 → car, L3E / L / ΔΙΚΥΚΛΟ → moto, N1 / N → truck, other → car
  (7)   = ΕΙΔΟΣ ΟΧΗΜΑΤΟΣ (ΔΙΚΥΚΛΟ=moto, ΕΠΙΒΑΤΙΚΟ=car, ΦΟΡΤΗΓΟ=truck)
  (P.1) = ΚΥΛΙΝΔΡΙΣΜΟΣ = engine displacement in cm³/cc — return as integer (e.g. 1598, 848)
  (P.3) = ΤΥΠΟΣ ΚΑΥΣΙΜΟΥ = fuel type. Map as follows:
            ΒΕΝΖΙΝΗ / ΒΕΝΖΙNH / SUPER / ΑΜΟΛΥΒΔΗ → gasoline
            ΠΕΤΡΕΛΑΙΟ / DIESEL / ΠΕΤΡ. → diesel
            ΥΓΡΑΕΡΙΟ / LPG / AUTOGAS → lpg
            ΥΒΡΙΔΙΚΟ / HYBRID → hybrid
            ΗΛΕΚΤΡΙΚΟ / ELECTRIC → electric
  (R)   = ΧΡΩΜΑ = colour — return EXACTLY as printed in Greek (e.g. ΛΕΥΚΟ, ΜΑΥΡΟ, ΑΣΗΜΙ, ΓΚΡΙ, ΚΟΚΚΙΝΟ, ΜΠΛΕ)

═══ PAGE: ΟΝΟΜΑΣΤΙΚΑ ΣΤΟΙΧΕΙΑ (Personal Data) ═══
  (C.1.1) = ΕΠΩΝΥΜΟ = holder's SURNAME (family name)
  (C.1.2) = ΜΙΚΡΟ ΟΝΟΜΑ = holder's FIRST NAME(S)
  Combine as "Firstname Lastname" (C.1.2 space C.1.1)

Return ONLY a valid JSON object — no markdown, no explanation, no extra text (use null for any field not clearly visible):`;

const JSON_TEMPLATE = `
{
  "plate": "value from (Α) ΑΡΙΘΜΟΣ ΚΥΚΛΟΦΟΡΙΑΣ on cover — uppercase, letters and digits only",
  "vin": "exactly 17 characters from field (E) — verified character by character",
  "brand": "manufacturer from D.1 — capitalize properly (e.g. Toyota, BMW, Volkswagen)",
  "model": "commercial name from D.3",
  "year": first_registration_year_4_digit_integer_from_field_4_or_B,
  "engine": engine_displacement_cc_integer_from_P1,
  "fuel": "one of exactly: gasoline, diesel, lpg, hybrid, electric",
  "color": "colour in Greek exactly as printed in field R",
  "type": "one of exactly: car, moto, boat, truck",
  "ownerName": "Firstname Lastname — C.1.2 then C.1.1",
  "mileage": null
}`;

const ODO_SUFFIX = `\n\nAn additional odometer/instrument-cluster photo is also included as the LAST image. Read the current mileage (km) shown on the odometer and set "mileage" to that integer. If unreadable keep "mileage" as null.`;

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

  const prompt = REG_PROMPT + JSON_TEMPLATE + (odoUrl ? ODO_SUFFIX : '');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              ...imageBlocks,
              { type: 'text', text: prompt },
            ],
          },
          // Prefill forces clean JSON output — no markdown, no preamble
          {
            role: 'assistant',
            content: '{',
          },
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message || 'Anthropic error' });

    // Prepend the prefilled '{' back
    const txt = '{' + (data?.content?.[0]?.text || '');
    const m = txt.match(/\{[\s\S]*?\}/);
    if (!m) return res.status(500).json({ error: 'Could not parse AI response' });

    const result = JSON.parse(m[0]);

    // --- Normalize & validate ---

    // Plate: uppercase, keep Greek/Latin letters and digits
    if (result.plate) {
      result.plate = result.plate
        .toUpperCase()
        .replace(/[^A-ZΑ-ΩΆΈΉΊΌΎΏ0-9]/g, '')
        .trim();
    }

    // VIN: uppercase, strip spaces, must be 17 chars
    if (result.vin) {
      result.vin = result.vin.toUpperCase().replace(/\s/g, '');
      if (result.vin.length !== 17) result.vin = result.vin.length > 17
        ? result.vin.slice(0, 17)
        : result.vin; // keep partial rather than null
    }

    // Year: must be a 4-digit integer between 1960 and now
    if (result.year) {
      const y = parseInt(result.year, 10);
      result.year = (y >= 1960 && y <= new Date().getFullYear() + 1) ? y : null;
    }

    // Engine: positive integer
    if (result.engine) {
      const cc = parseInt(result.engine, 10);
      result.engine = (cc > 0 && cc < 20000) ? cc : null;
    }

    // Fuel: must be one of the allowed values
    const FUELS = ['gasoline', 'diesel', 'lpg', 'hybrid', 'electric'];
    if (result.fuel && !FUELS.includes(result.fuel)) result.fuel = null;

    // Type: must be one of the allowed values
    const TYPES = ['car', 'moto', 'boat', 'truck'];
    if (result.type && !TYPES.includes(result.type)) result.type = 'car';

    return res.status(200).json(result);
  } catch (e) {
    console.error('AI scan error:', e);
    return res.status(500).json({ error: e.message || 'AI scan failed' });
  }
};
