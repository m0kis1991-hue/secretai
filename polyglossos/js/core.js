/* Πυρήνας: βοηθητικές συναρτήσεις, αποθήκευση, επανάληψη σε διαστήματα (SRS), φωνή. */
window.G = window.G || {};

/* ---------------------------------------------------------------- Utils */
G.U = (() => {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const sample = (a, n) => shuffle(a).slice(0, n);
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/œ/g, 'oe').replace(/æ/g, 'ae');
  const norm = (s) => String(s).normalize('NFC').toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[.,!?¡¿;:«»"“”()…\-–—·/]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const lev = (a, b) => {
    if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  };
  const similarity = (a, b) => { a = stripAccents(norm(a)); b = stripAccents(norm(b)); const m = Math.max(a.length, b.length) || 1; return 1 - lev(a, b) / m; };
  const words = (s) => (String(s).toLowerCase().match(/[\p{L}']+/gu) || []).map((w) => w.replace(/^'+|'+$/g, '')).filter(Boolean);
  const fmtDur = (sec) => `${Math.floor(sec / 60)}:${pad(Math.floor(sec % 60))}`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const vibrate = (p) => { try { if (G.S && G.S.settings.haptics && navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
  let actx = null;
  const tone = (ok) => {
    try {
      if (!G.S || !G.S.settings.sound) return;
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = ok ? [660, 880] : [300, 220];
      notes.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        const t = actx.currentTime + i * 0.09;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.18);
      });
    } catch (e) {}
  };
  return { esc, shuffle, pick, sample, hash, dayKey, daysBetween, stripAccents, norm, lev, similarity, words, fmtDur, clamp, vibrate, tone };
})();

/* ---------------------------------------------------------------- Languages */
G.LANGS = {
  en: { name: 'Αγγλικά', native: 'English', flag: '🇬🇧', tts: 'en-GB' },
  fr: { name: 'Γαλλικά', native: 'Français', flag: '🇫🇷', tts: 'fr-FR' },
  es: { name: 'Ισπανικά', native: 'Español', flag: '🇪🇸', tts: 'es-ES' },
  it: { name: 'Ιταλικά', native: 'Italiano', flag: '🇮🇹', tts: 'it-IT' },
  de: { name: 'Γερμανικά', native: 'Deutsch', flag: '🇩🇪', tts: 'de-DE' },
  el: { name: 'Ελληνικά', native: 'Ελληνικά · εκφορά λόγου', flag: '🇬🇷', tts: 'el-GR' }
};
G.LANG_ORDER = ['en', 'fr', 'es', 'it', 'de', 'el'];

/* ---------------------------------------------------------------- Store */
G.Store = (() => {
  const KEY = 'glossa.v1';
  const fresh = () => ({
    v: 1, created: Date.now(), onboarded: false,
    profile: null, current: 'en',
    langs: {}, cards: {}, seen: {},
    days: {}, streak: { count: 0, last: null, best: 0, freezes: 1 },
    speeches: [],
    settings: { rate: 0.95, voices: {}, dailyXp: 60, sound: true, haptics: true, theme: 'auto', autoplay: true }
  });
  let saveTimer = null;
  const load = () => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    const base = fresh();
    if (!s || typeof s !== 'object') return base;
    s.settings = Object.assign(base.settings, s.settings || {});
    s.streak = Object.assign(base.streak, s.streak || {});
    for (const k of ['langs', 'cards', 'seen', 'days']) s[k] = s[k] || {};
    s.speeches = s.speeches || [];
    return s;
  };
  const save = (now) => {
    clearTimeout(saveTimer);
    const run = () => { try { localStorage.setItem(KEY, JSON.stringify(G.S)); } catch (e) { console.warn('save failed', e); G.toast && G.toast('⚠️ Δεν ήταν δυνατή η αποθήκευση (γεμάτος χώρος;)'); } };
    if (now) run(); else saveTimer = setTimeout(run, 250);
  };
  const lang = (code) => {
    const L = G.S.langs[code] || (G.S.langs[code] = { level: null, placed: false, xp: 0, grammarSeen: [], started: Date.now() });
    return L;
  };
  const today = () => {
    const k = G.U.dayKey();
    return G.S.days[k] || (G.S.days[k] = { xp: 0, sec: 0, answers: 0, correct: 0, newItems: 0 });
  };
  const addXp = (code, xp) => {
    lang(code).xp += xp; today().xp += xp; touchStreak(); save();
  };
  const touchStreak = () => {
    const k = G.U.dayKey(), st = G.S.streak;
    if (st.last === k) return;
    if (!st.last) st.count = 1;
    else {
      const gap = G.U.daysBetween(st.last, k);
      if (gap === 1) st.count += 1;
      else if (gap === 2 && st.freezes > 0) { st.freezes -= 1; st.count += 1; G.toast && G.toast('🧊 Χρησιμοποιήθηκε «πάγωμα» σερί — το σερί σου σώθηκε!'); }
      else if (gap > 1) st.count = 1;
    }
    st.last = k; st.best = Math.max(st.best, st.count);
    if (st.count % 7 === 0 && st.freezes < 2) st.freezes += 1;
  };
  const exportJson = () => JSON.stringify(G.S, null, 1);
  const importJson = (txt) => { const o = JSON.parse(txt); if (!o || o.v !== 1) throw new Error('Μη έγκυρο αρχείο'); localStorage.setItem(KEY, JSON.stringify(o)); G.S = load(); };
  const reset = () => { localStorage.removeItem(KEY); G.S = fresh(); };
  return { load, save, lang, today, addXp, exportJson, importJson, reset };
})();
G.S = G.Store.load();

/* ---------------------------------------------------------------- SRS (SM-2, προσαρμοσμένο)
 * Κάρτα: { d: επόμενη λήξη (ms), i: διάστημα (ημέρες), e: ευκολία, r: συνεχόμενες σωστές, l: λάθη, n: φορές που εμφανίστηκε }
 * Βαθμοί: 0 = λάθος, 1 = δύσκολο, 2 = καλό, 3 = εύκολο
 */
G.SRS = (() => {
  const DAY = 86400000;
  const get = (id) => G.S.cards[id];
  const isNew = (id) => !G.S.cards[id];
  const grade = (id, g) => {
    const now = Date.now();
    const c = G.S.cards[id] || { d: now, i: 0, e: 2.5, r: 0, l: 0, n: 0 };
    c.n += 1;
    if (c.s && c.r === 0) { // «πιθανώς γνωστή» λέξη από την κατάταξη
      c.s = 0;
      if (g > 0) { c.r = 2; c.i = g === 3 ? 21 : g === 1 ? 4 : 10; c.d = now + c.i * DAY; c.t = now; G.S.cards[id] = c; G.Store.save(); return c; }
    }
    if (g === 0) {
      c.l += 1; c.r = 0; c.e = Math.max(1.3, c.e - 0.2);
      c.i = 0; c.d = now + 10 * 60000; // ξανά σε 10 λεπτά
    } else {
      c.r += 1;
      if (c.r === 1) c.i = g === 3 ? 3 : g === 1 ? 0.5 : 1;
      else if (c.r === 2) c.i = g === 3 ? 7 : g === 1 ? 2 : 4;
      else c.i = Math.round(Math.max(c.i + 1, c.i * c.e * (g === 1 ? 0.75 : g === 3 ? 1.3 : 1)));
      c.e = G.U.clamp(c.e + (g === 1 ? -0.15 : g === 3 ? 0.1 : 0), 1.3, 3.0);
      const fuzz = c.i >= 3 ? 1 + (Math.random() * 0.1 - 0.05) : 1; // αποφυγή «συσσώρευσης»
      c.d = now + c.i * fuzz * DAY;
    }
    c.t = now;
    G.S.cards[id] = c;
    G.Store.save();
    return c;
  };
  const dueIds = (prefix) => {
    const now = Date.now();
    return Object.keys(G.S.cards).filter((k) => k.startsWith(prefix) && G.S.cards[k].d <= now)
      .sort((a, b) => G.S.cards[a].d - G.S.cards[b].d);
  };
  const countBy = (prefix) => {
    let learned = 0, mastered = 0, due = 0; const now = Date.now();
    for (const k in G.S.cards) {
      if (!k.startsWith(prefix)) continue;
      const c = G.S.cards[k];
      if (c.d <= now) due++;
      if (c.s && c.r === 0) continue; // δεν έχει επιβεβαιωθεί ακόμη
      learned++;
      if (c.i >= 21) mastered++;
    }
    return { learned, mastered, due };
  };
  /* Πρόβλεψη ανάκλησης (εκθετική καμπύλη λήθης) */
  const retention = (id) => {
    const c = G.S.cards[id]; if (!c || !c.t) return 0;
    const elapsed = (Date.now() - c.t) / DAY, stab = Math.max(0.3, c.i || 0.3);
    return Math.exp(Math.log(0.9) * elapsed / stab);
  };
  return { get, isNew, grade, dueIds, countBy, retention };
})();

/* ---------------------------------------------------------------- Speech (TTS + αναγνώριση) */
G.Speech = (() => {
  let voices = [];
  const synth = window.speechSynthesis;
  const loadVoices = () => { try { voices = synth ? synth.getVoices() : []; } catch (e) { voices = []; } return voices; };
  if (synth) { loadVoices(); try { synth.addEventListener('voiceschanged', loadVoices); } catch (e) { synth.onvoiceschanged = loadVoices; } }
  const ready = new Promise((res) => { if (!synth) return res(); if (loadVoices().length) return res(); let n = 0; const t = setInterval(() => { if (loadVoices().length || ++n > 20) { clearInterval(t); res(); } }, 150); });
  const voicesFor = (code) => { const tag = G.LANGS[code].tts, p = tag.slice(0, 2); return loadVoices().filter((v) => (v.lang || '').replace('_', '-').toLowerCase().startsWith(p)); };
  const voiceFor = (code) => {
    const list = voicesFor(code); if (!list.length) return null;
    const want = G.S.settings.voices[code];
    if (want) { const v = list.find((x) => x.name === want); if (v) return v; }
    const tag = G.LANGS[code].tts.toLowerCase();
    const score = (v) => ((v.lang || '').replace('_', '-').toLowerCase() === tag ? 4 : 0) + (/google|enhanced|premium|natural|neural/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
    return list.slice().sort((a, b) => score(b) - score(a))[0];
  };
  const hasTTS = (code) => !!synth && (voicesFor(code).length > 0 || !loadVoices().length);
  const clean = (t) => String(t).split(' / ')[0].replace(/\.\.\.$/, '').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const speak = (text, code, opts = {}) => new Promise((res) => {
    if (!synth) return res(false);
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(clean(text));
      u.lang = G.LANGS[code].tts;
      const v = voiceFor(code); if (v) u.voice = v;
      u.rate = (opts.rate || G.S.settings.rate || 1) * (opts.slow ? 0.7 : 1);
      u.onend = () => res(true); u.onerror = () => res(false);
      synth.speak(u);
      setTimeout(() => res(true), 12000);
    } catch (e) { res(false); }
  });
  const stop = () => { try { synth && synth.cancel(); } catch (e) {} };

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const srSupported = !!SR;
  /* Μία φράση: επιστρέφει { text, alts[] } ή null */
  const listenOnce = (code, { timeout = 8000 } = {}) => new Promise((res) => {
    if (!SR) return res(null);
    let done = false; const r = new SR();
    r.lang = G.LANGS[code].tts; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
    const finish = (v) => { if (done) return; done = true; try { r.stop(); } catch (e) {} res(v); };
    r.onresult = (e) => { const alts = []; const rs = e.results[0]; for (let i = 0; i < rs.length; i++) alts.push(rs[i].transcript); finish({ text: alts[0] || '', alts }); };
    r.onerror = (e) => finish({ error: e.error || 'error' });
    r.onend = () => finish(null);
    try { r.start(); } catch (e) { finish({ error: 'start' }); }
    setTimeout(() => finish(null), timeout);
  });
  /* Συνεχής καταγραφή για ομιλίες — επανεκκινεί όταν ο browser σταματά μόνος του */
  const listenLong = (code, onUpdate) => {
    if (!SR) return null;
    let finalText = '', interim = '', active = true, r = null, errors = 0;
    const start = () => {
      r = new SR(); r.lang = G.LANGS[code].tts; r.interimResults = true; r.continuous = true;
      r.onresult = (e) => {
        interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += ' ' + e.results[i][0].transcript; else interim += e.results[i][0].transcript;
        }
        onUpdate && onUpdate((finalText + ' ' + interim).trim());
      };
      r.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { active = false; onUpdate && onUpdate(null, e.error); } else errors++; };
      r.onend = () => { if (active && errors < 25) { try { start(); } catch (e) {} } };
      try { r.start(); } catch (e) {}
    };
    start();
    return { stop: () => { active = false; try { r && r.stop(); } catch (e) {} return (finalText + ' ' + interim).trim(); }, text: () => (finalText + ' ' + interim).trim() };
  };
  return { ready, voicesFor, voiceFor, hasTTS, speak, stop, srSupported, listenOnce, listenLong };
})();

