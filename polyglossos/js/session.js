/* Σύνθεση μαθήματος (ο «δάσκαλος») και εκτέλεση συνεδρίας. */
window.G = window.G || {};
G.Plan = (() => {
  const META = () => G.EX.META;
  const EMOJI_OK = (w) => w.emoji && /^(A1|A2)$/.test(w.lvl) && !['a1-basics', 'a1-time', 'a2-phrases', 'a1-numbers'].includes(w.unit);

  /* Βάρη τρόπων πρόσληψης από το προφίλ. Ελάχιστο 12% για κάθε τρόπο:
   * η έρευνα δείχνει ότι ο συνδυασμός τρόπων αποδίδει καλύτερα για όλους. */
  const modWeights = () => {
    const m = (G.S.profile && G.S.profile.mod) || { V: 0.25, A: 0.25, R: 0.25, K: 0.25 };
    const out = {}; let sum = 0;
    for (const k of 'VARK') { out[k] = Math.max(0.12, m[k] || 0); sum += out[k]; }
    for (const k of 'VARK') out[k] /= sum;
    return out;
  };
  const typeWeight = (t) => { const w = modWeights(), mm = META()[t].m.split(''); let s = 0; for (const c of mm) s += w[c]; return s / mm.length; };
  const weightedPick = (types) => {
    const ws = types.map(typeWeight), tot = ws.reduce((a, b) => a + b, 0);
    let r = Math.random() * tot; for (let i = 0; i < types.length; i++) { r -= ws[i]; if (r <= 0) return types[i]; }
    return types[types.length - 1];
  };
  const available = (item, stage) => {
    const tts = G.Speech.hasTTS(item.code);
    return Object.keys(META()).filter((t) => {
      const m = META()[t];
      if (!m.kind.includes(item.kind)) return false;
      if (m.tts && !tts) return false;
      if (stage === 'recog' && m.stage === 'recall') return false;
      if (stage === 'recall' && m.stage === 'recog' && item.kind === 'w') return false;
      if (t === 'emoji_mc' && !EMOJI_OK(item)) return false;
      if (t === 'dictation_s' && G.C.lvIdx(item.lvl) < 2) return false;
      if (t === 'speak' && G.S.profile && G.S.profile.anxiety && stage === 'recog') return false;
      return true;
    });
  };
  const stageOf = (id) => { const c = G.SRS.get(id); return !c || c.s || c.r < 2 ? 'recog' : 'recall'; };
  const pickType = (item, stage) => weightedPick(available(item, stage || stageOf(item.id)));

  /* Σειρά με «απόσταση»: η ανάκληση μιας νέας λέξης μπαίνει 2–4 βήματα μετά την παρουσίασή της */
  const weave = (reviews, fresh) => {
    const q = []; const later = [];
    let ri = 0, fi = 0;
    while (ri < reviews.length || fi < fresh.length || later.length) {
      for (let k = later.length - 1; k >= 0; k--) if (later[k].at <= q.length) { q.push(later[k].step); later.splice(k, 1); }
      const takeNew = fi < fresh.length && (ri >= reviews.length || q.length % 3 !== 1);
      if (takeNew) { const f = fresh[fi++]; q.push(f.intro); (f.follow || []).forEach((s, j) => later.push({ at: q.length + 2 + j * 3, step: s })); }
      else if (ri < reviews.length) q.push(reviews[ri++]);
      else if (later.length) { later.sort((a, b) => a.at - b.at); q.push(later.shift().step); }
    }
    return q;
  };
  const sizeOf = () => (G.S.profile && G.S.profile.size) || 15;

  /* Ομαδοποίηση: αν υπάρχουν ≥4 επαναλήψεις λέξεων αναγνώρισης, κάποιες γίνονται «αντιστοίχιση» */
  const maybeMatch = (steps, code) => {
    const freshIds = new Set(steps.filter((s) => s.isNew).map((s) => s.id));
    const recog = steps.filter((s) => s.id && !freshIds.has(s.id) && G.S.cards[s.id] && G.C.item(s.id) && G.C.item(s.id).kind === 'w' && META()[s.t] && META()[s.t].stage !== 'recall');
    if (recog.length < 5 || Math.random() > 0.35 + modWeights().V) return steps;
    const pickIds = recog.slice(0, 5).map((s) => s.id);
    const rest = steps.filter((s) => !pickIds.includes(s.id));
    rest.splice(Math.min(2, rest.length), 0, { t: 'match', ids: pickIds, code });
    return rest;
  };

  /* ---------- Ξένη γλώσσα ---------- */
  const foreign = (code, { mode = 'daily', unitId = null } = {}) => {
    const N = sizeOf();
    const L = G.Store.lang(code);
    const u = unitId ? G.C.unit(code, unitId) : G.C.nextUnit(code);
    const due = G.SRS.dueIds(code + ':');
    const steps = [];
    const reviewCap = mode === 'review' ? N : mode === 'unit' ? Math.round(N * 0.3) : Math.round(N * 0.6);
    const reviews = due.slice(0, reviewCap).map((id) => { const it = G.C.item(id); return it ? { t: pickType(it), id } : null; }).filter(Boolean);
    const fresh = [];
    if (mode !== 'review' && u) {
      const dailyNew = G.Store.today().newItems;
      const newCap = Math.max(0, Math.min(N - reviews.length, (G.S.profile && G.S.profile.newPerSession) || 7, 25 - dailyNew));
      const newWords = u.words.filter((w) => G.SRS.isNew(w.id)).slice(0, newCap);
      for (const w of newWords) fresh.push({ intro: { t: 'intro', id: w.id, isNew: 1 }, follow: [{ t: pickType(w, 'recog'), id: w.id }] });
      /* Προτάσεις της ενότητας: όταν έχεις δει τις περισσότερες λέξεις της */
      const prog = G.C.unitProgress(u);
      if (prog.seen + newWords.length >= Math.ceil(u.words.length * 0.6)) {
        const sents = u.sents.filter((s) => G.SRS.isNew(s.id)).slice(0, 2);
        for (const s of sents) fresh.push({ intro: { t: pickType(s, 'recog'), id: s.id, isNew: 1 }, follow: [{ t: pickType(s, 'recall'), id: s.id }] });
      }
      /* Γραμματική του επιπέδου */
      const gram = (G.GRAMMAR[code] || []).filter((g) => g.lvl === u.lvl && !L.grammarSeen.includes(g.t));
      if (gram.length && (mode === 'unit' || Math.random() < 0.6)) {
        const g = gram[0], explicit = !G.S.profile || G.S.profile.grammar !== 'implicit';
        const qs = g.q.map((q) => ({ t: 'quiz', q, code, label: g.t }));
        const block = [{ t: 'grammar', g, code }, ...qs];
        if (explicit) steps.push(...block); else steps._tail = block; // επαγωγικά: πρώτα παραδείγματα, μετά ο κανόνας
      }
    }
    let q = weave(reviews, fresh);
    if (!q.length && mode !== 'review') { // όλα έτοιμα — εξάσκηση με τις πιο «αδύναμες» κάρτες
      const weak = Object.keys(G.S.cards).filter((k) => k.startsWith(code + ':')).sort((a, b) => G.SRS.retention(a) - G.SRS.retention(b)).slice(0, N);
      q = weak.map((id) => ({ t: pickType(G.C.item(id)), id })).filter((s) => G.C.item(s.id));
    }
    q = maybeMatch(q, code);
    const all = [...steps, ...q, ...(steps._tail || [])];
    return { steps: all, code, title: mode === 'review' ? 'Επανάληψη' : u ? `${u.e} ${u.t}` : 'Μάθημα', unitId: u && u.id };
  };

  const grammarSession = (code, g) => ({ steps: [{ t: 'grammar', g, code }, ...g.q.map((q) => ({ t: 'quiz', q, code, label: g.t }))], code, title: g.t });

  /* ---------- Ελληνικά ---------- */
  const GTYPES = {
    gv: { intro: 'g_intro', recog: ['g_def2word', 'g_word2def', 'g_cloze'], recall: ['g_cloze', 'g_def2word', 'g_use', 'g_word2def'] },
    gi: { intro: 'i_intro', recog: ['i_meaning'], recall: ['i_reverse', 'i_meaning'] },
    ge: { intro: null, recog: ['e_choose'], recall: ['e_choose'] },
    gp: { intro: null, recog: ['p_choose'], recall: ['p_choose'] },
    gc: { intro: null, recog: ['c_choose'], recall: ['c_choose'] },
    gd: { intro: 'd_intro', recog: ['d_identify', 'd_define'], recall: ['d_identify', 'd_define'] }
  };
  const gType = (it) => { const T = GTYPES[it.kind], st = stageOf(it.id); let list = T[st]; if (list.includes('g_use') && Math.random() > 0.35 + modWeights().K) list = list.filter((t) => t !== 'g_use'); return G.U.pick(list); };
  const greek = ({ focus = null } = {}) => {
    const N = sizeOf();
    const tier = Math.max(1, (G.Store.lang('el').ntier || 1));
    const prefix = focus ? `el:${focus}:` : 'el:';
    const due = G.SRS.dueIds(prefix).filter((id) => G.C.item(id));
    const reviews = due.slice(0, focus ? N : Math.round(N * 0.55)).map((id) => ({ t: gType(G.C.item(id)), id }));
    const want = focus ? { [focus]: N - reviews.length } : { v: 3, i: 2, e: 1, p: 1, c: 1, d: 1 };
    const fresh = [];
    let budget = N - reviews.length;
    for (const k in want) {
      let pool = G.C.greek(k).filter((x) => G.SRS.isNew(x.id));
      if (k === 'v') { pool = pool.filter((x) => x.tier <= tier + 1).sort((a, b) => a.tier - b.tier); if (tier >= 2) pool = G.U.shuffle(pool); }
      else pool = G.U.shuffle(pool);
      for (const it of pool.slice(0, Math.min(want[k], budget))) {
        const T = GTYPES[it.kind];
        if (T.intro) fresh.push({ intro: { t: T.intro, id: it.id, isNew: 1 }, follow: [{ t: G.U.pick(T.recog), id: it.id }] });
        else fresh.push({ intro: { t: T.recog[0], id: it.id, isNew: 1 }, follow: [] });
        budget--;
      }
    }
    let q = weave(G.U.shuffle(reviews), fresh);
    if (!q.length) q = G.U.sample(Object.keys(G.S.cards).filter((k) => k.startsWith(prefix) && G.C.item(k)), N).map((id) => ({ t: gType(G.C.item(id)), id }));
    const names = { v: 'Λόγιο λεξιλόγιο', i: 'Λόγιες εκφράσεις', e: 'Συχνά λάθη', p: 'Παρώνυμα', c: 'Συνδετικές λέξεις', d: 'Σχήματα λόγου' };
    return { steps: q, code: 'el', title: focus ? names[focus] : '🇬🇷 Καθημερινό μάθημα Ελληνικών' };
  };

  return { foreign, greek, grammarSession, pickType, modWeights };
})();

