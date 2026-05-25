// =========================================================
//  Βοηθητικά: format, share, PDF, AI scan, parts deep links
// =========================================================
window.U = (function () {

  function escape(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtDate(d, lang) {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date)) return '—';
    const l = lang || localStorage.getItem('lang') || 'el';
    return date.toLocaleDateString(l === 'el' ? 'el-GR' : 'en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function fmtDatetime(d, lang) {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date)) return '—';
    const l = lang || localStorage.getItem('lang') || 'el';
    return date.toLocaleString(l === 'el' ? 'el-GR' : 'en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function fmtMoney(v, currency) {
    const c = currency || localStorage.getItem('currency') || 'EUR';
    const n = Number(v) || 0;
    const lang = localStorage.getItem('lang') || 'el';
    try {
      return n.toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB', {
        style: 'currency',
        currency: c,
      });
    } catch (e) {
      return n.toFixed(2) + ' ' + c;
    }
  }

  function daysBetween(a, b) {
    const ms = new Date(b) - new Date(a);
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function toast(msg, type) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className =
        'fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium transition-opacity duration-300';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.remove('opacity-0');
    el.classList.add('opacity-100');
    if (type === 'error') {
      el.style.background = '#dc2626';
      el.style.color = '#fff';
    } else {
      el.style.background = '#0f172a';
      el.style.color = '#fff';
    }
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.classList.remove('opacity-100');
      el.classList.add('opacity-0');
    }, 2200);
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // ---- Photo handling ----
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function compressImage(dataUrl, maxDim, quality) {
    maxDim = maxDim || 1200;
    quality = quality || 0.8;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // ---- Phone clean / WhatsApp & Viber deep links ----
  function cleanPhone(p) {
    if (!p) return '';
    // remove non-digits except leading +
    let s = String(p).trim().replace(/[^\d+]/g, '');
    // If number is Greek and starts with 6 or 2, prefix +30
    if (!s.startsWith('+')) {
      if (/^(\d{10})$/.test(s) && (s.startsWith('6') || s.startsWith('2'))) {
        s = '+30' + s;
      } else if (s.startsWith('0030')) {
        s = '+' + s.slice(2);
      } else if (s.startsWith('30') && s.length === 12) {
        s = '+' + s;
      }
    }
    return s;
  }

  function whatsappLink(phone, message) {
    const num = cleanPhone(phone).replace(/[^\d]/g, '');
    return `https://wa.me/${num}?text=${encodeURIComponent(message || '')}`;
  }

  function viberLink(phone, message) {
    const num = cleanPhone(phone).replace(/[^\d]/g, '');
    // Viber works with international number without "+"
    return `viber://chat?number=%2B${num}&text=${encodeURIComponent(message || '')}`;
  }

  function smsLink(phone, message) {
    return `sms:${cleanPhone(phone)}?&body=${encodeURIComponent(message || '')}`;
  }

  function mailtoLink(email, subject, body) {
    return `mailto:${email}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body || '')}`;
  }

  // ---- Web Share API ----
  async function share(title, text, url) {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch (e) {
        return false;
      }
    }
    // fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text + (url ? '\n' + url : ''));
      toast(window.t('copied'));
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---- Service due / next computation ----
  function computeNextService(vehicle, services, settings) {
    settings = settings || {};
    const intervalMonths = Number(settings.intervalMonths || 12);
    const intervalKm = Number(settings.intervalKm || 10000);
    const sorted = (services || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const last = sorted[0];
    let nextDate = null;
    let nextKm = null;
    if (last) {
      nextDate = last.nextServiceDate
        ? new Date(last.nextServiceDate)
        : addMonths(last.date, intervalMonths);
      nextKm = last.nextServiceMileage
        ? Number(last.nextServiceMileage)
        : Number(last.mileage || 0) + intervalKm;
    } else if (vehicle) {
      // αν δεν έχει service ακόμα, υπολογίζουμε από την ημ/νία δημιουργίας
      const baseDate = vehicle.createdAt ? new Date(vehicle.createdAt) : new Date();
      nextDate = addMonths(baseDate, intervalMonths);
      nextKm = (Number(vehicle.mileage) || 0) + intervalKm;
    }
    return { nextDate, nextKm, lastService: last };
  }

  function reminderStatus(vehicle, services, settings) {
    const { nextDate, nextKm, lastService } = computeNextService(vehicle, services, settings);
    const now = new Date();
    const days = nextDate ? daysBetween(now, nextDate) : null;
    let status = 'ok';
    if (days != null) {
      if (days < 0) status = 'overdue';
      else if (days <= 30) status = 'upcoming';
    }
    return { nextDate, nextKm, lastService, days, status };
  }

  // ---- AI Scan: server route (Vercel) → client-side key fallback ----
  const AI_PROMPT = `You are an expert OCR assistant for Greek vehicle registration certificates (Άδεια Κυκλοφορίας).

PLATE: found on COVER page next to "(Α) ΑΡΙΘΜΟΣ ΚΥΚΛΟΦΟΡΙΑΣ". Do NOT use "ΑΡΙΘΜΟΣ ΕΓΓΡΑΦΟΥ" (that is the document number). Car plates: 3 Greek letters + 4 digits. Motorcycle: 3 letters + 3 digits.

Fields in the VEHICLE DATA page: (4)=first reg year in Greece, (D.1)=brand, (D.3)=model, (E)=VIN 17chars, (J)=category(L3E/ΔΙΚΥΚΛΟ→moto,M1→car,N→truck), (P.1)=cc integer, (P.3)=fuel(ΒΕΝΖΙΝΗ→gasoline,ΠΕΤΡΕΛΑΙΟ→diesel,ΥΓΡΑΕΡΙΟ→lpg,ΥΒΡΙΔΙΚΟ→hybrid,ΗΛΕΚΤΡΙΚΟ→electric), (R)=color.
Fields in the PERSONAL DATA page: (C.1.1)=surname, (C.1.2)=first name → ownerName="Firstname Lastname".

Return ONLY valid JSON (null for missing): {"plate":null,"vin":null,"brand":null,"model":null,"year":null,"engine":null,"fuel":null,"color":null,"type":null,"ownerName":null,"mileage":null}`;

  async function aiExtractRegistration(imageDataUrls, odometerDataUrl) {
    const urls = Array.isArray(imageDataUrls) ? imageDataUrls : [imageDataUrls];

    // 1. Server-side route (Vercel deployment — key is secure in env var)
    try {
      const res = await fetch('/api/ai-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrls: urls, odometerDataUrl: odometerDataUrl || null }),
      });
      if (res.ok) return await res.json();
      if (res.status !== 404) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Σφάλμα server (${res.status})`);
      }
      // 404 = local dev without vercel CLI → fall through to client keys
    } catch (e) {
      const isNetwork = e instanceof TypeError || (e.message && e.message.toLowerCase().includes('fetch'));
      if (!isNetwork) {
        toast(e.message, 'error');
        return null;
      }
      // Network error in local dev → fall through to client keys
    }

    // 2. Fallback: client-side API keys (local development)
    const anthropicKey = localStorage.getItem('anthropic_api_key');
    const openaiKey = localStorage.getItem('ai_api_key');

    if (!anthropicKey && !openaiKey) {
      toast(window.t ? window.t('ai_scan_no_key') : 'Δεν βρέθηκε AI key', 'error');
      return null;
    }

    if (anthropicKey) {
      try {
        const parts = urls[0].split(',');
        const mediaType = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
        const b64 = parts[1] || '';
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            messages: [{ role: 'user', content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
              { type: 'text', text: AI_PROMPT },
            ]}],
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const txt = data?.content?.[0]?.text || '';
        const m = txt.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('No JSON in response');
        return JSON.parse(m[0]);
      } catch (e) {
        console.error('Claude direct call failed:', e);
        toast(window.t ? window.t('error_generic') : 'Σφάλμα AI', 'error');
        return null;
      }
    }

    // OpenAI
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: [
            { type: 'text', text: AI_PROMPT },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ]}],
          max_tokens: 500,
        }),
      });
      const data = await res.json();
      const txt = data?.choices?.[0]?.message?.content || '';
      const m = txt.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('No JSON in response');
      return JSON.parse(m[0]);
    } catch (e) {
      console.error('OpenAI scan failed:', e);
      toast(window.t ? window.t('error_generic') : 'Σφάλμα AI', 'error');
      return null;
    }
  }

  // ---- Parts search providers ----
  function partsSearchLinks(vehicle, query) {
    const q = query || `${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim();
    return partsStoreLinks(vehicle, q, null, null);
  }

  // Per-part store links: uses OEM ref or brand part number for precise search,
  // plus vehicle make/model/year for context
  function partsStoreLinks(vehicle, partQuery, oemRef, brandPartNumber) {
    const b = (vehicle.brand || '').trim();
    const m = (vehicle.model || '').trim();
    const y = vehicle.year ? String(vehicle.year) : '';
    const vCtx = [b, m, y].filter(Boolean).join(' ');

    // Primary query: OEM ref is most precise, then brand part#, then name+vehicle
    const preciseQuery = oemRef || brandPartNumber || `${partQuery} ${vCtx}`.trim();
    // Greek-language query for Skroutz
    const greekQuery = `${partQuery} ${vCtx}`.trim();

    const links = [
      {
        name: 'AutoDoc',
        icon: 'package',
        badge: 'EU',
        url: `https://www.autodoc.gr/search?keyword=${encodeURIComponent(preciseQuery)}`,
      },
      {
        name: 'Skroutz',
        icon: 'shopping-bag',
        badge: 'GR',
        url: `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(greekQuery)}`,
      },
      {
        name: 'MisterAuto',
        icon: 'car',
        badge: 'EU',
        url: `https://www.mister-auto.gr/search/?q=${encodeURIComponent(preciseQuery)}`,
      },
      {
        name: 'eAutoparts',
        icon: 'box',
        badge: 'GR',
        url: `https://www.eautoparts.gr/search?q=${encodeURIComponent(greekQuery)}`,
      },
    ];

    // OEM number → Google search (finds official distributor pages)
    if (oemRef) {
      links.push({
        name: `OEM ${oemRef}`,
        icon: 'fingerprint',
        badge: 'OEM',
        url: `https://www.google.com/search?q=${encodeURIComponent(oemRef + ' ' + vCtx + ' ανταλλακτικό')}`,
      });
    }

    // Brand part number → AutoDoc (usually indexed by part number)
    if (brandPartNumber && brandPartNumber !== oemRef) {
      links.push({
        name: brandPartNumber,
        icon: 'tag',
        badge: 'P/N',
        url: `https://www.autodoc.gr/search?keyword=${encodeURIComponent(brandPartNumber)}`,
      });
    }

    // VIN search if available
    if (vehicle.vin) {
      links.push({
        name: 'VIN lookup',
        icon: 'scan-line',
        badge: 'VIN',
        url: `https://www.google.com/search?q=${encodeURIComponent('VIN ' + vehicle.vin + ' ' + partQuery)}`,
      });
    }

    return links;
  }

  // ---- PDF generation (jsPDF) ----
  async function servicePdf({ workshop, customer, vehicle, service }) {
    // jsPDF is loaded from CDN globally as window.jspdf
    if (!window.jspdf) {
      toast('jsPDF not loaded', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const PW = 210;
    const M = 15;
    let y = M;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(workshop?.name || window.t('app_name'), M, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (workshop?.address) doc.text(workshop.address, M, y), (y += 5);
    if (workshop?.phone) doc.text(`Tel: ${workshop.phone}`, M, y), (y += 5);
    if (workshop?.email) doc.text(workshop.email, M, y), (y += 5);

    // Title
    y += 4;
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(0.6);
    doc.line(M, y, PW - M, y);
    y += 8;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(window.t('service_summary'), M, y);
    y += 8;

    // Date / Service type
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${window.t('service_date')}: ${fmtDate(service.date)}`, M, y);
    doc.text(`${window.t('service_type')}: ${service.type || '—'}`, PW / 2, y);
    y += 6;

    // Customer block
    doc.setFont('helvetica', 'bold');
    doc.text(window.t('customer') + ':', M, y);
    doc.setFont('helvetica', 'normal');
    doc.text(customer?.name || '—', M + 28, y);
    y += 5;
    if (customer?.phone) {
      doc.text(`${window.t('customer_phone')}: ${customer.phone}`, M, y);
      y += 5;
    }

    // Vehicle block
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text(window.t('vehicle') + ':', M, y);
    doc.setFont('helvetica', 'normal');
    const veh = [vehicle.brand, vehicle.model, vehicle.year, vehicle.plate ? `(${vehicle.plate})` : ''].filter(Boolean).join(' ');
    doc.text(veh || '—', M + 28, y);
    y += 5;
    if (vehicle.vin) doc.text(`VIN: ${vehicle.vin}`, M, y), (y += 5);
    if (service.mileage) doc.text(`${window.t('service_mileage')}: ${service.mileage}`, M, y), (y += 5);

    // Work description
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text(window.t('service_description') + ':', M, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(service.description || '—', PW - M * 2);
    doc.text(descLines, M, y);
    y += descLines.length * 5 + 4;

    // Parts table
    if (service.parts && service.parts.length) {
      doc.setFont('helvetica', 'bold');
      doc.text(window.t('service_parts') + ':', M, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFillColor(241, 245, 249);
      doc.rect(M, y - 4, PW - M * 2, 6, 'F');
      doc.text('#', M + 2, y);
      doc.text(window.t('part_name'), M + 10, y);
      doc.text(window.t('part_code'), M + 80, y);
      doc.text(window.t('part_qty'), M + 120, y);
      doc.text(window.t('part_price'), M + 145, y);
      doc.text(window.t('service_total'), M + 170, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      service.parts.forEach((p, i) => {
        const total = (Number(p.qty) || 0) * (Number(p.price) || 0);
        doc.text(String(i + 1), M + 2, y);
        const nameLines = doc.splitTextToSize(p.name || '', 65);
        doc.text(nameLines[0] || '', M + 10, y);
        doc.text(p.code || '', M + 80, y);
        doc.text(String(p.qty || 0), M + 120, y);
        doc.text(fmtMoney(p.price), M + 145, y);
        doc.text(fmtMoney(total), M + 170, y);
        y += 5;
        if (y > 260) {
          doc.addPage();
          y = M;
        }
      });
      y += 2;
    }

    // Totals
    const partsTotal = (service.parts || []).reduce(
      (s, p) => s + (Number(p.qty) || 0) * (Number(p.price) || 0),
      0
    );
    const laborTotal = (Number(service.laborHours) || 0) * (Number(service.laborRate) || 0);
    const grand = partsTotal + laborTotal;

    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(`${window.t('parts_total')}:`, PW - M - 70, y);
    doc.text(fmtMoney(partsTotal), PW - M, y, { align: 'right' });
    y += 5;
    doc.text(`${window.t('labor_total')} (${service.laborHours || 0}h):`, PW - M - 70, y);
    doc.text(fmtMoney(laborTotal), PW - M, y, { align: 'right' });
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${window.t('grand_total')}:`, PW - M - 70, y);
    doc.text(fmtMoney(grand), PW - M, y, { align: 'right' });

    // Next service
    if (service.nextServiceDate || service.nextServiceMileage) {
      y += 12;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${window.t('next_service_due')}:`, M, y);
      const next = [
        service.nextServiceDate ? fmtDate(service.nextServiceDate) : '',
        service.nextServiceMileage ? `${service.nextServiceMileage} km` : '',
      ].filter(Boolean).join(' / ');
      doc.text(next, M + 35, y);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `${window.t('app_name')} • ${new Date().toLocaleString(localStorage.getItem('lang') === 'el' ? 'el-GR' : 'en-GB')}`,
      M,
      290
    );

    const filename = `service_${vehicle.plate || vehicle.id}_${(service.date || '').slice(0, 10)}.pdf`;
    doc.save(filename);
    return filename;
  }

  return {
    escape,
    fmtDate,
    fmtDatetime,
    fmtMoney,
    daysBetween,
    addMonths,
    toast,
    debounce,
    readFileAsDataURL,
    compressImage,
    cleanPhone,
    whatsappLink,
    viberLink,
    smsLink,
    mailtoLink,
    share,
    computeNextService,
    reminderStatus,
    aiExtractRegistration,
    partsSearchLinks,
    partsStoreLinks,
    servicePdf,
    hasSpeech,
    triggerVoice,
  };

  function hasSpeech() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function triggerVoice(inputEl, { lang = 'el-GR', transform, onResult, onEnd } = {}) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !inputEl) return null;
    const r = new SR();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    let finalAccum = '';
    r.onresult = (e) => {
      let full = finalAccum;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const t = e.results[i][0].transcript;
          finalAccum += t;
          full = finalAccum;
        } else {
          full = finalAccum + e.results[i][0].transcript;
        }
      }
      const out = typeof transform === 'function' ? transform(full) : full;
      inputEl.value = out;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    };
    r.onerror = () => onEnd?.();
    r.onend = () => {
      if (finalAccum) {
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        onResult?.(inputEl.value);
      }
      onEnd?.();
    };
    try { r.start(); } catch (e) { onEnd?.(); }
    return r;
  }
})();
