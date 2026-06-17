import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

const PublicLeadSchema = z.object({
  name: z.string(),
  phone: z.string(),
  phones: z.array(z.string()).optional(),
  email: z.string().optional(),
  industry: z.string(),
  profile: z.string(),
  source: z.string(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
});

export type FindPublicLeadsInput = {
  category?: string;
  location?: string;
  leadType?: 'individual' | 'business';
  language?: 'el' | 'en';
};

export type PublicLead = z.infer<typeof PublicLeadSchema>;
export type FindPublicLeadsOutput = { leads: PublicLead[]; summary: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanPhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '').replace(/^(00)?30/, '+30');
}

function isValidPhone(p: string): boolean {
  const digits = p.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

// Overpass requires application/x-www-form-urlencoded with spaces as '+' not '%20'
function overpassEncode(query: string): string {
  return 'data=' + encodeURIComponent(query).replace(/%20/g, '+');
}

// ─── City bounding boxes [south, west, north, east] ──────────────────────────

const CITY_BBOX: Record<string, [number, number, number, number]> = {
  'αθήνα':           [37.87, 23.60, 38.12, 23.86],
  'αθηνα':           [37.87, 23.60, 38.12, 23.86],
  'athens':          [37.87, 23.60, 38.12, 23.86],
  'κολωνάκι':        [37.97, 23.73, 38.00, 23.78],
  'γλυφάδα':         [37.85, 23.72, 37.92, 23.80],
  'κηφισιά':         [38.04, 23.78, 38.12, 23.88],
  'μαρούσι':         [38.04, 23.78, 38.08, 23.84],
  'χαλάνδρι':        [37.99, 23.78, 38.04, 23.85],
  'βόρεια προάστια': [38.02, 23.70, 38.15, 24.05],
  'νότια προάστια':  [37.85, 23.65, 37.95, 23.78],
  'πειραιάς':        [37.91, 23.60, 37.99, 23.69],
  'piraeus':         [37.91, 23.60, 37.99, 23.69],
  'θεσσαλονίκη':     [40.49, 22.82, 40.74, 23.08],
  'thessaloniki':    [40.49, 22.82, 40.74, 23.08],
  'πάτρα':           [38.20, 21.68, 38.28, 21.78],
  'ηράκλειο':        [35.29, 25.08, 35.36, 25.16],
  'λάρισα':          [39.61, 22.38, 39.69, 22.48],
  'βόλος':           [39.34, 22.92, 39.40, 22.98],
  'ιωάννινα':        [39.65, 20.83, 39.70, 20.90],
  'χανιά':           [35.50, 23.99, 35.55, 24.05],
  'ρόδος':           [36.42, 28.20, 36.47, 28.25],
  'καλαμάτα':        [37.02, 22.10, 37.07, 22.14],
};

function getCityBbox(location: string): string | null {
  const lower = location.toLowerCase().trim();
  for (const [key, [s, w, n, e]] of Object.entries(CITY_BBOX)) {
    if (lower.includes(key) || key.includes(lower)) return `${s},${w},${n},${e}`;
  }
  return null;
}

// ─── Category → OSM tags + name keyword ──────────────────────────────────────

const OSM_MAP: Array<[string[], string[], string]> = [
  [['γιατρ', 'ιατρ', 'doctor', 'medic', 'clinic', 'κλινικ'],
   ['amenity=doctors', 'amenity=clinic', 'healthcare=doctor', 'healthcare=centre'], 'ιατρ'],
  [['οδοντ', 'dentist'],
   ['amenity=dentist'], 'οδοντ'],
  [['δικηγ', 'lawyer', 'νομικ', 'legal'],
   ['office=lawyer', 'office=notary'], 'δικηγ'],
  [['λογιστ', 'account', 'φοροτεχν'],
   ['office=accountant', 'office=tax_advisor'], 'λογιστ'],
  [['αρχιτ', 'architect'],
   ['office=architect'], 'αρχιτεκτ'],
  [['μηχαν', 'engineer'],
   ['office=engineer'], 'μηχαν'],
  [['φαρμακ', 'pharmac'],
   ['amenity=pharmacy'], 'φαρμακ'],
  [['ξενοδ', 'hotel'],
   ['tourism=hotel'], 'ξενοδ'],
  [['εστιατ', 'restaurant', 'ταβερν'],
   ['amenity=restaurant'], 'εστιατ'],
  [['τράπεζ', 'bank'],
   ['amenity=bank'], 'τραπεζ'],
  [['ασφαλ', 'insuran'],
   ['office=insurance'], 'ασφαλ'],
  [['κτηματ', 'real estate', 'ακίνητ'],
   ['office=estate_agent'], 'κτηματ'],
];

function getCategoryInfo(category: string): { tags: string[]; nameKeyword: string } {
  const lower = category.toLowerCase();
  for (const [keywords, tags, nameKeyword] of OSM_MAP) {
    if (keywords.some(k => lower.includes(k))) return { tags, nameKeyword };
  }
  return {
    tags: ['office=lawyer', 'office=accountant', 'office=architect', 'office=engineer',
      'office=company', 'amenity=doctors', 'amenity=dentist', 'amenity=clinic', 'office=insurance'],
    nameKeyword: lower.slice(0, 6),
  };
}

// ─── Source 1: OpenStreetMap Overpass (tag-based + name-based) ────────────────
// CRITICAL: Overpass requires spaces encoded as '+' not '%20' in the body

async function searchOverpass(category: string, location: string): Promise<PublicLead[]> {
  const { tags, nameKeyword } = getCategoryInfo(category);
  const bbox = getCityBbox(location);
  const areaFallback = `area["name"~"${location}",i]->.search;`;

  const makeConditions = (locExpr: string) =>
    tags.map(t => {
      const [k, v] = t.split('=');
      return `node["${k}"="${v}"]["name"](${locExpr});\n  way["${k}"="${v}"]["name"](${locExpr});`;
    }).join('\n  ');

  // Query 1: tag-based search
  const q1 = bbox
    ? `[out:json][timeout:15];\n(\n  ${makeConditions(bbox)}\n);\nout center 500;`
    : `[out:json][timeout:15];\n${areaFallback}\n(\n  ${makeConditions('area.search')}\n);\nout center 500;`;

  // Query 2: name keyword search (catches businesses missing category tags)
  const q2 = bbox
    ? `[out:json][timeout:10];\n(node["name"~"${nameKeyword}"]["phone"](${bbox});way["name"~"${nameKeyword}"]["phone"](${bbox}););\nout center 200;`
    : `[out:json][timeout:10];\n${areaFallback}\n(node["name"~"${nameKeyword}"]["phone"](area.search););\nout center 200;`;

  const fetchOverpass = async (query: string) => {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'curl/8.18.0', 'Accept': '*/*' },
      body: overpassEncode(query),
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { elements?: any[] };
    const leads: PublicLead[] = [];
    for (const el of data.elements ?? []) {
      const t = el.tags ?? {};
      const name: string = t.name || t['name:el'] || '';
      const rawPhone = t.phone || t['contact:phone'] || t['phone:mobile'] || t['contact:mobile'] || t.telephone || '';
      if (!name || !rawPhone) continue;
      const phone = cleanPhone(rawPhone);
      if (!isValidPhone(phone)) continue;
      leads.push({
        name, phone,
        email: t.email || t['contact:email'] || undefined,
        industry: t.amenity || t.office || t.healthcare || t.shop || category,
        profile: t.description?.slice(0, 80) || t['name:en'] || t.amenity || t.office || category,
        source: 'OpenStreetMap',
      });
    }
    return leads;
  };

  try {
    const [r1, r2] = await Promise.allSettled([fetchOverpass(q1), fetchOverpass(q2)]);
    return [...(r1.status === 'fulfilled' ? r1.value : []), ...(r2.status === 'fulfilled' ? r2.value : [])];
  } catch {
    return [];
  }
}

// ─── Source 2: Google Places API (New) ───────────────────────────────────────
// Requires GOOGLE_PLACES_API_KEY env variable in Vercel.
// Enable "Places API (New)" at console.cloud.google.com for your Firebase project.

