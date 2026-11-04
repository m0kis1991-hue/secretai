/* Ευρετήριο περιεχομένου: μετατρέπει τα δεδομένα σε αντικείμενα με σταθερά IDs. */
window.G = window.G || {};
G.C = (() => {
  const LV = G.LEVELS;
  const lvIdx = (l) => (l === 'A0' || !l ? -1 : LV.indexOf(l));
  const FOREIGN = ['en', 'fr', 'es', 'it', 'de'];
  const cache = {}, index = {};

  const units = (code) => {
    if (cache[code]) return cache[code];
    const col = G.LANG_COLS[code];
    cache[code] = G.UNITS.map((u) => ({
      id: u.id, lvl: u.lvl, t: u.t, e: u.e,
      words: u.w.map((row) => { const p = row.split('|'); return { kind: 'w', code, id: `${code}:w:${G.U.hash(p[0] + '|' + p[1])}`, el: p[0], l2: p[col], en: p[1], emoji: p[6] || '', unit: u.id, lvl: u.lvl }; }),
      sents: u.s.map((row) => { const p = row.split('|'); return { kind: 's', code, id: `${code}:s:${G.U.hash(p[0])}`, el: p[0], l2: p[col], unit: u.id, lvl: u.lvl }; })
    }));
    return cache[code];
  };

  /* Ελληνικά */
  const GR = {};
  const buildGreek = () => {
    GR.v = G.GR.vocab.map((r) => { const p = r.split('|'); return { kind: 'gv', code: 'el', id: 'el:v:' + G.U.hash(p[0]), w: p[0], def: p[1], ex: p[2], syn: p[3], tier: +p[4] || 1 }; });
    GR.i = G.GR.idioms.map((r) => { const p = r.split('|'); return { kind: 'gi', code: 'el', id: 'el:i:' + G.U.hash(p[0]), w: p[0], def: p[1], ex: p[2] }; });
    GR.e = G.GR.errors.map((r) => { const p = r.split('|'); return { kind: 'ge', code: 'el', id: 'el:e:' + G.U.hash(p[0]), right: p[0], wrong: p[1], why: p[2] }; });
    GR.p = G.GR.paronyms.map((r) => { const p = r.split('|'); return { kind: 'gp', code: 'el', id: 'el:p:' + G.U.hash(p[0]), s: p[0], right: p[1], wrongs: [p[2], p[3]], why: p[4] }; });
    GR.c = G.GR.connectorEx.map((r) => { const p = r.split('|'); return { kind: 'gc', code: 'el', id: 'el:c:' + G.U.hash(p[0]), s: p[0], right: p[1], wrongs: [p[2], p[3]] }; });
    GR.d = G.GR.devices.map((r) => { const p = r.split('|'); return { kind: 'gd', code: 'el', id: 'el:d:' + G.U.hash(p[0]), w: p[0], def: p[1], ex: p[2] }; });
  };

  const build = () => {
    for (const c of FOREIGN) for (const u of units(c)) { for (const w of u.words) index[w.id] = w; for (const s of u.sents) index[s.id] = s; }
    buildGreek();
    for (const k in GR) for (const it of GR[k]) index[it.id] = it;
  };
  build();

  const item = (id) => index[id];
  const allWords = (code) => units(code).flatMap((u) => u.words);
  const allSents = (code) => units(code).flatMap((u) => u.sents);
  const unit = (code, id) => units(code).find((u) => u.id === id);

  /* Πρόοδος ενότητας */
  const unitProgress = (u) => {
    const items = u.words;
    let seen = 0, solid = 0;
    for (const w of items) { const c = G.S.cards[w.id]; if (c && !c.s) { seen++; if (c.i >= 7) solid++; } else if (c && c.s && c.r > 0) { seen++; if (c.i >= 7) solid++; } }
    return { seen, solid, total: items.length, pct: items.length ? seen / items.length : 0, mastery: items.length ? solid / items.length : 0 };
  };
  /* Επόμενη προτεινόμενη ενότητα: η πρώτη μη ολοκληρωμένη πάνω από το επίπεδο κατάταξης */
  const nextUnit = (code) => {
    const L = G.Store.lang(code), pi = lvIdx(L.level);
    const us = units(code);
    return us.find((u) => lvIdx(u.lvl) > pi && unitProgress(u).pct < 1) || us.find((u) => unitProgress(u).pct < 1) || us[us.length - 1];
  };

  /* Λέξεις κάτω από το επίπεδο κατάταξης: μπαίνουν ως «πιθανώς γνωστές» με
   * κλιμακωτές επαναλήψεις 2–25 ημερών. Αν τις ξέρεις, απλώς επιβεβαιώνονται·
   * αν όχι, ξαναμαθαίνονται. Έτσι δεν χάνεις χρόνο σε ό,τι ήδη ξέρεις, αλλά ούτε μένουν κενά. */
  const seedKnown = (code) => {
    const pi = lvIdx(G.Store.lang(code).level); if (pi < 0) return 0;
    const words = units(code).filter((u) => lvIdx(u.lvl) <= pi).flatMap((u) => u.words);
    const now = Date.now(); let n = 0;
    G.U.shuffle(words).forEach((w, k) => {
      if (G.S.cards[w.id]) return;
      const days = 2 + (k / words.length) * 23;
      G.S.cards[w.id] = { d: now + days * 86400000, i: 3, e: 2.5, r: 0, l: 0, n: 0, s: 1 };
      n++;
    });
    G.Store.save();
    return n;
  };

  /* Δυσκολότεροι αντιπερισπασμοί: από την ίδια ενότητα πρώτα (θεματικά κοντινοί) */
  const wordDistractors = (w, n = 3, field = 'l2') => {
    const pool = allWords(w.code);
    const same = pool.filter((x) => x.unit === w.unit && x.id !== w.id);
    const other = pool.filter((x) => x.unit !== w.unit && x.lvl === w.lvl);
    const rest = pool.filter((x) => x.id !== w.id);
    const out = [], seenV = new Set([G.U.norm(w[field]), G.U.norm(w.el), G.U.norm(w.l2)]);
    for (const src of [G.U.shuffle(same).slice(0, 2), G.U.shuffle(other), G.U.shuffle(rest)]) {
      for (const x of src) {
        if (out.length >= n) break;
        const k = G.U.norm(x[field]);
        if (seenV.has(k) || seenV.has(G.U.norm(x.el)) || seenV.has(G.U.norm(x.l2))) continue;
        seenV.add(k); out.push(x);
      }
    }
    return out;
  };
  const sentDistractors = (s, n = 3) => {
    const pool = allSents(s.code).filter((x) => x.id !== s.id);
    const near = pool.filter((x) => Math.abs(lvIdx(x.lvl) - lvIdx(s.lvl)) <= 1);
    return G.U.sample(near.length >= n ? near : pool, n);
  };
  const greek = (k) => GR[k];
  const greekDistractors = (it, n, field) => {
    const pool = GR[{ gv: 'v', gi: 'i', gd: 'd' }[it.kind]].filter((x) => x.id !== it.id);
    return G.U.sample(pool, n).map((x) => x[field]);
  };

  return { lvIdx, FOREIGN, units, unit, item, allWords, allSents, unitProgress, nextUnit, seedKnown, wordDistractors, sentDistractors, greek, greekDistractors };
})();