/* ---------------------------------------------------------------- Έλεγχος απάντησης */
G.Check = (() => {
  const ART = {
    en: /^(?:(the|an|a|to)\s+)/,
    fr: /^(?:(les|le|la|une|un|des)\s+|(l')\s*)/,
    es: /^(?:(los|las|el|la|una|un)\s+)/,
    it: /^(?:(gli|il|lo|la|le|uno|una|un|i)\s+|(l'|un')\s*)/,
    de: /^(?:(der|die|das|den|dem|eine|einen|ein)\s+)/
  };
  const variants = (expected) => String(expected).split(' / ').map((v) => v.replace(/\s*\([^)]*\)/g, '').replace(/\.\.\.$/, '').trim()).filter(Boolean);
  const artOf = (s, code) => { const m = ART[code] && s.match(ART[code]); return m ? (m[1] || m[2] || '') : ''; };
  const strip = (s, code) => (ART[code] ? s.replace(ART[code], '') : s).trim();
  /* Επιστρέφει { ok, grade (0-3), note } */
  const answer = (input, expected, code) => {
    const ni = G.U.norm(input);
    if (!ni) return { ok: false, grade: 0, note: '' };
    const vs = variants(expected);
    for (const v of vs) { if (ni === G.U.norm(v)) return { ok: true, grade: 2, note: '' }; }
    const A = G.U.stripAccents;
    let best = null;
    for (const v of vs) {
      const nv = G.U.norm(v), sv = strip(nv, code), si = strip(ni, code);
      const av = artOf(nv, code), ai = artOf(ni, code);
      const needArt = av && code !== 'en';
      const artWrong = needArt && ai && ai !== av;
      const artMissing = needArt && !ai;
      let wordGrade = -1, wordNote = '';
      if (si === sv) wordGrade = 2;
      else if (A(si) === A(sv)) { wordGrade = 1; wordNote = 'Πρόσεξε τους τόνους/τα σημάδια'; }
      else {
        const d = G.U.lev(A(si), A(sv));
        if ((sv.length > 4 && d <= 1) || (sv.length > 10 && d <= 2)) { wordGrade = 1; wordNote = 'Σχεδόν! Πρόσεξε την ορθογραφία'; }
      }
      if (wordGrade < 0) continue;
      let r;
      if (artWrong) r = { ok: false, grade: 0, note: `Λάθος άρθρο — σωστό: «${v}»` };
      else if (artMissing) r = { ok: true, grade: 1, note: `${wordNote ? wordNote + '. ' : 'Σωστό! '}Μάθε το μαζί με το άρθρο: «${v}»` };
      else if (wordGrade === 2) r = { ok: true, grade: 2, note: '' };
      else r = { ok: true, grade: 1, note: `${wordNote}: «${v}»` };
      if (!best || r.grade > best.grade || (r.ok && !best.ok)) best = r;
    }
    return best || { ok: false, grade: 0, note: '' };
  };
  /* Σύγκριση προφοράς: παίρνει την καλύτερη εναλλακτική της αναγνώρισης */
  const speech = (alts, expected) => {
    let best = 0;
    for (const a of alts || []) for (const v of variants(expected)) best = Math.max(best, G.U.similarity(a, v));
    return best;
  };
  return { answer, speech, variants, strip };
})();
