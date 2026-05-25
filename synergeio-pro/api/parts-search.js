// Server-side price search: fetches & parses automotive parts stores
// Tries JSON-LD structured data first (reliable), HTML regex as fallback

const TIMEOUT_MS = 9000;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'el-GR,el;q=0.9,en-US;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

async function fetchPage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, { headers: HEADERS, signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(timer);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// Extract price value from various string formats: "12,99 €", "€ 12.99", "12.99€"
function parsePrice(str) {
  if (!str) return null;
  const clean = String(str).replace(/\s/g, '');
  const m = clean.match(/(\d{1,5})[,.](\d{2})/);
  if (!m) return null;
  const val = parseFloat(`${m[1]}.${m[2]}`);
  return (val > 0.1 && val < 50000) ? val : null;
}

// Parse JSON-LD <script type="application/ld+json"> blocks for Product schema
function extractJsonLd(html) {
  const results = [];
  const rx = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = rx.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1].trim());
      const items = [data, ...(data['@graph'] || [])];
      for (const item of items) {
        if (item['@type'] !== 'Product' && item['@type'] !== 'ItemList') continue;
        const offerSrc = item.offers;
        if (!offerSrc) continue;
        const offers = Array.isArray(offerSrc) ? offerSrc : [offerSrc];
        for (const offer of offers) {
          const price = parsePrice(offer.price);
          if (price === null) continue;
          results.push({
            name: item.name || '',
            price,
            currency: offer.priceCurrency || 'EUR',
            inStock: !offer.availability || offer.availability.includes('InStock'),
            url: offer.url || item.url || '',
            image: Array.isArray(item.image) ? item.image[0] : (item.image || ''),
          });
        }
      }
    } catch { /* skip malformed */ }
  }
  return results;
}

// Extract from embedded JS data stores (window.__data__, window.__INITIAL_STATE__, etc.)
function extractWindowData(html) {
  const results = [];
  const rx = /window\.__(?:INITIAL_STATE|data|store|DATA)__\s*=\s*(\{[\s\S]{0,30000}?\});/;
  const m = rx.exec(html);
  if (!m) return results;
  try {
    const data = JSON.parse(m[1]);
    // Recursively find objects with price fields
    function walk(obj, depth = 0) {
      if (depth > 6 || !obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) { obj.forEach((o) => walk(o, depth + 1)); return; }
      const price = parsePrice(obj.price || obj.Price || obj.priceValue);
      const name = obj.name || obj.title || obj.Name;
      const url = obj.url || obj.link || obj.href;
      if (price && name) {
        results.push({ name: String(name), price, currency: obj.currency || 'EUR', url: url || '', inStock: true });
      }
      Object.values(obj).forEach((v) => walk(v, depth + 1));
    }
    walk(data);
  } catch { /* skip */ }
  return results.slice(0, 5);
}

// Regex fallback: find price patterns near product names in HTML
function extractHtmlPrices(html, fallbackUrl) {
  const results = [];
  // Strip scripts/styles for cleaner text
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');

  // Pattern: title element near price
  const blockRx = /<(?:h[1-4]|a|span|div)[^>]*class="[^"]*(?:name|title|product)[^"]*"[^>]*>([\s\S]{3,80}?)<\/(?:h[1-4]|a|span|div)>[\s\S]{0,600}?(\d{1,4}[,.]\d{2})\s*€/gi;
  let bm;
  while ((bm = blockRx.exec(clean)) !== null && results.length < 5) {
    const name = bm[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const price = parsePrice(bm[2]);
    if (name && price) results.push({ name, price, currency: 'EUR', url: fallbackUrl, inStock: true });
  }

  // Simpler fallback: just extract prices
  if (results.length === 0) {
    const priceRx = /(\d{1,4}[,.]\d{2})\s*€/g;
    const prices = [];
    let pm;
    while ((pm = priceRx.exec(clean)) !== null) {
      const p = parsePrice(pm[1]);
      if (p) prices.push(p);
    }
    const uniquePrices = [...new Set(prices)].sort((a, b) => a - b).slice(0, 3);
    for (const p of uniquePrices) {
      results.push({ name: '', price: p, currency: 'EUR', url: fallbackUrl, inStock: true });
    }
  }

  return results;
}

async function parseStore(html, fallbackUrl) {
  if (!html) return [];
  let items = extractJsonLd(html);
  if (items.length === 0) items = extractWindowData(html);
  if (items.length === 0) items = extractHtmlPrices(html, fallbackUrl);
  return items.slice(0, 3);
}

const STORES = [
  {
    name: 'AutoDoc',
    icon: 'package',
    color: 'orange',
    search: (q) => `https://www.autodoc.gr/search?keyword=${encodeURIComponent(q)}`,
  },
  {
    name: 'eAutoparts',
    icon: 'box',
    color: 'blue',
    search: (q) => `https://www.eautoparts.gr/search?q=${encodeURIComponent(q)}`,
  },
  {
    name: 'Skroutz',
    icon: 'shopping-bag',
    color: 'green',
    search: (q) => `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(q)}`,
  },
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const { query, brand, model, year, oemRef } = body;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const vehicleCtx = [brand, model, year].filter(Boolean).join(' ');
  // OEM ref gives the most precise results; otherwise part name + vehicle context
  const searchQ = oemRef ? oemRef : `${query} ${vehicleCtx}`.trim();

  const allResults = [];

  await Promise.allSettled(
    STORES.map(async (store) => {
      const url = store.search(searchQ);
      const html = await fetchPage(url);
      const items = await parseStore(html, url);
      for (const item of items) {
        allResults.push({
          store: store.name,
          icon: store.icon,
          color: store.color,
          name: item.name || query,
          price: item.price,
          currency: item.currency || 'EUR',
          inStock: item.inStock !== false,
          url: item.url && item.url.startsWith('http') ? item.url : url,
          searchUrl: url,
        });
      }
    })
  );

  // Sort cheapest first; prefer in-stock items
  allResults.sort((a, b) => {
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
    return a.price - b.price;
  });

  return res.status(200).json({
    query: searchQ,
    vehicleCtx,
    results: allResults.slice(0, 8),
    // Always include direct search links as reliable fallback
    fallbackLinks: STORES.map((s) => ({ store: s.name, icon: s.icon, url: s.search(searchQ) })),
  });
};