/* =================================================== Εκτέλεση συνεδρίας */
G.Run = (() => {
  let R = null;
  const start = (plan) => {
    if (!plan.steps.length) { G.toast('Δεν υπάρχει κάτι για εξάσκηση τώρα — έλα αργότερα! 🎉'); return; }
    R = Object.assign({ i: 0, xp: 0, ok: 0, n: 0, t0: Date.now(), wrong: [], retried: {}, practiced: new Set() }, plan);
    G.go('#/session');
  };
  const active = () => !!R;
  const render = (root) => {
    if (!R) { location.hash = '#/home'; return; }
    if (R.i >= R.steps.length) return finish(root);
    const st = R.steps[R.i];
    const pct = Math.round((R.i / R.steps.length) * 100);
    root.innerHTML = `<div class="session">
      <header class="sbar"><button class="x" aria-label="Κλείσιμο">✕</button><div class="progress"><i style="width:${pct}%"></i></div><span class="xpchip">⚡${R.xp}</span></header>
      <main class="ex"></main><footer class="fb"></footer></div>`;
    root.querySelector('.x').addEventListener('click', () => { if (R.n === 0 || confirm('Να σταματήσει το μάθημα; Η πρόοδος των απαντήσεων έχει αποθηκευτεί.')) { saveTime(); R = null; location.hash = '#/home'; } });
    const ex = root.querySelector('.ex'), fb = root.querySelector('.fb');
    const item = st.id ? G.C.item(st.id) : null;
    const ctx = {
      item,
      next: (xp = 0) => { R.xp += xp; if (xp) G.Store.addXp(R.code, xp); if (st.isNew && item) { G.Store.today().newItems++; } R.i++; render(root); },
      answer: (res) => onAnswer(root, st, item, res),
      answerGroup: (list) => {
        list.forEach((x) => { G.SRS.grade(x.id, x.grade); R.practiced.add(x.id); });
        const xp = list.length * 4; R.xp += xp; R.n += list.length; R.ok += list.filter((x) => x.grade >= 2).length; G.Store.addXp(R.code, xp);
        const t = G.Store.today(); t.answers += list.length; t.correct += list.filter((x) => x.grade >= 2).length;
        R.i++; render(root);
      }
    };
    const fn = G.EX.X[st.t];
    if (!fn) { R.i++; return render(root); }
    try { fn(ex, st, ctx); } catch (e) { console.error(e); R.i++; render(root); }
  };
  const onAnswer = (root, st, item, res) => {
    const fb = root.querySelector('.fb');
    R.n++; if (res.ok) R.ok++;
    const t = G.Store.today(); t.answers++; if (res.ok) t.correct++;
    if (item && st.t !== 'quiz') {
      G.SRS.grade(item.id, res.ok ? res.grade : 0); R.practiced.add(item.id);
      if (st.isNew) t.newItems++;
      if (!res.ok) {
        if (!R.wrong.includes(item.id)) R.wrong.push(item.id);
        const k = (R.retried[item.id] || 0);
        if (k < 2) { // ξαναρωτάμε σε 3 βήματα, με άλλον τύπο
          R.retried[item.id] = k + 1;
          const t2 = item.code === 'el' && item.kind !== 'w' ? st.t : G.Plan.pickType(item, 'recog');
          R.steps.splice(Math.min(R.i + 3, R.steps.length), 0, { t: t2, id: item.id });
        }
      }
    } else if (st.t === 'quiz' && !res.ok) {
      R.steps.splice(Math.min(R.i + 4, R.steps.length), 0, Object.assign({}, st));
    }
    const xp = res.ok ? (res.grade >= 2 ? 10 : 6) : 0;
    if (xp) { R.xp += xp; G.Store.addXp(R.code, xp); } else G.Store.save();
    G.U.tone(res.ok); G.U.vibrate(res.ok ? 15 : [40, 40, 40]);
    const lang = item ? item.code : st.code;
    const sayable = item && (item.kind === 'w' || item.kind === 's') ? item.l2 : null;
    if (sayable && G.S.settings.autoplay && st.t !== 'speak' && !(st.t || '').startsWith('listen')) setTimeout(() => G.Speech.speak(sayable, lang), 150);
    const h = G.U.esc;
    fb.className = 'fb show ' + (res.ok ? 'ok' : 'bad');
    fb.innerHTML = `<div class="fbtext">
        <b>${res.ok ? G.U.pick(['Σωστά!', 'Μπράβο!', 'Τέλεια!', 'Ακριβώς!', 'Εξαιρετικά!']) : 'Όχι ακριβώς'}</b>
        ${!res.ok && res.correct ? `<div>Σωστό: <span class="ans">${h(res.correct)}</span>${sayable ? G.EX.say(sayable, lang) : ''}</div>` : ''}
        ${item && item.kind === 's' && res.ok ? `<div class="small">${h(item.el)}</div>` : ''}
        ${res.note ? `<div class="small note">${h(res.note)}</div>` : ''}
      </div><button class="btn wide cont">Συνέχεια</button>`;
    const go = () => { R.i++; render(root); };
    fb.querySelector('.cont').addEventListener('click', go);
    fb.querySelector('.cont').focus();
  };
  const saveTime = () => { if (!R) return; const sec = Math.round((Date.now() - R.t0) / 1000); G.Store.today().sec += Math.min(sec, 3600); G.Store.save(); };
  const finish = (root) => {
    saveTime();
    const acc = R.n ? Math.round((R.ok / R.n) * 100) : 100;
    const mins = Math.max(1, Math.round((Date.now() - R.t0) / 60000));
    const bonus = acc >= 90 && R.n >= 8 ? 10 : 0;
    if (bonus) { R.xp += bonus; G.Store.addXp(R.code, bonus); }
    const h = G.U.esc;
    const wrongItems = R.wrong.map(G.C.item).filter(Boolean);
    const label = (it) => it.kind === 'w' || it.kind === 's' ? `${it.l2} — ${it.el}` : it.kind === 'ge' ? it.right : it.kind === 'gp' || it.kind === 'gc' ? it.right : `${it.w} — ${it.def}`;
    const goal = G.S.settings.dailyXp, today = G.Store.today().xp;
    root.innerHTML = `<div class="page done">
      <div class="trophy">${acc >= 90 ? '🏆' : acc >= 70 ? '🎉' : '💪'}</div>
      <h2>${acc >= 90 ? 'Εξαιρετική δουλειά!' : acc >= 70 ? 'Πολύ καλά!' : 'Η προσπάθεια μετράει!'}</h2>
      <div class="stats3"><div><b>⚡${R.xp}</b><span>XP${bonus ? ' (+10 bonus)' : ''}</span></div><div><b>${acc}%</b><span>ακρίβεια</span></div><div><b>${mins}′</b><span>χρόνος</span></div></div>
      <div class="goalbar"><i style="width:${Math.min(100, (today / goal) * 100)}%"></i></div>
      <div class="muted small center">${today >= goal ? '✅ Ο ημερήσιος στόχος επιτεύχθηκε! Σερί: 🔥' + G.S.streak.count : `Ημερήσιος στόχος: ${today}/${goal} XP`}</div>
      ${wrongItems.length ? `<h3>Για να θυμάσαι</h3><ul class="list compact">${wrongItems.map((it) => `<li>${h(label(it))}</li>`).join('')}</ul><p class="muted small">Θα ξαναεμφανιστούν σύντομα — η επανάληψη τη σωστή στιγμή είναι ο πιο γρήγορος δρόμος.</p>` : ''}
      <div class="col gap"><button class="btn primary wide again">Άλλο ένα μάθημα</button><button class="btn ghost wide home">Αρχική</button></div>
    </div>`;
    const code = R.code, unitId = R.unitId, isGreek = code === 'el';
    R = null;
    root.querySelector('.home').addEventListener('click', () => { location.hash = '#/home'; });
    root.querySelector('.again').addEventListener('click', () => start(isGreek ? G.Plan.greek() : G.Plan.foreign(code, { mode: unitId ? 'unit' : 'daily', unitId: null })));
  };
  return { start, render, active };
})();