async function searchGooglePlaces(category: string, location: string): Promise<PublicLead[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) { console.error('[Google Places] No API key'); return []; }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.internationalPhoneNumber,places.nationalPhoneNumber,places.primaryTypeDisplayName,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount',
      },
      body: JSON.stringify({
        textQuery: `${category} ${location} Ελλάδα`,
        languageCode: 'el',
        regionCode: 'GR',
        maxResultCount: 20,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Google Places] HTTP ${res.status}:`, err.slice(0, 300));
      return [];
    }
    const data = await res.json();
    console.log(`[Google Places] found ${data.places?.length ?? 0} results`);

    return (data.places ?? [])
      .filter((p: any) => p.internationalPhoneNumber || p.nationalPhoneNumber)
      .map((p: any) => ({
        name: p.displayName?.text ?? '',
        phone: cleanPhone(p.internationalPhoneNumber || p.nationalPhoneNumber),
        email: undefined,
        industry: p.primaryTypeDisplayName?.text ?? category,
        profile: p.primaryTypeDisplayName?.text ?? category,
        source: 'Google Maps',
        rating: typeof p.rating === 'number' ? p.rating : undefined,
        reviewCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : undefined,
      }))
      .filter((l: PublicLead) => isValidPhone(l.phone));
  } catch (e) {
    console.error('[Google Places] Exception:', e);
    return [];
  }
}

// ─── Source 3: Χρυσός Οδηγός (xo.gr) via ScraperAPI — pages 1 + 2 in parallel ─
// Requires SCRAPERAPI_KEY env variable. Free: 1,000 calls/month at scraperapi.com

function parseXOPage(html: string, category: string): PublicLead[] {
  const leads: PublicLead[] = [];
  const seen = new Set<string>();

  const add = (name: string, phone: string, email?: string, extraPhones?: string[]) => {
    if (!name || name.length < 2 || leads.length >= 100) return;
    const cleaned = cleanPhone(phone);
    if (!isValidPhone(cleaned)) return;
    const key = cleaned.replace(/\D/g, '').slice(-10);
    if (seen.has(key)) return;
    seen.add(key);
    const allCleaned = [cleaned];
    if (extraPhones) {
      for (const ep of extraPhones) {
        const ec = cleanPhone(ep); if (!isValidPhone(ec)) continue;
        const ek = ec.replace(/\D/g, '').slice(-10);
        if (!seen.has(ek)) { seen.add(ek); allCleaned.push(ec); }
      }
    }
    leads.push({ name: name.trim(), phone: allCleaned[0], phones: allCleaned.length > 1 ? allCleaned : undefined, email: email || undefined, industry: category, profile: category, source: 'Χρυσός Οδηγός' });
  };

  // Strategy 0: __NEXT_DATA__, JSON-LD recursive, application/json (same as other parsers)
  for (const l of extractFromEmbeddedJson(html, category, 'Χρυσός Οδηγός', 100)) {
    add(l.name, l.phone, l.email, l.phones?.slice(1));
  }
  if (leads.length >= 100) return leads;

  // Strategy 1: XO.gr-specific regex — telephone as JSON array ["mobile","landline"]
  const arrPattern = /"name":\s*"([^"]+)",\s*"url":\s*"https:\/\/www\.xo\.gr[^"]*",\s*"email":\s*"([^"]*)",\s*"telephone":\s*(\[[^\]]*\])/g;
  let m: RegExpExecArray | null;
  while ((m = arrPattern.exec(html)) !== null) {
    let rawPhones: string[] = [];
    try {
      const arr = JSON.parse(m[3]);
      if (Array.isArray(arr)) rawPhones = arr.map(String).filter(Boolean);
    } catch {
      rawPhones = [m[3].replace(/[\[\]"]/g, '').trim()];
    }
    const cleanedPhones = rawPhones.map(cleanPhone).filter(isValidPhone);
    if (cleanedPhones.length === 0) continue;
    add(m[1].trim(), cleanedPhones[0], m[2] || undefined, cleanedPhones.slice(1));
    if (leads.length >= 100) break;
  }
  if (leads.length >= 100) return leads;

  // Strategy 2: XO.gr-specific regex — telephone as string (single phone)
  const strPattern = /"name":\s*"([^"]+)",\s*"url":\s*"https:\/\/www\.xo\.gr[^"]*",\s*"email":\s*"([^"]*)",\s*"telephone":\s*"([^"]+)"/g;
  while ((m = strPattern.exec(html)) !== null) {
    add(m[1].trim(), m[3], m[2] || undefined);
    if (leads.length >= 100) break;
  }
  if (leads.length >= 100) return leads;

  // Strategy 3: Last-resort raw phone extraction — find any Greek number near a "name" JSON key.
  // Handles cases where __NEXT_DATA__ uses field names our walker doesn't recognise.
  const rawPhoneRe = /\b(?:(?:\+30|0030)?(?:2\d{9}|69\d{8}))\b/g;
  const rawNameRe = /"(?:name|title|businessName|companyName|legalName)"\s*:\s*"([^"]{2,100})"/g;
  const namePositions: Array<{ name: string; idx: number }> = [];
  let nm: RegExpExecArray | null;
  while ((nm = rawNameRe.exec(html)) !== null) namePositions.push({ name: nm[1], idx: nm.index });

  let pm: RegExpExecArray | null;
  while ((pm = rawPhoneRe.exec(html)) !== null) {
    if (leads.length >= 100) break;
    const phoneIdx = pm.index;
    // Find the nearest name that precedes this phone (within 2000 chars)
    let bestName = '';
    for (let i = namePositions.length - 1; i >= 0; i--) {
      if (namePositions[i].idx <= phoneIdx && phoneIdx - namePositions[i].idx <= 2000) {
        bestName = namePositions[i].name;
        break;
      }
    }
    if (bestName) add(bestName, pm[0]);
  }

  return leads;
}

async function searchXO(category: string, location: string): Promise<PublicLead[]> {
  // XO.gr uses Cloudflare Enterprise (aggressive bot fingerprinting).
  // ScraperAPI — even with premium residential proxies — returns 403 because
  // Cloudflare identifies ScraperAPI's headless-browser TLS/JA3 fingerprint.
  //
  // Fix: ZenRows antibot=true uses real-browser TLS fingerprints + residential IPs,
  // specifically designed for Cloudflare v3 bypass (5 credits/call).
  // Fallback: ScraperAPI premium+render in case ZenRows is not configured.
  //
  // To enable: add ZENROWS_API_KEY to Vercel environment variables.
  // Sign up free at zenrows.com (1,000 free credits = 50 XO.gr searches).

  const zenrowsKey = process.env.ZENROWS_API_KEY;
  const scraperKey  = process.env.SCRAPERAPI_KEY;
  if (!zenrowsKey && !scraperKey) return [];

  const xoUrl = (page: number) =>
    `https://www.xo.gr/search/?what=${encodeURIComponent(category)}&where=${encodeURIComponent(location)}${page > 1 ? `&page=${page}` : ''}`;

  const fetchPage = async (page: number): Promise<string> => {
    // ── Strategy 1: ZenRows antibot (Cloudflare v3 bypass, 5 credits/call) ──
    if (zenrowsKey) {
      try {
        const res = await fetch(
          `https://api.zenrows.com/v1/?apikey=${zenrowsKey}&url=${encodeURIComponent(xoUrl(page))}&js_render=true&antibot=true`,
          { signal: AbortSignal.timeout(50000) }
        );
        const text = res.ok ? await res.text() : '';
        const hasData = text.includes('__NEXT_DATA__') || text.includes('ld+json') || text.includes('"telephone"');
        console.log(`[XO] p${page} zenrows: status=${res.status} len=${text.length} hasData=${hasData}`);
        if (res.ok && hasData) return text;
        if (res.status === 402) console.warn('[XO] ZenRows credits exhausted — top up at zenrows.com');
      } catch (e: any) { console.log(`[XO] p${page} zenrows err: ${e?.message}`); }
    }

    // ── Strategy 2: ScraperAPI premium+render (fallback) ──────────────────
    if (scraperKey) {
      try {
        const res = await fetch(
          `http://api.scraperapi.com/?api_key=${scraperKey}&url=${encodeURIComponent(xoUrl(page))}&country_code=gr&render=true&premium=true`,
          { signal: AbortSignal.timeout(45000) }
        );
        const text = res.ok ? await res.text() : '';
        const hasData = text.includes('__NEXT_DATA__') || text.includes('ld+json') || text.includes('"telephone"');
        console.log(`[XO] p${page} scraper: status=${res.status} len=${text.length} hasData=${hasData}`);
        if (res.ok && hasData) return text;
      } catch (e: any) { console.log(`[XO] p${page} scraper err: ${e?.message}`); }
    }

    return '';
  };

  try {
    const pages = await Promise.allSettled([1, 2, 3, 4].map(fetchPage));
    const results = pages.flatMap(r => r.status === 'fulfilled' ? parseXOPage(r.value, category) : []);
    console.log(`[XO] total: ${results.length}`);
    return results;
  } catch {
    return [];
  }
}

// ─── Universal embedded-JSON extractor ───────────────────────────────────────
// Recursively walks JSON found in the page (__NEXT_DATA__, JSON-LD) and extracts
// any object that has both a name and a telephone/phone field.
// Works on Next.js apps, React SPAs, and any modern JS-rendered directory.

function extractFromEmbeddedJson(html: string, category: string, sourceName: string, maxLeads = 100): PublicLead[] {
  const leads: PublicLead[] = [];
  const seen = new Set<string>();

  const tryAdd = (name: string, phone: string, email?: string, extraPhones?: string[]) => {
    if (!name || name.length < 2 || name.length > 120 || leads.length >= maxLeads) return;
    const cleaned = cleanPhone(phone);
    if (!isValidPhone(cleaned)) return;
    const key = cleaned.replace(/\D/g, '').slice(-10);
    if (seen.has(key)) return;
    seen.add(key);
    const allCleaned = [cleaned];
    if (extraPhones) {
      for (const ep of extraPhones) {
        const ec = cleanPhone(ep);
        if (!isValidPhone(ec)) continue;
        const ek = ec.replace(/\D/g, '').slice(-10);
        if (!seen.has(ek)) { seen.add(ek); allCleaned.push(ec); }
      }
    }
    leads.push({ name: name.trim(), phone: cleaned, phones: allCleaned.length > 1 ? allCleaned : undefined, email: email || undefined, industry: category, profile: category, source: sourceName });
  };

  function walk(node: any, depth = 0): void {
    if (!node || typeof node !== 'object' || depth > 12 || leads.length >= maxLeads) return;
    if (Array.isArray(node)) { for (const item of node) walk(item, depth + 1); return; }
    const name = String(node.name || node.businessName || node.companyName || node.legalName || node.title || '');
    const telRaw = node.telephone || node.telephones || node.phone || node.phones ||
      node.phoneNumber || node.phoneNumbers || node.tel || node.contactPhone || node.mobile;
    const allRawPhones: string[] = Array.isArray(telRaw) ? telRaw.map(String).filter(Boolean) : (telRaw ? [String(telRaw)] : []);
    if (name.length > 2 && name.length < 120 && allRawPhones.length > 0 && /\d{4,}/.test(allRawPhones[0])) {
      tryAdd(name, allRawPhones[0], String(node.email || node.emailAddress || '') || undefined, allRawPhones.slice(1));
    }
    for (const val of Object.values(node)) {
      if (val && typeof val === 'object') walk(val as object, depth + 1);
    }
  }

  // 1. Next.js __NEXT_DATA__ — all server-side props are embedded here
  const nextMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextMatch) { try { walk(JSON.parse(nextMatch[1])); } catch {} }

  // 2. JSON-LD structured data
  for (const [, raw] of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(raw)); } catch {}
  }

  // 3. application/json script tags (some SPAs use this to embed state)
  for (const [, raw] of html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(raw)); } catch {}
  }

  return leads;
}

// ─── Generic multi-strategy HTML parser (JSON-LD + microdata + tel:) ──────────
// Works across sites that follow common web standards.

