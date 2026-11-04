/* Εργαστήριο λόγου: αυτοσχέδιες ομιλίες, ανάλυση ομιλίας/κειμένου, άρθρωση. */
window.G = window.G || {};
G.Lab = (() => {
  const h = G.U.esc;
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const countPhrase = (text, phrase) => {
    phrase = G.U.words(phrase).join(' '); // ίδια κανονικοποίηση με το κείμενο (απόστροφοι, πεζά)
    if (!phrase) return 0;
    try { const re = new RegExp('(?<![\\p{L}])' + reEsc(phrase) + '(?![\\p{L}])', 'giu'); return (text.match(re) || []).length; }
    catch (e) { return text.split(phrase).length - 1; }
  };
  const stem = (a, b) => { a = G.U.stripAccents(a); b = G.U.stripAccents(b); let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++; return k; };

  /* ---------------------------------------------------- Ανάλυση */
  const analyze = (text, code, sec) => {
    const toks = G.U.words(text), n = toks.length;
    const low = ' ' + toks.join(' ') + ' ';
    const minutes = sec ? sec / 60 : 0;
    const wpm = minutes ? Math.round(n / minutes) : 0;
    const fillers = {}; let fc = 0;
    for (const f of (G.FILLERS[code] || [])) { const c = countPhrase(low, f); if (c) { fillers[f] = c; fc += c; } }
    const fpm = minutes ? fc / minutes : (n ? fc / (n / 140) : 0);
    // MATTR (κινητός λόγος τύπων/λεκτικών μονάδων) — σταθερό μέτρο ποικιλίας ανεξάρτητα από το μήκος
    const W = 40; let mattr = 0;
    if (n >= W) { let s = 0; for (let i = 0; i + W <= n; i++) s += new Set(toks.slice(i, i + W)).size / W; mattr = s / (n - W + 1); }
    else mattr = n ? new Set(toks).size / n : 0;
    const stop = new Set((G.STOP[code] || '').split(','));
    const freq = {}; for (const t of toks) if (t.length >= 4 && !stop.has(t)) freq[t] = (freq[t] || 0) + 1;
    const repeated = Object.entries(freq).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const res = { n, sec, wpm, fc, fillers, fpm, mattr, repeated, code };
    if (code === 'el') {
      const conn = {}; let connN = 0;
      for (const fn in G.GR.connectors) for (const c of G.GR.connectors[fn]) { const k = countPhrase(low, c.toLowerCase()); if (k) { conn[fn] = (conn[fn] || 0) + k; connN += k; } }
      res.conn = conn; res.connFns = Object.keys(conn).length;
      const rich = new Set();
      for (const v of G.C.greek('v')) { const need = Math.max(5, v.w.length - 3); if (toks.some((t) => stem(t, v.w) >= need)) rich.add(v.w); }
      for (const v of G.C.greek('i')) { const p = v.w.split('…')[0].trim().toLowerCase(); if (p.length > 4 && countPhrase(low, p)) rich.add(v.w); }
      res.rich = [...rich];
      const sugg = [];
      for (const [forms, alt] of G.GR.thesaurus) { const c = toks.filter((t) => forms.includes(t)).length; if (c >= 2) sugg.push([forms[0], c, alt]); }
      res.sugg = sugg.sort((a, b) => b[1] - a[1]).slice(0, 5);
    }
    // Βαθμολογία
    const [lo, hi] = code === 'el' ? [120, 165] : [85, 150];
    const pace = !sec ? null : wpm >= lo && wpm <= hi ? 100 : Math.max(0, 100 - (wpm < lo ? lo - wpm : wpm - hi) * 1.6);
    const flu = Math.max(0, 100 - fpm * 14);
    const div = G.U.clamp(((mattr - 0.55) / 0.2) * 60 + 40, 0, 100);
    let score;
    if (code === 'el') {
      const str = [20, 45, 70, 90, 100][Math.min(4, res.connFns)];
      const rch = [30, 60, 80, 100][Math.min(3, res.rich.length)];
      res.parts = { pace, flu, div, str, rch };
      score = pace == null ? flu * 0.3 + div * 0.3 + str * 0.2 + rch * 0.2 : pace * 0.2 + flu * 0.3 + div * 0.2 + str * 0.15 + rch * 0.15;
    } else {
      res.parts = { pace, flu, div };
      score = pace == null ? flu * 0.5 + div * 0.5 : pace * 0.3 + flu * 0.35 + div * 0.35;
    }
    res.score = Math.round(score);
    return res;
  };

  const feedback = (r) => {
    const out = [];
    if (r.n < 40) out.push(['⚠️', `Μόνο ${r.n} λέξεις — για αξιόπιστη ανάλυση χρειάζονται τουλάχιστον 60–80. Μίλα για όλο τον χρόνο.`]);
    if (r.sec) {
      const [lo, hi] = r.code === 'el' ? [120, 165] : [85, 150];
      if (r.wpm < lo) out.push(['🐢', `Ρυθμός ${r.wpm} λέξεις/λεπτό — λίγο αργός. ${r.code === 'el' ? 'Στόχος 130–160.' : 'Σε ξένη γλώσσα είναι φυσιολογικό· στόχος 90–140.'} Αν «κολλάς» για να σκεφτείς, χρησιμοποίησε τη δομή PREP.`]);
      else if (r.wpm > hi) out.push(['🐇', `Ρυθμός ${r.wpm} λέξεις/λεπτό — γρήγορος. Κάνε συνειδητές παύσεις πριν από τα σημαντικά σημεία.`]);
      else out.push(['✅', `Ρυθμός ${r.wpm} λέξεις/λεπτό — άνετος και ευχάριστος.`]);
    }
    if (r.fc) {
      const top = Object.entries(r.fillers).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([f, c]) => `«${f}» ×${c}`).join(', ');
      out.push([r.fpm > 4 ? '🟥' : r.fpm > 2 ? '🟧' : '🟩', `Γεμίσματα: ${r.fc} (${r.fpm.toFixed(1)}/λεπτό) — ${top}. Αντικατέστησέ τα με σιωπή: η παύση δείχνει σιγουριά.`]);
    } else if (r.n >= 40) out.push(['🏅', 'Κανένα γέμισμα δεν εντοπίστηκε. (Η αναγνώριση φωνής συχνά «σβήνει» τα «εεε» — άκου και μια ηχογράφησή σου για πλήρη εικόνα.)']);
    out.push([r.mattr >= 0.72 ? '✅' : r.mattr >= 0.62 ? '🟧' : '🟥', `Ποικιλία λεξιλογίου (MATTR): ${(r.mattr * 100).toFixed(0)}%. ${r.mattr >= 0.72 ? 'Πλούσιο λεξιλόγιο!' : 'Επαναλαμβάνεις αρκετές λέξεις — δοκίμασε συνώνυμα.'}`]);
    if (r.repeated.length) out.push(['🔁', 'Συχνές επαναλήψεις: ' + r.repeated.map(([w, c]) => `«${w}» ×${c}`).join(', ')]);
    if (r.code === 'el') {
      if (r.sugg && r.sugg.length) r.sugg.forEach(([w, c, alt]) => out.push(['💡', `Αντί για «${w}» (×${c}) δοκίμασε: ${alt}`]));
      out.push([r.connFns >= 3 ? '✅' : '🧱', r.connFns ? `Δομή: χρησιμοποίησες συνδετικά για ${r.connFns} λειτουργίες (${Object.keys(r.conn).join(', ')}).${r.connFns < 3 ? ' Πρόσθεσε π.χ. αντίθεση («ωστόσο») ή συμπέρασμα («επομένως»).' : ''}` : 'Δεν εντοπίστηκαν συνδετικές λέξεις — ο λόγος ακούγεται σαν λίστα. Χρησιμοποίησε «κατ\' αρχάς», «ωστόσο», «επομένως», «εν κατακλείδι».']);
      out.push([r.rich.length >= 2 ? '✅' : '📚', r.rich.length ? `Λόγιο λεξιλόγιο που χρησιμοποίησες: ${r.rich.map((w) => `«${w}»`).join(', ')}` : 'Δεν χρησιμοποίησες λέξεις από το λόγιο λεξιλόγιό σου. Διάλεξε 2–3 πριν ξεκινήσεις και βάλε τες στόχο.']);
    }
    return out;
  };

  const ring = (score) => {
    const c = 2 * Math.PI * 42, off = c * (1 - score / 100);
    const col = score >= 80 ? 'var(--ok)' : score >= 60 ? 'var(--warn)' : 'var(--bad)';
    return `<svg viewBox="0 0 100 100" class="ring"><circle cx="50" cy="50" r="42" class="trk"/><circle cx="50" cy="50" r="42" style="stroke:${col}" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 50 50)"/><text x="50" y="57" text-anchor="middle">${score}</text></svg>`;
  };
  const sparkline = (vals) => {
    if (vals.length < 2) return '';
    const w = 280, hh = 60, max = 100, step = w / (vals.length - 1);
    const pts = vals.map((v, i) => `${(i * step).toFixed(1)},${(hh - (v / max) * hh).toFixed(1)}`).join(' ');
    return `<svg viewBox="-4 -4 ${w + 8} ${hh + 8}" class="spark"><polyline points="${pts}" fill="none" stroke="var(--pri)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${vals.map((v, i) => `<circle cx="${(i * step).toFixed(1)}" cy="${(hh - (v / max) * hh).toFixed(1)}" r="3" fill="var(--pri)"/>`).join('')}</svg>`;
  };

  const report = (root, r, meta) => {
    const parts = r.parts, lbl = { pace: 'Ρυθμός', flu: 'Ροή (χωρίς γεμίσματα)', div: 'Ποικιλία', str: 'Δομή', rch: 'Λόγιο λεξιλόγιο' };
    const hist = G.S.speeches.filter((s) => s.code === r.code).slice(-12).map((s) => s.score);
    root.innerHTML = `<div class="page">
      <div class="row between"><h2>Ανάλυση λόγου</h2><button class="btn ghost sm back">✕</button></div>
      ${meta.topic ? `<div class="muted small">Θέμα: ${h(meta.topic)}</div>` : ''}
      <div class="scorebox">${ring(r.score)}<div class="parts">${Object.keys(parts).filter((k) => parts[k] != null).map((k) => `<div class="bar"><span>${lbl[k]}</span><div><i style="width:${Math.round(parts[k])}%"></i></div><b>${Math.round(parts[k])}</b></div>`).join('')}</div></div>
      <div class="stats3"><div><b>${r.n}</b><span>λέξεις</span></div><div><b>${r.sec ? r.wpm : '—'}</b><span>λέξεις/λεπτό</span></div><div><b>${r.fc}</b><span>γεμίσματα</span></div></div>
      <h3>Τι να βελτιώσεις</h3>
      <ul class="list fb-list">${feedback(r).map(([i, t]) => `<li><span>${i}</span><span>${h(t)}</span></li>`).join('')}</ul>
      ${meta.audio ? `<h3>Άκου τον εαυτό σου</h3><audio controls src="${meta.audio}" style="width:100%"></audio><p class="muted small">Μέτρα μόνος σου τα «εεε» και πρόσεξε πού ανεβαίνει ή πέφτει η ένταση.</p>` : ''}
      ${meta.text ? `<details><summary>Κείμενο που αναλύθηκε</summary><p class="transcript">${h(meta.text)}</p></details>` : ''}
      ${hist.length >= 2 ? `<h3>Η πορεία σου</h3>${sparkline(hist)}` : ''}
      <div class="col gap"><button class="btn primary wide again">Νέα ομιλία</button><button class="btn ghost wide back2">Πίσω στο εργαστήριο</button></div></div>`;
    root.querySelector('.back').addEventListener('click', () => { location.hash = '#/lab'; });
    root.querySelector('.back2').addEventListener('click', () => { location.hash = '#/lab'; });
    root.querySelector('.again').addEventListener('click', () => { state.topic = null; location.hash = '#/lab'; G.App.render(); });
  };

  /* ---------------------------------------------------- Οθόνες */
  const state = { topic: null, challenge: null, dur: 90, code: null, mode: 'analyze' };
  const newTopic = () => { state.topic = G.U.pick(G.GR.topics); state.challenge = Math.random() < 0.7 ? G.U.pick(G.GR.challenges) : null; };

  const renderHome = (root) => {
    state.code = state.code || G.S.current || 'el';
    if (!state.topic) newTopic();
    const code = state.code, sr = G.Speech.srSupported;
    const hist = G.S.speeches.filter((s) => s.code === code);
    const last = hist.slice(-12).map((s) => s.score);
    root.innerHTML = `<div class="page">
      <h2>🎤 Εργαστήριο λόγου</h2>
      <div class="chips langchips">${G.LANG_ORDER.map((c) => `<button class="chip ${c === code ? 'on' : ''}" data-c="${c}">${G.LANGS[c].flag} ${h(G.LANGS[c].name)}</button>`).join('')}</div>
      <div class="card topic">
        <div class="tag">Αυτοσχέδιος λόγος${code !== 'el' ? ` · μίλα στα ${h(G.LANGS[code].name)}` : ''}</div>
        <h3>${h(state.topic)}</h3>
        ${state.challenge ? `<div class="challenge">🎯 ${h(state.challenge)}</div>` : ''}
        <button class="btn ghost sm shuffle">🔀 Άλλο θέμα</button>
      </div>
      <div class="row center chips">${[60, 90, 120].map((d) => `<button class="chip ${d === state.dur ? 'on' : ''}" data-d="${d}">${d}″</button>`).join('')}</div>
      <div class="row center chips">${sr ? `<button class="chip ${state.mode === 'analyze' ? 'on' : ''}" data-m="analyze">📊 Ανάλυση</button>` : ''}<button class="chip ${state.mode === 'record' || !sr ? 'on' : ''}" data-m="record">⏺️ Ηχογράφηση</button></div>
      <p class="muted small center">${state.mode === 'analyze' && sr ? 'Αναγνώριση φωνής → ρυθμός, γεμίσματα, λεξιλόγιο, δομή. (Χρειάζεται internet στα περισσότερα κινητά.)' : 'Ηχογράφηση για να ακούσεις τον εαυτό σου — λειτουργεί και χωρίς internet.'}</p>
      <button class="btn primary wide big start">▶ Ξεκίνα (15″ προετοιμασία)</button>
      <div class="grid2">
        <button class="tilebtn text"><span>📝</span>Ανάλυσε γραπτό κείμενο</button>
        ${code === 'el' ? '<button class="tilebtn twist"><span>👄</span>Άρθρωση · γλωσσοδέτες</button>' : `<button class="tilebtn shadow"><span>🔁</span>Shadowing προτάσεων</button>`}
      </div>
      ${last.length >= 2 ? `<h3>Η πορεία σου (${hist.length} ομιλίες)</h3>${sparkline(last)}` : hist.length ? `<p class="muted small">Τελευταίο σκορ: ${hist[hist.length - 1].score}</p>` : ''}
      ${code === 'el' ? '<details class="card"><summary>📘 Γρήγορος οδηγός: η δομή PREP</summary><p><b>Θέση</b> → <b>Αιτιολόγηση</b> → <b>Παράδειγμα</b> → <b>Θέση ξανά</b>. Στις 15″ προετοιμασίας: διάλεξε θέση, ένα «γιατί» και ένα παράδειγμα. Τίποτε άλλο.</p></details>' : ''}
    </div>`;
    root.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { state.code = b.dataset.c; renderHome(root); }));
    root.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => { state.dur = +b.dataset.d; renderHome(root); }));
    root.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { state.mode = b.dataset.m; renderHome(root); }));
    root.querySelector('.shuffle').addEventListener('click', () => { newTopic(); renderHome(root); });
    root.querySelector('.start').addEventListener('click', () => record(root));
    root.querySelector('.text').addEventListener('click', () => textMode(root));
    const tw = root.querySelector('.twist'); if (tw) tw.addEventListener('click', () => twisters(root, 0));
    const sh = root.querySelector('.shadow'); if (sh) sh.addEventListener('click', () => { const ids = G.C.allSents(code).filter((s) => G.S.cards[s.id]).map((s) => s.id); const pool = ids.length >= 3 ? ids : G.C.allSents(code).filter((s) => G.C.lvIdx(s.lvl) <= Math.max(0, G.C.lvIdx(G.Store.lang(code).level))).map((s) => s.id); G.Run.start({ steps: G.U.sample(pool, 8).map((id) => ({ t: 'speak', id })), code, title: 'Shadowing' }); });
  };

  let timer = null, rec = null, media = null;
  const cleanup = () => { clearInterval(timer); timer = null; if (rec) { try { rec.stop(); } catch (e) {} rec = null; } if (media) { try { media.stream.getTracks().forEach((t) => t.stop()); } catch (e) {} media = null; } };

  const record = (root) => {
    const code = state.code, useSR = state.mode === 'analyze' && G.Speech.srSupported;
    let prep = 15;
    root.innerHTML = `<div class="page center rec">
      <div class="tag">Προετοιμασία</div><h3>${h(state.topic)}</h3>${state.challenge ? `<div class="challenge">🎯 ${h(state.challenge)}</div>` : ''}
      <div class="bigtimer">${prep}</div><p class="muted">Σκέψου: θέση · ένα γιατί · ένα παράδειγμα</p>
      <button class="btn primary wide go">Είμαι έτοιμος — μιλάω!</button><button class="btn ghost wide cancel">Ακύρωση</button></div>`;
    const go = () => { clearInterval(timer); speak(root, code, useSR); };
    root.querySelector('.go').addEventListener('click', go);
    root.querySelector('.cancel').addEventListener('click', () => { cleanup(); renderHome(root); });
    timer = setInterval(() => { prep--; const el = root.querySelector('.bigtimer'); if (el) el.textContent = prep; if (prep <= 0) go(); }, 1000);
  };

  const speak = async (root, code, useSR) => {
    cleanup();
    let left = state.dur; const t0 = Date.now(); let chunks = [], audioUrl = null;
    root.innerHTML = `<div class="page center rec">
      <div class="tag live">● Ζωντανά</div><h3>${h(state.topic)}</h3>
      <div class="bigtimer">${G.U.fmtDur(left)}</div>
      <div class="transcript live">${useSR ? '<span class="muted">Μίλα… το κείμενο θα εμφανίζεται εδώ</span>' : '<span class="muted">⏺️ Ηχογραφώ…</span>'}</div>
      <button class="btn primary wide stop">■ Τέλος</button></div>`;
    const tr = root.querySelector('.transcript');
    if (useSR) {
      rec = G.Speech.listenLong(code, (txt, err) => {
        if (err) { tr.innerHTML = '<b>Δεν δόθηκε άδεια μικροφώνου.</b> Ενεργοποίησέ την από τις ρυθμίσεις του browser.'; return; }
        tr.textContent = txt; tr.scrollTop = tr.scrollHeight;
      });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream); media = mr;
        mr.ondataavailable = (e) => chunks.push(e.data);
        mr.start();
      } catch (e) { tr.innerHTML = '<b>Δεν ήταν δυνατή η ηχογράφηση.</b> Έλεγξε την άδεια μικροφώνου. Μπορείς να συνεχίσεις μόνο με χρονόμετρο.'; }
    }
    const finish = async () => {
      clearInterval(timer); timer = null;
      const sec = Math.max(1, Math.round((Date.now() - t0) / 1000));
      let text = '';
      if (rec) { text = rec.stop(); rec = null; }
      if (media) {
        await new Promise((res) => { media.onstop = res; try { media.stop(); } catch (e) { res(); } });
        try { media.stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
        media = null;
        if (chunks.length) audioUrl = URL.createObjectURL(new Blob(chunks, { type: chunks[0].type || 'audio/webm' }));
      }
      if (useSR) {
        if (!text.trim()) { root.innerHTML = `<div class="page center"><h3>Δεν καταγράφηκε κείμενο</h3><p class="muted">Η αναγνώριση φωνής χρειάζεται συνήθως σύνδεση στο internet και άδεια μικροφώνου. Δοκίμασε τη λειτουργία «Ηχογράφηση».</p><button class="btn primary wide b">Πίσω</button></div>`; root.querySelector('.b').addEventListener('click', () => renderHome(root)); return; }
        const r = analyze(text, code, sec);
        G.S.speeches.push({ d: Date.now(), code, topic: state.topic, sec, n: r.n, wpm: r.wpm, fpm: +r.fpm.toFixed(2), mattr: +r.mattr.toFixed(3), score: r.score });
        if (G.S.speeches.length > 200) G.S.speeches.shift();
        G.Store.addXp(code, 15 + Math.round(r.score / 10));
        G.Store.today().sec += sec; G.Store.save();
        report(root, r, { topic: state.topic, text });
      } else {
        G.Store.addXp(code, 10); G.Store.today().sec += sec; G.Store.save();
        root.innerHTML = `<div class="page"><h2>Άκου τον εαυτό σου</h2><p class="muted small">Θέμα: ${h(state.topic)} · ${G.U.fmtDur(sec)}</p>
          ${audioUrl ? `<audio controls src="${audioUrl}" style="width:100%"></audio>` : '<p>Δεν υπάρχει ηχογράφηση.</p>'}
          <h3>Αυτοαξιολόγηση</h3><ul class="list check">${['Ξεκίνησα δυνατά (ερώτηση, ιστορία, στοιχείο)', 'Είχα σαφή θέση και παράδειγμα', 'Έκανα παύσεις αντί για «εεε»', 'Χρησιμοποίησα συνδετικές λέξεις', 'Άλλαζα ρυθμό και ένταση', 'Έκλεισα με σύνοψη ή κάλεσμα σε δράση'].map((x) => `<li><label><input type="checkbox"> ${h(x)}</label></li>`).join('')}</ul>
          <div class="col gap"><button class="btn primary wide again">Ξανά, καλύτερα!</button><button class="btn ghost wide b">Πίσω</button></div></div>`;
        root.querySelector('.again').addEventListener('click', () => record(root));
        root.querySelector('.b').addEventListener('click', () => renderHome(root));
      }
    };
    root.querySelector('.stop').addEventListener('click', finish);
    timer = setInterval(() => { left--; const el = root.querySelector('.bigtimer'); if (el) el.textContent = G.U.fmtDur(Math.max(0, left)); if (left <= 10 && el) el.classList.add('warn'); if (left <= 0) finish(); }, 1000);
  };

  const textMode = (root) => {
    const code = state.code;
    root.innerHTML = `<div class="page"><div class="row between"><h2>📝 Ανάλυση κειμένου</h2><button class="btn ghost sm back">✕</button></div>
      <p class="muted small">Επικόλλησε ένα email, μια ανάρτηση ή το κείμενο μιας ομιλίας σου (${h(G.LANGS[code].name)}). Θα δεις ποικιλία λεξιλογίου, επαναλήψεις, γεμίσματα${code === 'el' ? ', δομή και προτάσεις για πλουσιότερες λέξεις' : ''}.</p>
      <textarea class="inp area tall" placeholder="Γράψε ή επικόλλησε εδώ…"></textarea>
      <button class="btn primary wide go">Ανάλυση</button></div>`;
    root.querySelector('.back').addEventListener('click', () => renderHome(root));
    root.querySelector('.go').addEventListener('click', () => {
      const t = root.querySelector('.area').value.trim(); if (!t) return;
      const r = analyze(t, code, 0); report(root, r, { text: t });
    });
  };

  const twisters = (root, i) => {
    const list = G.GR.twisters, t = list[i % list.length];
    root.innerHTML = `<div class="page"><div class="row between"><h2>👄 Άρθρωση</h2><button class="btn ghost sm back">✕</button></div>
      <p class="muted small">Πες το αργά και καθαρά 2 φορές, μετά όλο και πιο γρήγορα. Υπερβολική κίνηση χειλιών — σαν να σε βλέπουν από μακριά.</p>
      <div class="card twister"><div class="l2">${h(t)}</div><div class="row center">${G.EX.say(t, 'el', 'lg')}${G.EX.slow(t, 'el')}</div></div>
      ${G.Speech.srSupported ? '<button class="mic" type="button">🎤</button><div class="heard muted center">Πάτα και πες το</div>' : '<p class="muted small center">Η αναγνώριση φωνής δεν υποστηρίζεται· εξασκήσου δυνατά με το πρότυπο.</p>'}
      <div class="row"><button class="btn ghost prev">← Προηγούμενο</button><button class="btn primary next">Επόμενο →</button></div></div>`;
    root.querySelector('.back').addEventListener('click', () => { location.hash = '#/lab'; renderHome(root); });
    root.querySelector('.next').addEventListener('click', () => twisters(root, i + 1));
    root.querySelector('.prev').addEventListener('click', () => twisters(root, (i - 1 + list.length) % list.length));
    const mic = root.querySelector('.mic');
    if (mic) mic.addEventListener('click', async () => {
      if (mic.classList.contains('on')) return;
      mic.classList.add('on'); const heard = root.querySelector('.heard'); heard.textContent = 'Ακούω…';
      const t0 = Date.now(); const r = await G.Speech.listenOnce('el', { timeout: 15000 }); mic.classList.remove('on');
      if (!r || !r.text) { heard.textContent = 'Δεν άκουσα — ξαναδοκίμασε (χρειάζεται internet).'; return; }
      const sim = Math.round(G.Check.speech(r.alts, t) * 100), s = ((Date.now() - t0) / 1000).toFixed(1);
      heard.innerHTML = `Ακρίβεια <b>${sim}%</b> · ${s}″<br><span class="small">«${h(r.text)}»</span>`;
      if (sim >= 85) { G.Store.addXp('el', 5); G.U.tone(true); }
    });
  };

  return { renderHome, analyze, cleanup, sparkline, ring, twisters: (root) => twisters(root, Math.floor(Math.random() * G.GR.twisters.length)) };
})();