function parseGenericDirectory(html: string, category: string, sourceName: string, maxLeads = 100): PublicLead[] {
  const seen = new Set<string>();
  const leads: PublicLead[] = [];

  const add = (name: string, phone: string, email?: string, extraPhones?: string[]) => {
    if (!name || name.length < 2 || leads.length >= maxLeads) return;
    const cleaned = cleanPhone(phone);
    if (!isValidPhone(cleaned)) return;
    const key = cleaned.replace(/\D/g, '').slice(-10);
    if (seen.has(key)) return;
    seen.add(key);
    const allCleaned = [cleaned];
    if (extraPhones) {
      for (const ep of extraPhones) {
        const ec = cleanPhone(ep); if (!isValidPhone(ec)) continue;
        const ek = ec.replace(/\D/g, '').slice(-10);
        if (!seen.has(ek)) { seen.add(ek); allCleaned.push(ec); }
      }
    }
    leads.push({ name: name.trim(), phone: cleaned, phones: allCleaned.length > 1 ? allCleaned : undefined, email: email || undefined, industry: category, profile: category, source: sourceName });
  };

  // Strategy 0: Universal embedded-JSON (__NEXT_DATA__, JSON-LD recursive, application/json)
  for (const l of extractFromEmbeddedJson(html, category, sourceName, maxLeads)) add(l.name, l.phone, l.email, l.phones?.slice(1));
  if (leads.length >= maxLeads) return leads;

  // Strategy 1: JSON-LD
  for (const [, raw] of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const objs = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [JSON.parse(raw)];
      for (const obj of objs) {
        const items = obj['@graph'] ? obj['@graph'] : [obj];
        for (const item of items) {
          const name = String(item.name || item.legalName || '').replace(/\\u([\dA-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
          const telRaw = item.telephone || item.phone;
          const allPhones = Array.isArray(telRaw) ? telRaw.map(String).filter(Boolean) : (telRaw ? [String(telRaw)] : []);
          if (name && allPhones.length > 0) add(name, allPhones[0], item.email || undefined, allPhones.slice(1));
        }
      }
    } catch {}
  }

  // Strategy 2: Schema.org microdata (itemprop blocks)
  const blocks = html.split(/itemprop\s*=\s*["']name["']/i);
  for (const block of blocks.slice(1)) {
    const nameM = block.match(/(?:content|>)\s*["']?([^<"']{2,80})["']?\s*(?:<|$)/);
    const phoneM = block.match(/itemprop\s*=\s*["']telephone["'][^>]*(?:content\s*=\s*["']([^"']+)["']|>([^<]{4,20}))/i);
    const emailM = block.match(/itemprop\s*=\s*["']email["'][^>]*(?:content\s*=\s*["']([^"']+)["']|>([^<]+))/i);
    if (nameM && phoneM) {
      const phone = (phoneM[1] || phoneM[2] || '').trim();
      const email = (emailM?.[1] || emailM?.[2] || '').trim();
      add(nameM[1].replace(/<[^>]+>/g, '').trim(), phone, email || undefined);
    }
  }

  // Strategy 3: tel: links — find name from nearest heading/strong before the link
  for (const [, phone] of html.matchAll(/href="tel:(\+?[\d\s\-().]{6,20})"/g)) {
    const idx = html.indexOf(`tel:${phone}`);
    if (idx < 0) continue;
    const surrounding = html.slice(Math.max(0, idx - 800), idx);
    const headingM = [...surrounding.matchAll(/<(?:h[1-6]|strong|b|a)[^>]*>([^<]{2,80})<\/(?:h[1-6]|strong|b|a)>/g)];
    if (headingM.length > 0) {
      const name = headingM[headingM.length - 1][1].replace(/<[^>]+>/g, '').trim();
      add(name, phone);
    }
  }

  return leads;
}

// ─── Source 3b: Vrisko.gr via ScraperAPI — pages 1 + 2 in parallel ────────────
// URL: vrisko.gr/search/CATEGORY/LOCATION?page=N — plain HTML with microdata.

function parseVriskoPage(html: string, category: string): PublicLead[] {
  const seen = new Set<string>();
  const leads: PublicLead[] = [];

  const add = (name: string, phone: string, email?: string, extraPhones?: string[]) => {
    if (!name || name.length < 2 || leads.length >= 100) return;
    const cleaned = cleanPhone(phone);
    if (!isValidPhone(cleaned)) return;
    const key = cleaned.replace(/\D/g, '').slice(-10);
    if (seen.has(key)) return;
    seen.add(key);
    const allCleaned = [cleaned];
    if (extraPhones) {
      for (const ep of extraPhones) {
        const ec = cleanPhone(ep); if (!isValidPhone(ec)) continue;
        const ek = ec.replace(/\D/g, '').slice(-10);
        if (!seen.has(ek)) { seen.add(ek); allCleaned.push(ec); }
      }
    }
    leads.push({ name: name.trim(), phone: cleaned, phones: allCleaned.length > 1 ? allCleaned : undefined, email: email || undefined, industry: category, profile: category, source: 'Vrisko' });
  };

  // Strategy 0: Universal embedded-JSON (__NEXT_DATA__, JSON-LD recursive, application/json)
  for (const l of extractFromEmbeddedJson(html, category, 'Vrisko', 100)) add(l.name, l.phone, l.email, l.phones?.slice(1));
  if (leads.length >= 100) return leads;

  // Strategy 1: JSON-LD (preferred — works even if HTML structure changes)
  for (const [, raw] of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed]);
      for (const item of items) {
        const name = String(item.name || item.legalName || '').replace(/\\u([\dA-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
        const telRaw = item.telephone || item.phone;
        const allPhones = Array.isArray(telRaw) ? telRaw.map(String).filter(Boolean) : (telRaw ? [String(telRaw)] : []);
        if (name && allPhones.length > 0) add(name, allPhones[0], item.email || undefined, allPhones.slice(1));
      }
    } catch {}
  }

  if (leads.length >= 100) return leads;

  // Strategy 2: itemprop="name" blocks (current vrisko.gr microdata)
  const blocks = html.split(/itemprop\s*=\s*["']name["']/i);
  for (const block of blocks.slice(1)) {
    // Name: either content="..." attr or text content of the element
    const nameM = block.match(/(?:content\s*=\s*["']([^"']{2,80})["']|>\s*([^<]{2,80}?)\s*<\/)/);
    if (!nameM) continue;
    const name = (nameM[1] || nameM[2] || '').replace(/<[^>]+>/g, '').trim();
    if (!name || name.length < 2) continue;

    // Phone: search in the next 1000 chars after the name block
    const chunk = block.slice(0, 1200);
    const phoneM = chunk.match(/itemprop\s*=\s*["']telephone["'][^>]*(?:content\s*=\s*["']([^"']{4,20})["']|>([^<]{4,20})<)/i);
    if (!phoneM) continue;
    const phone = (phoneM[1] || phoneM[2] || '').trim();

    const emailM = chunk.match(/itemprop\s*=\s*["']email["'][^>]*(?:content\s*=\s*["']([^"']+)["']|>([^<]+)<)/i);
    const email = (emailM?.[1] || emailM?.[2] || '').trim();
    add(name, phone, email || undefined);
  }

  if (leads.length >= 100) return leads;

  // Strategy 3: tel: links with nearby heading/strong (universal fallback)
  for (const [, phone] of html.matchAll(/href="tel:(\+?[\d\s\-().]{6,20})"/g)) {
    const idx = html.indexOf(`tel:${phone}`);
    if (idx < 0) continue;
    const surrounding = html.slice(Math.max(0, idx - 1000), idx);
    const headings = [...surrounding.matchAll(/<(?:h[1-6]|strong|b|a)[^>]*>([^<]{2,80})<\/(?:h[1-6]|strong|b|a)>/g)];
    if (headings.length > 0) {
      const name = headings[headings.length - 1][1].replace(/<[^>]+>/g, '').trim();
      add(name, phone);
    }
  }

  return leads;
}

async function searchVrisko(category: string, location: string): Promise<PublicLead[]> {
  const scraperKey = process.env.SCRAPERAPI_KEY;
  if (!scraperKey) return [];

  const makeUrl = (page: number) => {
    const base = `https://www.vrisko.gr/search/${encodeURIComponent(category)}/${encodeURIComponent(location)}${page > 1 ? `?page=${page}` : ''}`;
    return `http://api.scraperapi.com/?api_key=${scraperKey}&url=${encodeURIComponent(base)}&country_code=gr&render=true`;
  };

  try {
    const pages = await Promise.allSettled(
      [1, 2, 3, 4, 5, 6, 7, 8].map(p =>
        fetch(makeUrl(p), { signal: AbortSignal.timeout(40000) }).then(r => r.ok ? r.text() : '').catch(() => '')
      )
    );
    return pages.flatMap(r => r.status === 'fulfilled' ? parseVriskoPage(r.value, category) : []);
  } catch {
    return [];
  }
}

// ─── Source 3c: 11888.gr — dedicated parser + scraper ────────────────────────

function parse11888Page(html: string, category: string): PublicLead[] {
  const seen = new Set<string>();
  const leads: PublicLead[] = [];

  const add = (name: string, phone: string, email?: string, extraPhones?: string[]) => {
    if (!name || name.length < 2 || leads.length >= 100) return;
    const cleaned = cleanPhone(phone);
    if (!isValidPhone(cleaned)) return;
    const key = cleaned.replace(/\D/g, '').slice(-10);
    if (seen.has(key)) return;
    seen.add(key);
    const allCleaned = [cleaned];
    if (extraPhones) {
      for (const ep of extraPhones) {
        const ec = cleanPhone(ep); if (!isValidPhone(ec)) continue;
        const ek = ec.replace(/\D/g, '').slice(-10);
        if (!seen.has(ek)) { seen.add(ek); allCleaned.push(ec); }
      }
    }
    leads.push({ name: name.trim(), phone: cleaned, phones: allCleaned.length > 1 ? allCleaned : undefined, email: email || undefined, industry: category, profile: category, source: '11888' });
  };

  // Strategy 0: __NEXT_DATA__, JSON-LD recursive, application/json
  for (const l of extractFromEmbeddedJson(html, category, '11888', 100)) add(l.name, l.phone, l.email, l.phones?.slice(1));
  if (leads.length >= 100) return leads;

  // Strategy 1: JSON-LD
  for (const [, raw] of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const obj = JSON.parse(raw);
      const items = Array.isArray(obj) ? obj : (obj['@graph'] ? obj['@graph'] : [obj]);
      for (const item of items) {
        const name = String(item.name || item.legalName || '').replace(/\\u([\dA-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
        const telRaw = item.telephone || item.phone;
        const allPhones = Array.isArray(telRaw) ? telRaw.map(String).filter(Boolean) : (telRaw ? [String(telRaw)] : []);
        if (name && allPhones.length > 0) add(name, allPhones[0], item.email || undefined, allPhones.slice(1));
      }
    } catch {}
  }
  if (leads.length >= 100) return leads;

  // Strategy 2: itemprop microdata blocks
  const blocks = html.split(/itemprop\s*=\s*["']name["']/i);
  for (const block of blocks.slice(1)) {
    const nameM = block.match(/(?:content\s*=\s*["']([^"']{2,80})["']|>\s*([^<]{2,80}?)\s*<\/)/);
    if (!nameM) continue;
    const name = (nameM[1] || nameM[2] || '').replace(/<[^>]+>/g, '').trim();
    if (!name || name.length < 2) continue;
    const chunk = block.slice(0, 1200);
    const phoneM = chunk.match(/itemprop\s*=\s*["']telephone["'][^>]*(?:content\s*=\s*["']([^"']{4,20})["']|>([^<]{4,20})<)/i);
    if (!phoneM) continue;
    const phone = (phoneM[1] || phoneM[2] || '').trim();
    const emailM = chunk.match(/itemprop\s*=\s*["']email["'][^>]*(?:content\s*=\s*["']([^"']+)["']|>([^<]+)<)/i);
    add(name, phone, (emailM?.[1] || emailM?.[2] || '').trim() || undefined);
  }
  if (leads.length >= 100) return leads;

  // Strategy 3: tel: links
  for (const [, phone] of html.matchAll(/href="tel:(\+?[\d\s\-().]{6,20})"/g)) {
    const idx = html.indexOf(`tel:${phone}`);
    if (idx < 0) continue;
    const surrounding = html.slice(Math.max(0, idx - 800), idx);
    const headings = [...surrounding.matchAll(/<(?:h[1-6]|strong|b|a)[^>]*>([^<]{2,80})<\/(?:h[1-6]|strong|b|a)>/g)];
    if (headings.length > 0) add(headings[headings.length - 1][1].replace(/<[^>]+>/g, '').trim(), phone);
  }

  return leads;
}

async function search11888(category: string, location: string): Promise<PublicLead[]> {
  const scraperKey = process.env.SCRAPERAPI_KEY;
  if (!scraperKey) return [];

  const cat = encodeURIComponent(category);
  const loc = encodeURIComponent(location);
  const makeUrl = (p: number) =>
    `http://api.scraperapi.com/?api_key=${scraperKey}&url=${encodeURIComponent(`https://www.11888.gr/search/?q=${cat}&where=${loc}${p > 1 ? `&page=${p}` : ''}`)}&country_code=gr&render=true`;

  try {
    const pages = await Promise.allSettled(
      [1, 2, 3, 4, 5, 6, 7, 8].map(p =>
        fetch(makeUrl(p), { signal: AbortSignal.timeout(40000) }).then(r => r.ok ? r.text() : '').catch(() => '')
      )
    );
    return pages.flatMap(r => r.status === 'fulfilled' ? parse11888Page(r.value, category) : []);
  } catch {
    return [];
  }
}

// ─── Generic ScraperAPI fetcher ───────────────────────────────────────────────
// Fetches up to `pages` pages for a given URL template and parses with the generic parser.

async function searchGenericSite(
  scraperKey: string,
  makePageUrl: (page: number) => string,
  category: string,
  sourceName: string,
  pages = 2,
  renderJs = false,
): Promise<PublicLead[]> {
  const renderParam = renderJs ? '&render=true' : '';
  const timeout = renderJs ? 35000 : 25000;
  const fetches = Array.from({ length: pages }, (_, i) =>
    fetch(
      `http://api.scraperapi.com/?api_key=${scraperKey}&url=${encodeURIComponent(makePageUrl(i + 1))}&country_code=gr${renderParam}`,
      { signal: AbortSignal.timeout(timeout) }
    ).then(r => r.ok ? r.text() : '').catch(() => '')
  );
  const results = await Promise.allSettled(fetches);
  const leads: PublicLead[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      leads.push(...parseGenericDirectory(r.value, category, sourceName));
    }
  }
  return leads;
}

// ─── Additional Greek directory scrapers (all use ScraperAPI + generic parser) ─

async function searchGreekDirectories(category: string, location: string): Promise<PublicLead[]> {
  const scraperKey = process.env.SCRAPERAPI_KEY;
  if (!scraperKey) return [];

  const cat = encodeURIComponent(category);
  const loc = encodeURIComponent(location);

  const sites: Array<{ name: string; makeUrl: (p: number) => string }> = [
    // ── High-value Greek directories (known to exist & serve phone data) ──────
    {
      name: 'E-Yellow',
      makeUrl: (p) => `https://www.e-yellow.gr/search?find_desc=${cat}&find_loc=${loc}${p > 1 ? `&page=${p}` : ''}`,
    },
    {
      name: 'Telephone.gr',
      makeUrl: (p) => `https://www.telephone.gr/search?q=${cat}&where=${loc}${p > 1 ? `&page=${p}` : ''}`,
    },
    {
      name: 'Europages GR',
      makeUrl: (p) => `https://www.europages.gr/companies/${loc}/${cat}${p > 1 ? `?page=${p}` : ''}`,
    },
    {
      name: 'Infobel GR',
      makeUrl: (p) => `https://www.infobel.com/el/greece/search?who=${cat}&where=${loc}${p > 1 ? `&page=${p}` : ''}`,
    },
    {
      name: 'Pages.gr',
      makeUrl: (p) => `https://www.pages.gr/search?q=${cat}&location=${loc}${p > 1 ? `&page=${p}` : ''}`,
    },
    {
      name: 'Cylex GR',
      makeUrl: (p) => `https://www.cylex.gr/search?q=${cat}&where=${loc}${p > 1 ? `&page=${p}` : ''}`,
    },
    {
      name: 'Kompass GR',
      makeUrl: (p) => `https://el.kompass.com/searchCompany?text=${cat}&country=GR&city=${loc}${p > 1 ? `&page=${p}` : ''}`,
    },
    {
      name: 'Vresta',
      makeUrl: (p) => `https://www.vresta.gr/search/${cat}/${loc}${p > 1 ? `?page=${p}` : ''}`,
    },
    {
      name: 'Vres',
      makeUrl: (p) => `https://www.vres.gr/search/${cat}/${loc}${p > 1 ? `?page=${p}` : ''}`,
    },
    {
      name: 'TopGuide',
      makeUrl: (p) => `https://www.topguide.gr/search/${cat}/${loc}${p > 1 ? `?page=${p}` : ''}`,
    },
    {
      name: 'E-Odigos',
      makeUrl: (p) => `https://www.e-odigos.gr/search?q=${cat}&where=${loc}${p > 1 ? `&page=${p}` : ''}`,
    },
    {
      name: 'GoAthina',
      makeUrl: (p) => `https://www.goathina.gr/search?q=${cat}${p > 1 ? `&page=${p}` : ''}`,
    },
    {
      name: 'Panelinios',
      makeUrl: (p) => `https://www.panelinios.gr/search?q=${cat}&where=${loc}${p > 1 ? `&page=${p}` : ''}`,
    },
    {
      name: 'GreekCatalog',
      makeUrl: (p) => `https://www.greekcatalog.net/search?q=${cat}&location=${loc}${p > 1 ? `&page=${p}` : ''}`,
    },
    {
      name: 'AnyBusiness',
      makeUrl: (p) => `https://www.anybusiness.gr/search?query=${cat}&location=${loc}${p > 1 ? `&page=${p}` : ''}`,
    },
    {
      name: 'BusinessList',
      makeUrl: (p) => `https://www.businesslist.gr/el/search?q=${cat}&where=${loc}${p > 1 ? `&page=${p}` : ''}`,
    },
    {
      name: 'Looking4',
      makeUrl: (p) => `https://www.looking4.gr/search?q=${cat}&where=${loc}${p > 1 ? `&page=${p}` : ''}`,
    },
    {
      name: 'MyCiti',
      makeUrl: (p) => `https://www.myciti.gr/search?q=${cat}&city=${loc}${p > 1 ? `&page=${p}` : ''}`,
    },
  ];

  // Vresta loads listings via JS — needs render=true (11888 has its own dedicated function)
  const JS_RENDER_SITES = new Set(['Vresta']);

  // Run all in parallel — silently skip any that return 0 results
  const allResults = await Promise.allSettled(
    sites.map(s => searchGenericSite(scraperKey, s.makeUrl, category, s.name, 3, JS_RENDER_SITES.has(s.name)))
  );

  const leads: PublicLead[] = [];
  for (const r of allResults) {
    if (r.status === 'fulfilled') leads.push(...r.value);
  }
  return leads;
}

// ─── Source 5: HERE Places API (free 1,000 calls/day) ────────────────────────
// Requires HERE_API_KEY env variable. Register free at developer.here.com

async function searchHERE(category: string, location: string): Promise<PublicLead[]> {
  const apiKey = process.env.HERE_API_KEY;
  if (!apiKey) return [];

  const bbox = getCityBbox(location);
  const [lat, lon] = bbox
    ? [((+bbox.split(',')[0] + +bbox.split(',')[2]) / 2).toFixed(4), ((+bbox.split(',')[1] + +bbox.split(',')[3]) / 2).toFixed(4)]
    : ['37.9755', '23.7348'];

  try {
    const res = await fetch(
      `https://discover.search.hereapi.com/v1/discover?at=${lat},${lon}&q=${encodeURIComponent(category)}&limit=100&lang=el&apiKey=${apiKey}`,
      { signal: AbortSignal.timeout(7000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.items ?? [])
      .filter((p: any) => p.contacts?.[0]?.phone?.[0]?.value)
      .map((p: any) => ({
        name: p.title ?? '',
        phone: cleanPhone(p.contacts[0].phone[0].value),
        email: p.contacts?.[0]?.email?.[0]?.value || undefined,
        industry: p.categories?.[0]?.name ?? category,
        profile: p.categories?.[0]?.name ?? category,
        source: 'HERE Maps',
      }))
      .filter((l: PublicLead) => isValidPhone(l.phone));
  } catch {
    return [];
  }
}

// ─── Source 6: Yelp Fusion API (free 500 calls/day) ──────────────────────────
// Requires YELP_API_KEY env variable. Register free at yelp.com/developers

async function searchYelp(category: string, location: string): Promise<PublicLead[]> {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(category)}&location=${encodeURIComponent(location + ',Greece')}&limit=20&locale=el_GR`,
      {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(7000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.businesses ?? [])
      .filter((b: any) => b.phone)
      .map((b: any) => ({
        name: b.name ?? '',
        phone: cleanPhone(b.phone),
        email: undefined,
        industry: b.categories?.[0]?.title ?? category,
        profile: b.categories?.[0]?.title ?? category,
        source: 'Yelp',
        rating: typeof b.rating === 'number' ? b.rating : undefined,
        reviewCount: typeof b.review_count === 'number' ? b.review_count : undefined,
      }))
      .filter((l: PublicLead) => isValidPhone(l.phone));
  } catch {
    return [];
  }
}

// ─── Source 4b: Geoapify Places API (free 3,000 req/day, OSM-backed) ─────────
// Requires GEOAPIFY_API_KEY. Free at geoapify.com — returns contact.phone field.

const GEOAPIFY_CATS: Record<string, string> = {
  'γιατρ': 'healthcare', 'ιατρ': 'healthcare', 'κλινικ': 'healthcare',
  'οδοντ': 'healthcare', 'φαρμακ': 'healthcare',
  'δικηγ': 'office', 'νομικ': 'office',
  'λογιστ': 'office', 'φοροτεχν': 'office',
  'αρχιτ': 'office', 'μηχαν': 'office',
  'ξενοδ': 'accommodation.hotel',
  'εστιατ': 'catering.restaurant', 'ταβερν': 'catering.restaurant',
  'ασφαλ': 'service.financial', 'κτηματ': 'commercial.real_estate',
  'τράπεζ': 'finance.bank', 'τραπεζ': 'finance.bank',
};

function getGeoapifyCat(cat: string): string {
  const l = cat.toLowerCase();
  for (const [k, v] of Object.entries(GEOAPIFY_CATS)) if (l.includes(k)) return v;
  return 'commercial,office,healthcare';
}

async function searchGeoapify(category: string, location: string): Promise<PublicLead[]> {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) return [];

  const bbox = getCityBbox(location);
  const cats = getGeoapifyCat(category);

  // Geoapify rect format: lon_min,lat_min,lon_max,lat_max (west,south,east,north)
  let filter: string;
  if (bbox) {
    const [s, w, n, e] = bbox.split(',').map(Number);
    filter = `rect:${w},${s},${e},${n}`;
  } else {
    filter = 'rect:23.60,37.87,23.86,38.12';
  }

  try {
    const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(cats)}&filter=${encodeURIComponent(filter)}&limit=500&lang=el&apiKey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.features ?? [])
      .filter((f: any) => f.properties?.contact?.phone)
      .map((f: any) => {
        const p = f.properties;
        const rawPhone = String(p.contact?.phone ?? '');
        const phone = cleanPhone(rawPhone.startsWith('+') ? rawPhone : `+30${rawPhone}`);
        return {
          name: p.name ?? '',
          phone,
          email: p.contact?.email || undefined,
          industry: p.categories?.[0] ?? category,
          profile: p.categories?.[0] ?? category,
          source: 'Geoapify',
        };
      })
      .filter((l: PublicLead) => l.name && isValidPhone(l.phone));
  } catch {
    return [];
  }
}

// ─── Greek → English category mapping for TomTom (requires ASCII in URL) ─────
const TOMTOM_EN: Record<string, string> = {
  'γιατρ': 'doctor', 'ιατρ': 'doctor', 'κλινικ': 'clinic',
  'οδοντ': 'dentist', 'δικηγ': 'lawyer', 'νομικ': 'lawyer',
  'λογιστ': 'accountant', 'φοροτεχν': 'accountant',
  'αρχιτ': 'architect', 'μηχαν': 'engineer',
  'φαρμακ': 'pharmacy', 'ξενοδ': 'hotel',
  'εστιατ': 'restaurant', 'ταβερν': 'restaurant',
  'ασφαλ': 'insurance', 'κτηματ': 'real estate',
};
function toEnCategory(cat: string): string {
  const l = cat.toLowerCase();
  for (const [k, v] of Object.entries(TOMTOM_EN)) if (l.includes(k)) return v;
  return cat;
}

// ─── Source 7: TomTom Places Search (free 2,500 calls/day) ───────────────────
// Requires TOMTOM_API_KEY env variable. Register free at developer.tomtom.com

async function searchTomTom(category: string, location: string): Promise<PublicLead[]> {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) return [];

  const bbox = getCityBbox(location);
  const [lat, lon] = bbox
    ? [((+bbox.split(',')[0] + +bbox.split(',')[2]) / 2).toFixed(4), ((+bbox.split(',')[1] + +bbox.split(',')[3]) / 2).toFixed(4)]
    : ['37.9755', '23.7348'];
  const enCat = toEnCategory(category);

  try {
    const res = await fetch(
      `https://api.tomtom.com/search/2/poiSearch/${encodeURIComponent(enCat)}.json?key=${apiKey}&countrySet=GR&lat=${lat}&lon=${lon}&radius=30000&limit=100&language=el-GR`,
      { signal: AbortSignal.timeout(7000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results ?? [])
      .filter((r: any) => r.poi?.phone)
      .map((r: any) => ({
        name: r.poi.name ?? '',
        phone: cleanPhone(r.poi.phone),
        email: r.poi.url || undefined,
        industry: r.poi.categories?.[0] ?? category,
        profile: r.poi.classifications?.[0]?.names?.[0]?.name ?? category,
        source: 'TomTom',
      }))
      .filter((l: PublicLead) => isValidPhone(l.phone));
  } catch {
    return [];
  }
}

// ─── Source 8: Wikidata SPARQL (free, no key, Greek orgs with phone P1329) ─────
// Uses the Wikidata public SPARQL endpoint — no registration, no rate-limit key.
// Returns verified Greek organizations/businesses that Wikidata editors have tagged.

async function searchWikidata(category: string): Promise<PublicLead[]> {
  const sparql = `
    SELECT DISTINCT ?name ?phone ?email WHERE {
      ?item wdt:P17 wd:Q41 .
      ?item wdt:P1329 ?phone .
      ?item rdfs:label ?name .
      FILTER(LANG(?name) = "el" || LANG(?name) = "en")
      OPTIONAL { ?item wdt:P968 ?email }
    }
    LIMIT 60
  `.trim();

  try {
    const res = await fetch(
      `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`,
      {
        headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'DNServicesCRM/1.0' },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const leads: PublicLead[] = [];
    const seen = new Set<string>();
    for (const row of data.results?.bindings ?? []) {
      const name = row.name?.value ?? '';
      const phone = cleanPhone(row.phone?.value ?? '');
      const email = row.email?.value || undefined;
      if (!name || !isValidPhone(phone)) continue;
      const key = phone.replace(/\D/g, '').slice(-10);
      if (seen.has(key)) continue;
      seen.add(key);
      leads.push({ name, phone, email, industry: category || 'Οργανισμός', profile: 'Wikidata', source: 'Wikidata' });
    }
    return leads;
  } catch {
    return [];
  }
}

// ─── Source 8b: Nominatim extratags (OSM, free, no key, phone from OSM nodes) ──
// Complements Overpass: Nominatim returns phone from extratags for named POIs.
// Uses free nominatim.openstreetmap.org — no registration required.

async function searchNominatim(category: string, location: string): Promise<PublicLead[]> {
  const { nameKeyword } = getCategoryInfo(category);
  const q = `${nameKeyword} ${location}`;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=gr&format=jsonv2&extratags=1&limit=50&accept-language=el`,
      {
        headers: { 'User-Agent': 'DNServicesCRM/1.0 (contact@dnservices.gr)' },
        signal: AbortSignal.timeout(9000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const leads: PublicLead[] = [];
    const seen = new Set<string>();
    for (const item of data ?? []) {
      const extra = item.extratags ?? {};
      const rawPhone = extra.phone || extra['contact:phone'] || extra['contact:mobile'] || '';
      if (!rawPhone) continue;
      const phone = cleanPhone(rawPhone);
      if (!isValidPhone(phone)) continue;
      const key = phone.replace(/\D/g, '').slice(-10);
      if (seen.has(key)) continue;
      seen.add(key);
      const name = item.name || item.display_name?.split(',')[0] || '';
      if (!name) continue;
      leads.push({
        name,
        phone,
        email: extra.email || extra['contact:email'] || undefined,
        industry: extra.amenity || extra.office || extra.shop || category,
        profile: category,
        source: 'OSM Nominatim',
      });
    }
    return leads;
  } catch {
    return [];
  }
}

// ─── Source 8c: 4ty.gr — phones visible in HTML, custom parser ────────────────

function parse4tyPage(html: string, category: string): PublicLead[] {
  const leads: PublicLead[] = [];
  const seen = new Set<string>();

  // 4ty.gr injects JSON-LD and also lists phone in itemprop/data-phone
  for (const [, raw] of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const obj = JSON.parse(raw);
      const items = Array.isArray(obj) ? obj : [obj];
      for (const item of items) {
        const name = String(item.name || '');
        const telRaw = item.telephone || item.phone;
        const rawPhones = Array.isArray(telRaw) ? telRaw.map(String).filter(Boolean) : (telRaw ? [String(telRaw)] : []);
        const cleanedPhones = rawPhones.map(cleanPhone).filter(isValidPhone);
        if (!name || cleanedPhones.length === 0) continue;
        const key = cleanedPhones[0].replace(/\D/g, '').slice(-10);
        if (seen.has(key)) continue;
        cleanedPhones.forEach(p => seen.add(p.replace(/\D/g, '').slice(-10)));
        leads.push({ name, phone: cleanedPhones[0], phones: cleanedPhones.length > 1 ? cleanedPhones : undefined, email: item.email || undefined, industry: category, profile: category, source: '4ty' });
      }
    } catch {}
  }

  // Fallback: data-phone attribute pattern used by 4ty listings
  for (const [, phone] of html.matchAll(/data-phone="(\+?[\d\s\-()]{6,20})"/g)) {
    const cleaned = cleanPhone(phone);
    if (!isValidPhone(cleaned)) continue;
    const key = cleaned.replace(/\D/g, '').slice(-10);
    if (seen.has(key)) continue;
    seen.add(key);
    const nameM = html.slice(Math.max(0, html.indexOf(`data-phone="${phone}"`) - 600), html.indexOf(`data-phone="${phone}"`))
      .match(/<(?:h[1-6]|strong)[^>]*>([^<]{2,80})<\/(?:h[1-6]|strong)>/g);
    const name = nameM ? nameM[nameM.length - 1].replace(/<[^>]+>/g, '').trim() : '';
    if (!name) continue;
    leads.push({ name, phone: cleaned, email: undefined, industry: category, profile: category, source: '4ty' });
  }

  return leads.slice(0, 100);
}

async function search4ty(category: string, location: string): Promise<PublicLead[]> {
  const scraperKey = process.env.SCRAPERAPI_KEY;
  if (!scraperKey) return [];

  const makeUrl = (p: number) => {
    const base = `https://www.4ty.gr/search?q=${encodeURIComponent(category)}&city=${encodeURIComponent(location)}${p > 1 ? `&page=${p}` : ''}`;
    return `http://api.scraperapi.com/?api_key=${scraperKey}&url=${encodeURIComponent(base)}&country_code=gr`;
  };

  try {
    const pages = await Promise.allSettled(
      [1, 2, 3, 4, 5, 6, 7, 8].map(p =>
        fetch(makeUrl(p), { signal: AbortSignal.timeout(25000) }).then(r => r.ok ? r.text() : '').catch(() => '')
      )
    );
    return pages.flatMap(r => r.status === 'fulfilled' ? parse4tyPage(r.value, category) : []);
  } catch {
    return [];
  }
}

// ─── Source 8d: F-All.gr — 16,337 companies, generic parser ──────────────────

async function searchFAll(category: string, location: string): Promise<PublicLead[]> {
  const scraperKey = process.env.SCRAPERAPI_KEY;
  if (!scraperKey) return [];

  const makeUrl = (p: number) => {
    const base = `https://www.f-all.gr/search?q=${encodeURIComponent(category)}&where=${encodeURIComponent(location)}${p > 1 ? `&page=${p}` : ''}`;
    return `http://api.scraperapi.com/?api_key=${scraperKey}&url=${encodeURIComponent(base)}&country_code=gr`;
  };

  try {
    const pages = await Promise.allSettled(
      [1, 2, 3, 4, 5, 6, 7, 8].map(p =>
        fetch(makeUrl(p), { signal: AbortSignal.timeout(25000) }).then(r => r.ok ? r.text() : '').catch(() => '')
      )
    );
    return pages.flatMap(r => r.status === 'fulfilled' ? parseGenericDirectory(r.value, category, 'F-All') : []);
  } catch {
    return [];
  }
}

// ─── Source: DoctorAnytime.gr (Greek medical professionals directory) ──────────
// Location-filtered search pages expose doctor name + real phone via JSON-LD
// schema ("@type":"Physician"). No scraper proxy needed — plain SSR HTML.

// Slugs verified against doctoranytime.gr/s — site has exactly 11 specialties
const DOCTORANYTIME_CATS: Array<{ slug: string; label: string; keywords: string[] }> = [
  { slug: 'Pathologos',              label: 'Παθολόγοι',        keywords: ['γιατρ', 'ιατρ', 'παθολ', 'doctor', 'medic'] },
  { slug: 'Genikos-iatros',          label: 'Γενικοί Ιατροί',   keywords: ['γενικ ιατρ', 'γενικ'] },
  { slug: 'Odontiatros',             label: 'Οδοντίατροι',       keywords: ['οδοντ', 'dentist'] },
  { slug: 'Dermatologos',            label: 'Δερματολόγοι',      keywords: ['δερματολ', 'dermatol'] },
  { slug: 'Gynaikologos-Maieftiras', label: 'Γυναικολόγοι',      keywords: ['γυναικολ', 'gynecol'] },
  { slug: 'Kardiologos',             label: 'Καρδιολόγοι',       keywords: ['καρδιολ', 'cardiol'] },
  { slug: 'ORL',                     label: 'ΩΡΛ',               keywords: ['ωρλ', 'orl', 'ωτορινολαρυγ', 'ent'] },
  { slug: 'Ofthalmiatros',           label: 'Οφθαλμολόγοι',      keywords: ['οφθαλμ', 'ophthalm'] },
  { slug: 'Ourologos',               label: 'Ουρολόγοι',         keywords: ['ουρολ', 'urolog'] },
  { slug: 'Endokrinologos',          label: 'Ενδοκρινολόγοι',    keywords: ['ενδοκρινολ', 'endocrinol'] },
  { slug: 'Psychologos',             label: 'Ψυχολόγοι',         keywords: ['ψυχολ', 'psycholog', 'ψυχιατρ', 'psychiatr'] },
];

const DOCTORANYTIME_LOC: Record<string, string> = {
  'αθηνα': 'Athens', 'θεσσαλονικη': 'Thessaloniki', 'πατρα': 'Patra',
  'ηρακλειο': 'Irakleio', 'λαρισα': 'Larisa', 'βολος': 'Volos',
  'ιωαννινα': 'Ioannina', 'χανια': 'Hania', 'ροδος': 'Rodos',
  'καλαματα': 'Kalamata', 'πειραιας': 'Piraeus', 'γλυφαδα': 'Glifada',
  'κηφισια': 'Kifisia', 'μαρουσι': 'Marousi', 'χαλανδρι': 'Halandri',
  'κολωνακι': 'Kolonaki', 'νεα σμυρνη': 'Nea-Smyrni', 'παγκρατι': 'Pagkrati',
  'αμπελοκηποι': 'Ampelokoipi', 'πατησια': 'Patisia', 'περιστερι': 'Peristeri',
  'ηλιουπολη': 'Ilioupoli', 'καλλιθεα': 'Kallithea', 'ψυχικο': 'Psychiko',
  'νεο ψυχικο': 'Neo-Psychiko', 'βυρωνας': 'Vyronas', 'ζωγραφου': 'Zografou',
  'αγια παρασκευη': 'Agia-Paraskevi', 'παλληνη': 'Pallini',
};

async function searchDoctorAnytime(category: string, location?: string): Promise<PublicLead[]> {
  const qn = normalizeForFilter(category);
  const cat = DOCTORANYTIME_CATS.find(c =>
    c.keywords.some(k => qn.includes(normalizeForFilter(k)))
  );
  if (!cat) return [];

  const locN = location ? normalizeForFilter(location) : null;
  const locSlug = locN ? (DOCTORANYTIME_LOC[locN] ?? location!.trim().replace(/\s+/g, '-')) : null;
  const searchUrl = locSlug
    ? `https://www.doctoranytime.gr/s/${cat.slug}/location/${encodeURIComponent(locSlug)}`
    : `https://www.doctoranytime.gr/s/${cat.slug}`;

  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  try {
    const listRes = await fetch(searchUrl, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(12000) });
    if (!listRes.ok) return [];
    const listHtml = await listRes.text();

    const profileHrefs = [...new Set(
      [...listHtml.matchAll(/href="(\/d\/[^"#]+)"/g)].map(m => m[1])
    )].slice(0, 12);
    if (profileHrefs.length === 0) return [];

    const profilePages = await Promise.allSettled(
      profileHrefs.map(href =>
        fetch(`https://www.doctoranytime.gr${href}`, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(10000) })
          .then(r => r.ok ? r.text() : '').catch(() => '')
      )
    );

    const leads: PublicLead[] = [];
    for (const result of profilePages) {
      if (result.status !== 'fulfilled' || !result.value) continue;
      const html = result.value;
      const idx = html.indexOf('"@type":"Physician"');
      if (idx === -1) continue;
      // name is within ~200 chars of @type; telephone comes after description (can be 3000+ chars)
      const nameChunk = html.slice(idx, idx + 300);
      const afterPhysician = html.slice(idx);
      const nameM = nameChunk.match(/"name":"([^"]{3,80})"/);
      const phoneM = afterPhysician.match(/"telephone":"([^"]+)"/);
      if (!nameM || !phoneM) continue;
      const phone = cleanPhone(phoneM[1]);
      if (!isValidPhone(phone)) continue;
      if (phone.replace(/\D/g, '').endsWith('2155050005')) continue; // doctoranytime booking
      leads.push({ name: nameM[1], phone, industry: cat.label, profile: `${cat.label} - DoctorAnytime`, source: 'DoctorAnytime' });
      if (leads.length >= 12) break;
    }
    console.log(`[DoctorAnytime] ${leads.length} leads for ${cat.slug}/${locSlug ?? 'all'}`);
    return leads;
  } catch { return []; }
}

// ─── Source 8: Foursquare Places API v3 (free 50 calls/day, 105M+ venues) ─────
// Requires FOURSQUARE_API_KEY. Register free at foursquare.com/products/places-api
// Independent dataset from all other sources.

async function searchFoursquare(category: string, location: string): Promise<PublicLead[]> {
  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) return [];

  const bbox = getCityBbox(location);
  const [lat, lon] = bbox
    ? [((+bbox.split(',')[0] + +bbox.split(',')[2]) / 2).toFixed(4), ((+bbox.split(',')[1] + +bbox.split(',')[3]) / 2).toFixed(4)]
    : ['37.9755', '23.7348'];

  try {
    const res = await fetch(
      `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(category)}&ll=${lat},${lon}&radius=20000&limit=50&fields=name,tel,email,categories,location,rating,stats`,
      {
        headers: { Authorization: apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results ?? [])
      .filter((p: any) => p.tel)
      .map((p: any) => ({
        name: p.name ?? '',
        phone: cleanPhone(p.tel),
        email: p.email || undefined,
        industry: p.categories?.[0]?.name ?? category,
        profile: p.categories?.[0]?.name ?? category,
        source: 'Foursquare',
        // Foursquare uses 0–10 scale; convert to 0–5 for consistency with other sources
        rating: typeof p.rating === 'number' ? Math.round(p.rating / 2 * 10) / 10 : undefined,
        reviewCount: typeof p.stats?.totalRatings === 'number' ? p.stats.totalRatings : undefined,
      }))
      .filter((l: PublicLead) => isValidPhone(l.phone));
  } catch {
    return [];
  }
}

// ─── Source 9: Azure Maps POI Search (free 125k transactions/day) ──────────────
// Requires AZURE_MAPS_KEY. Register free at portal.azure.com (Azure Maps account).
// Completely independent mapping database from HERE/TomTom/Google.

async function searchAzureMaps(category: string, location: string): Promise<PublicLead[]> {
  const apiKey = process.env.AZURE_MAPS_KEY;
  if (!apiKey) return [];

  const bbox = getCityBbox(location);
  const [lat, lon] = bbox
    ? [((+bbox.split(',')[0] + +bbox.split(',')[2]) / 2).toFixed(4), ((+bbox.split(',')[1] + +bbox.split(',')[3]) / 2).toFixed(4)]
    : ['37.9755', '23.7348'];

  try {
    const res = await fetch(
      `https://atlas.microsoft.com/search/poi/json?api-version=1.0&subscription-key=${apiKey}&query=${encodeURIComponent(category)}&lat=${lat}&lon=${lon}&radius=30000&limit=100&countrySet=GR&language=el-GR`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results ?? [])
      .filter((r: any) => r.poi?.phone)
      .map((r: any) => ({
        name: r.poi.name ?? '',
        phone: cleanPhone(r.poi.phone),
        email: r.poi.url || undefined,
        industry: r.poi.categories?.[0] ?? category,
        profile: r.poi.classifications?.[0]?.names?.[0]?.name ?? category,
        source: 'Azure Maps',
      }))
      .filter((l: PublicLead) => isValidPhone(l.phone));
  } catch {
    return [];
  }
}

// ─── Source 10: Mapbox Search Box API (Foursquare-fused, 600 req/month free) ───
// Requires MAPBOX_TOKEN. Register free at mapbox.com — fuses 160+ data sources.
// Different fusion layer from standalone Foursquare — returns additional venues.

async function searchMapbox(category: string, location: string): Promise<PublicLead[]> {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return [];

  const bbox = getCityBbox(location);
  const proximity = bbox
    ? `${((+bbox.split(',')[1] + +bbox.split(',')[3]) / 2).toFixed(4)},${((+bbox.split(',')[0] + +bbox.split(',')[2]) / 2).toFixed(4)}`
    : '23.7348,37.9755';

  try {
    const res = await fetch(
      `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(`${category} ${location}`)}&country=gr&types=poi&limit=25&proximity=${proximity}&access_token=${token}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    const leads: PublicLead[] = [];
    for (const f of data.features ?? []) {
      const p = f.properties ?? {};
      const phone = p.metadata?.phone || p.phone || '';
      if (!phone) continue;
      const cleaned = cleanPhone(phone);
      if (!isValidPhone(cleaned)) continue;
      leads.push({
        name: p.name ?? '',
        phone: cleaned,
        email: p.metadata?.website || undefined,
        industry: p.poi_category?.[0] ?? category,
        profile: p.poi_category?.[0] ?? category,
        source: 'Mapbox',
      });
    }
    return leads;
  } catch {
    return [];
  }
}

// ─── Source 11: Radar.io Places API (free 1M calls/month) ─────────────────────
// Requires RADAR_KEY. Free at radar.com — independent geocoding + POI dataset.

async function searchRadar(category: string, location: string): Promise<PublicLead[]> {
  const apiKey = process.env.RADAR_KEY;
  if (!apiKey) return [];

  const bbox = getCityBbox(location);
  const [lat, lon] = bbox
    ? [((+bbox.split(',')[0] + +bbox.split(',')[2]) / 2).toFixed(4), ((+bbox.split(',')[1] + +bbox.split(',')[3]) / 2).toFixed(4)]
    : ['37.9755', '23.7348'];

  try {
    const res = await fetch(
      `https://api.radar.io/v1/search/places?near=${lat},${lon}&query=${encodeURIComponent(category)}&limit=100&country=GR`,
      {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.places ?? [])
      .filter((p: any) => p.phone)
      .map((p: any) => ({
        name: p.name ?? '',
        phone: cleanPhone(p.phone),
        email: undefined,
        industry: p.categories?.[0] ?? category,
        profile: p.categories?.[0] ?? category,
        source: 'Radar',
      }))
      .filter((l: PublicLead) => isValidPhone(l.phone));
  } catch {
    return [];
  }
}

// ─── Filter out non-targeted generic/institutional results ────────────────────

// Strip Greek (and all) accent marks then lowercase — makes matching accent-insensitive.
// e.g. "Κέντρο" → "κεντρο", "ΚΕΠ Αθήνα" → "κεπ αθηνα"
function normalizeForFilter(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTIONAL / PUBLIC-SECTOR BLOCK LIST
// Applied to EVERY lead from EVERY source, unconditionally.
// When adding new sources, do NOT bypass this filter.
// Add patterns here in normalizeForFilter form (accent-free, lowercase).
// ─────────────────────────────────────────────────────────────────────────────
const GENERIC_SKIP: string[] = [
  // ── Public citizen-service centres (ΚΕΠ) ─────────────────────────────────
  'κεπ', 'κ.ε.π', 'κεντρο εξυπηρετησης', 'εξυπηρετηση πολιτων',
  // ── Schools / public education ────────────────────────────────────────────
  'πανεπιστημ', 'πολυτεχν', 'ανωτατη σχολ', 'ατει', 'τεχνολογικο ιδρυμα',
  'δημοτικο σχολ', 'γυμνασι', 'λυκει', 'σχολειο',
  'school', 'university', 'college', 'institute of technology',
  // ── Hospitals / public healthcare ─────────────────────────────────────────
  'νοσοκομει', 'κλινικη γεν', 'γενικο νοσ', 'γενικο κρατ',
  'εκαβ', 'εοδυ', 'κεελπνο', 'εοπυυ', 'οπεκεπε', 'εσυ ',
  'hospital', 'general hospital',
  // ── Senior citizen centres (ΚΑΠΗ) ─────────────────────────────────────────
  'καπη', 'κ.α.π.η', 'κεντρο ανοιχτης περιθαλψης',
  // ── Central / local government ────────────────────────────────────────────
  'δημος ', 'δημαρχ', 'υπουργει', 'υπουργιο', 'περιφερει', 'κοινοτητ', 'αποκεντρωμ',
  'νομαρχι', 'γενικη γραμματει', 'δημοσια υπηρεσι', 'δημοσιο ταμει',
  'κεδε', 'κεντρικη ενωση δημων', 'δημοτικη επιχειρ', 'αυτοδιοικηση',
  'κοινωνικη αλληλεγγυη', 'κοινωνικ υπηρεσι', 'κεντρο κοινοτητ',
  'προεδρικ μεγαρ', 'βουλη των ελληνων',
  // ── Embassies / consulates / diplomatic missions ───────────────────────────
  'πρεσβει', 'προξενει', 'διπλωματικ', 'πρεσβευτ', 'πρεσβεια',
  'embassy', 'consulate', 'ambassad', 'diplomatic mission', 'high commission',
  // ── Courts / justice system ───────────────────────────────────────────────
  'δικαστηρι', 'πρωτοδικει', 'εφετει', 'ειρηνοδικει', 'αρεοπαγ', 'εισαγγελι',
  'νομικο συμβουλιο κρατους', 'νσκ',
  'court', 'courthouse', 'tribunal',
  // ── Police / security / fire / coast guard ────────────────────────────────
  'αστυνομικ', 'αστυνομια', 'τροχαια', 'πυροσβεστ', 'λιμενικ',
  'ελληνικη αστυνομι', 'ελληνικος στρατ', 'λιμενικο σωμα', 'σωμα πυροσβεστων',
  'police station', 'police department', 'fire station', 'coast guard',
  // ── Military ──────────────────────────────────────────────────────────────
  'στρατοπεδ', 'στρατιωτικ', 'αεροπορικ βαση', 'πολεμικ', 'nato', 'νατο',
  // ── State telecom / utilities ─────────────────────────────────────────────
  'cosmote', 'vodafone', 'forthnet',
  'δεη ', 'ευδαπ', 'εψα', 'κτελ', 'ελτα', 'τραινοσε', 'hellenic train',
  ' οτε ', 'wind hellas', 'nova ',
  // ── Tax / social security / employment ───────────────────────────────────
  'εφορι', 'δ.ο.υ', ' δου ', 'ιρλ ', ' ικα ', 'εφκα', 'οαεδ', 'δυπα', 'ααδε',
  'σεπε ', 'ελεγκτικο συνεδρι',
  'tax office', 'customs office', 'social insurance', 'social security office',
  'employment office', 'labor inspectorate',
  // ── Transport infrastructure ──────────────────────────────────────────────
  'αεροδρομ', 'λιμαν', 'τελωνει', 'κεντρικος σταθμ', 'σταθμος υπεραστ',
  'αττικο μετρο', 'μετρο α.ε', 'τραμ α.ε', 'οασα', 'εθελ', 'ησαπ',
  // ── Museums / cultural / archaeological ───────────────────────────────────
  'μουσει', 'αρχαιολογ', 'βυζαντιν', 'πινακοθηκ', 'ακροπολ', 'μνημει',
  'museum', 'archaeological site',
  // ── Religious institutions ────────────────────────────────────────────────
  'ιερα μητροπολ', 'ιερος ναος', 'ιερα μονη', 'μητροπολιτικ',
  // ── Airlines / large shipping lines ──────────────────────────────────────
  'aegean airlines', 'olympic air', 'sky express', 'ryanair', 'easyjet', 'wizzair', 'transavia',
  'ακτοπλοι', 'blue star', 'hellenic seaways', 'superfast', 'seajets', 'anek lines',
  // ── Large supermarket chains ──────────────────────────────────────────────
  'αβ βασιλοπουλ', 'σκλαβενιτ', 'lidl', 'aldi', 'μαρινοπουλ', 'my market',
  // ── Large banks ───────────────────────────────────────────────────────────
  'τραπεζα πειραιωσ', 'εθνικη τραπεζα', 'alpha bank', 'eurobank', 'attica bank',
  'τραπεζα αττικ', 'τραπεζα της ελλαδοσ', 'τραπεζα ελλαδοσ',
  // ── Other large state entities ────────────────────────────────────────────
  'ελληνικα ταχυδρομει', 'ελπε', 'δεπα', 'δητε', 'ελληνικα πετρελαι',
  'εθνικη λυρικη', 'εθνικη βιβλιοθηκ', 'εθνικο μετσοβιο',
  // ── English equivalents (from API sources) ────────────────────────────────
  'city hall', 'town hall', 'municipal office', 'government office',
  'prefecture office', 'public service', 'citizen service',
  'public administration', 'state agency', 'national authority',
].map(normalizeForFilter);

// Checks name AND profile fields — must pass for every lead from every source.
function isTargetedLead(lead: PublicLead): boolean {
  const haystack = normalizeForFilter(
    `${lead.name} ${lead.profile ?? ''} ${lead.industry ?? ''}`
  );
  return !GENERIC_SKIP.some(p => haystack.includes(p));
}

// Sources that filter by category server-side — trust their results
const TRUSTED_SOURCES = new Set([
  'Google Maps', 'HERE Maps', 'TomTom', 'Geoapify',
  'Foursquare', 'Azure Maps', 'Mapbox', 'Radar',
  'DoctorAnytime',
]);

// Build category-relevant keywords from the user query
function buildCategoryKeywords(category: string): string[] {
  if (!category) return [];
  const lower = category.toLowerCase();
  const words = lower.split(/[\s,/()]+/).filter(w => w.length > 2);
  const extra: string[] = [];
  for (const [kws, , nk] of OSM_MAP) {
    if (kws.some(k => lower.includes(k))) {
      extra.push(...kws.filter(k => k.length > 2), nk);
    }
  }
  return [...new Set([...words, ...extra])];
}

// For unstructured sources: require at least one category keyword in name/industry/profile
function passesCategoryFilter(lead: PublicLead, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  if (TRUSTED_SOURCES.has(lead.source)) return true;
  const haystack = (lead.name + ' ' + lead.industry + ' ' + lead.profile).toLowerCase();
  return keywords.some(kw => kw.length > 2 && haystack.includes(kw));
}

// ─── Personal name filter (individual leadType) ───────────────────────────────
// Rejects names that look like business/institution names.
// Requires at least 2 words (first name + last name).

const BUSINESS_INDICATORS = [
  // Greek legal entity forms
  ' αε', ' α.ε', 'αεβε', 'αεεδ', ' επε', ' ε.π.ε', ' ικε', ' ι.κ.ε',
  ' οε', ' ο.ε', ' εε', ' ε.ε',
  'ανώνυμ', 'μονοπρόσωπ', 'ετερόρρυθμ',
  // International legal forms
  ' ltd', ' llc', ' inc', ' s.a', ' corp', ' plc', ' gmbh', ' bv',
  // Greek business type words
  'ιατρεί',       // ιατρείο (NOT ιατρός)
  'κλινικ',       // κλινική
  'νοσοκομ',      // νοσοκομείο
  'φαρμακεί',     // φαρμακείο (NOT φαρμακοποιός)
  'οδοντιατρεί',  // οδοντιατρείο
  'εταιρεί',      // εταιρεία
  'κέντρ',        // κέντρο (υγείας, επιχειρηματικό κλπ)
  'γραφεί',       // γραφείο
  'ξενοδοχεί',    // ξενοδοχείο
  'εστιατόρ',     // εστιατόριο
  'ταβέρν',       // ταβέρνα
  'καφετερί',     // καφετέρια
  'σύνδεσμ',      // σύνδεσμος
  'σωματεί',      // σωματείο
  'ιδρυμ',        // ίδρυμα
  'οργανισμ',     // οργανισμός
  'ταμεί',        // ταμείο
  'ασφαλιστ',     // ασφαλιστής / ασφαλιστικό
  'κτηματ',       // κτηματομεσίτης / κτηματαγορά
  'αδελφ',        // αδελφοί (= brothers = business)
  // English business words
  'center', 'centre', 'clinic', 'hospital', 'hotel', 'resort',
  'group', 'studio', 'solutions', 'services', 'systems', 'agency',
  'management', 'consulting', 'associates',
];

function looksLikePersonalName(name: string): boolean {
  const n = name.trim();
  if (n.length < 5 || n.length > 55) return false;
  const lower = n.toLowerCase();
  if (BUSINESS_INDICATORS.some(p => lower.includes(p))) return false;
  // Need at least 2 words (first + last name)
  const words = n.split(/\s+/).filter(w => w.length >= 2);
  if (words.length < 2 || words.length > 5) return false;
  return true;
}

// Greek mobile numbers: 69xxxxxxxx (with or without +30 prefix)
function isMobilePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  // matches: 6912345678 / 306912345678 / 00306912345678
  return /^(00)?30?69\d{8}$/.test(digits) || /^69\d{8}$/.test(digits);
}

// ─── Main export ──────────────────────────────────────────────────────────────

// Major Greek cities for parallel nation-wide searches
const GREEK_CITIES = ['Αθήνα', 'Θεσσαλονίκη', 'Πάτρα', 'Ηράκλειο', 'Λάρισα', 'Βόλος', 'Ιωάννινα', 'Χανιά', 'Ρόδος', 'Καλαμάτα'];
// Broad terms for no-category sweeps
const BROAD_TERMS  = ['επαγγελματίας', 'ιατρός'];

export async function findPublicLeads(input: FindPublicLeadsInput): Promise<FindPublicLeadsOutput> {
  const baseCategory = (input.category || '').trim();
  const hasCategory = baseCategory.length > 0;

  const category = baseCategory || 'επαγγελματίας';
  const location  = (input.location || '').trim();

  // ── Category keywords for post-filtering unstructured sources ──────────────
  const categoryKeywords = buildCategoryKeywords(baseCategory);

  let allRaw: PublicLead[];

  if (!hasCategory && !location) {
    // ── No-category, no-location: broad sweep across major Greek cities ───────
    const [osmR, googleR, hereR, tomtomR, foursquareR, geoapifyR, wikidataR,
           xoR, vriskoR, th888AthR,
           th_googleR, th_hereR, th_xoR, th_vriskoR, th888ThR] = await Promise.all([
      searchOverpass(category, 'Αθήνα'),
      searchGooglePlaces(category, 'Αθήνα'),
      searchHERE(category, 'Αθήνα'),
      searchTomTom(category, 'Αθήνα'),
      searchFoursquare(category, 'Αθήνα'),
      searchGeoapify(category, 'Αθήνα'),
      searchWikidata(category),
      searchXO(BROAD_TERMS[0], 'Αθήνα'),
      searchVrisko(BROAD_TERMS[0], 'Αθήνα'),
      search11888(BROAD_TERMS[0], 'Αθήνα'),
      searchGooglePlaces(BROAD_TERMS[1], 'Θεσσαλονίκη'),
      searchHERE(BROAD_TERMS[1], 'Θεσσαλονίκη'),
      searchXO(BROAD_TERMS[0], 'Θεσσαλονίκη'),
      searchVrisko(BROAD_TERMS[0], 'Θεσσαλονίκη'),
      search11888(BROAD_TERMS[0], 'Θεσσαλονίκη'),
    ]);
    allRaw = [
      ...googleR, ...foursquareR, ...hereR, ...tomtomR, ...geoapifyR,
      ...osmR, ...wikidataR, ...xoR, ...vriskoR, ...th888AthR,
      ...th_googleR, ...th_hereR, ...th_xoR, ...th_vriskoR, ...th888ThR,
    ];
  } else if (hasCategory && !location) {
    // ── Category given, no location → search all of Greece in parallel ────────
    // API-based: top cities × all mapping APIs
    const apiCityResults = await Promise.allSettled(
      GREEK_CITIES.flatMap(city => [
        searchGooglePlaces(category, city),
        searchHERE(category, city),
        searchTomTom(category, city),
        searchFoursquare(category, city),
        searchGeoapify(category, city),
        searchAzureMaps(category, city),
        searchMapbox(category, city),
        searchRadar(category, city),
      ])
    );
    // Directory scrapers: national-level + per major city for Vrisko/XO
    const [xoR, vriskoR, xoAthR, vriskoAthR, xoThR, vriskoThR,
           dirR, ty4R, fallR, nominatimR, yelpR,
           th888R, th888AthR, th888ThR, datR] = await Promise.all([
      searchXO(category, 'Ελλάδα'),
      searchVrisko(category, 'Ελλάδα'),
      searchXO(category, 'Αθήνα'),
      searchVrisko(category, 'Αθήνα'),
      searchXO(category, 'Θεσσαλονίκη'),
      searchVrisko(category, 'Θεσσαλονίκη'),
      searchGreekDirectories(category, 'Ελλάδα'),
      search4ty(category, 'Ελλάδα'),
      searchFAll(category, 'Ελλάδα'),
      searchNominatim(category, 'Αθήνα'),
      searchYelp(category, 'Greece'),
      search11888(category, 'Ελλάδα'),
      search11888(category, 'Αθήνα'),
      search11888(category, 'Θεσσαλονίκη'),
      searchDoctorAnytime(category),
    ]);
    allRaw = [
      ...apiCityResults.flatMap(r => r.status === 'fulfilled' ? r.value : []),
      ...xoR, ...vriskoR, ...xoAthR, ...vriskoAthR, ...xoThR, ...vriskoThR,
      ...th888R, ...th888AthR, ...th888ThR,
      ...dirR, ...ty4R, ...fallR, ...nominatimR, ...yelpR, ...datR,
    ];
  } else {
    // ── Category + location given: targeted single-area search ────────────────
    const loc = location;
    const [osmLeads, googleLeads, xoLeads, hereLeads, yelpLeads, tomtomLeads, vriskoLeads,
           geoapifyLeads, greekDirLeads, foursquareLeads, azureLeads, mapboxLeads,
           radarLeads, nominatimLeads, ty4Leads, fallLeads, th888Leads, datLeads] = await Promise.all([
      searchOverpass(category, loc),
      searchGooglePlaces(category, loc),
      searchXO(category, loc),
      searchHERE(category, loc),
      searchYelp(category, loc),
      searchTomTom(category, loc),
      searchVrisko(category, loc),
      searchGeoapify(category, loc),
      searchGreekDirectories(category, loc),
      searchFoursquare(category, loc),
      searchAzureMaps(category, loc),
      searchMapbox(category, loc),
      searchRadar(category, loc),
      searchNominatim(category, loc),
      search4ty(category, loc),
      searchFAll(category, loc),
      search11888(category, loc),
      searchDoctorAnytime(category, loc),
    ]);
    allRaw = [
      ...googleLeads, ...foursquareLeads, ...azureLeads, ...mapboxLeads,
      ...tomtomLeads, ...hereLeads, ...geoapifyLeads, ...radarLeads,
      ...xoLeads, ...vriskoLeads, ...th888Leads, ...ty4Leads, ...fallLeads,
      ...greekDirLeads, ...nominatimLeads, ...osmLeads, ...yelpLeads, ...datLeads,
    ];
  }

  // ── Merge: deduplicate by phone, merging extra phones from later sources ─────
  // API sources (Google, Foursquare …) appear first and return a single phone.
  // Directory sources (XO.gr, Vrisko …) may return the same contact with both
  // mobile + landline. Instead of skipping the duplicate, we merge the new phones
  // into the existing entry so the final contact shows all available numbers.
  const seenPhone = new Map<string, number>(); // normalized phone → index in `all`
  const all: PublicLead[] = [];
  for (const lead of allRaw) {
    if (!lead.name) continue;
    if (!isTargetedLead(lead)) continue;
    if (!passesCategoryFilter(lead, categoryKeywords)) continue;
    const leadPhoneList = lead.phones ?? [lead.phone];
    const leadKeys = leadPhoneList.map(p => p.replace(/\D/g, '').slice(-10));
    const existingIdx = leadKeys.reduce<number | undefined>((found, k) => found ?? seenPhone.get(k), undefined);
    if (existingIdx !== undefined) {
      // Duplicate — merge all unique phones, and use the entry with MORE phones as the base
      // (so a directory source with mobile+landline beats a single-phone API source)
      const existing = all[existingIdx];
      const existingPhoneList = existing.phones ?? [existing.phone];
      const mergedKeys = new Map<string, string>();
      for (const p of existingPhoneList) mergedKeys.set(p.replace(/\D/g, '').slice(-10), p);
      for (const p of leadPhoneList) mergedKeys.set(p.replace(/\D/g, '').slice(-10), p);
      const mergedPhones = [...mergedKeys.values()];
      const baseEntry = leadPhoneList.length > existingPhoneList.length ? lead : existing;
      all[existingIdx] = {
        ...baseEntry,
        phone: mergedPhones[0],
        phones: mergedPhones.length > 1 ? mergedPhones : undefined,
      };
      for (const k of mergedKeys.keys()) seenPhone.set(k, existingIdx);
    } else {
      const idx = all.length;
      leadKeys.forEach(k => seenPhone.set(k, idx));
      all.push(lead);
    }
  }

  // Sort: mobile-only first → mobile+landline → landline-only; within ties personal names first
  const phoneCategory = (lead: PublicLead): number => {
    const all = lead.phones ?? [lead.phone];
    const hasMobile = all.some(p => isMobilePhone(p));
    const hasFixed  = all.some(p => !isMobilePhone(p));
    if (hasMobile && !hasFixed) return 0;
    if (hasMobile && hasFixed)  return 1;
    return 2;
  };
  all.sort((a, b) => {
    const diff = phoneCategory(a) - phoneCategory(b);
    if (diff !== 0) return diff;
    return Number(looksLikePersonalName(b.name)) - Number(looksLikePersonalName(a.name));
  });

  const sources = [...new Set(all.map(l => l.source))];

  if (all.length === 0) {
    throw new Error(
      input.language === 'el'
        ? `Δεν βρέθηκαν αποτελέσματα για "${category}"${location ? ` στην "${location}"` : ''}. Δοκιμάστε: "γιατροί" / "φαρμακεία" / "δικηγόροι" / "λογιστές" με πόλη όπως "Αθήνα", "Θεσσαλονίκη".`
        : `No results for "${category}"${location ? ` in "${location}"` : ''}. Try: "doctors" / "pharmacies" / "lawyers" with a city like "Athens".`
    );
  }

  const displayLoc = location || 'Ελλάδα';
  return {
    leads: all,
    summary: input.language === 'el'
      ? `Βρέθηκαν ${all.length} επαφές για "${category}" (${displayLoc}). Πηγές: ${sources.join(', ')}.`
      : `Found ${all.length} contacts for "${category}" (${displayLoc}). Sources: ${sources.join(', ')}.`,
  };
}
