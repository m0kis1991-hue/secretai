/* Τεστ προφίλ μάθησης & τεστ κατάταξης επιπέδου. */
window.G = window.G || {};
G.Tests = (() => {
  const h = G.U.esc;

  /* ============================================ ΠΡΟΦΙΛ ΜΑΘΗΣΗΣ */
  const Q = [
    { q: 'Όταν μαθαίνεις κάτι καινούριο (π.χ. μια συνταγή), προτιμάς…', o: [['Να διαβάσω αναλυτικές οδηγίες', { R: 2 }], ['Να δω εικόνες ή ένα βίντεο', { V: 2 }], ['Να μου το εξηγήσει κάποιος', { A: 2 }], ['Να το δοκιμάσω αμέσως στην πράξη', { K: 2 }]] },
    { q: 'Από μια νέα γνωριμία θυμάσαι πιο εύκολα…', o: [['Το πρόσωπο και την εμφάνιση', { V: 2 }], ['Το όνομα που άκουσα και τη φωνή', { A: 2 }], ['Το όνομα, αν το είδα γραμμένο', { R: 2 }], ['Τι κάναμε ή τι συζητήσαμε μαζί', { K: 2 }]] },
    { q: 'Παίρνεις ένα νέο κινητό. Τι κάνεις πρώτα;', o: [['Διαβάζω τις οδηγίες', { R: 2 }], ['Πατάω τα πάντα και ανακαλύπτω', { K: 2 }], ['Βλέπω ένα tutorial', { V: 2 }], ['Ρωτάω κάποιον να μου εξηγήσει', { A: 2 }]] },
    { q: 'Μαθαίνεις καλύτερα με…', o: [['Τραγούδια, podcasts, συζητήσεις', { A: 2 }], ['Λίστες, σημειώσεις, πίνακες', { R: 2 }], ['Χρώματα, σχήματα, διαγράμματα', { V: 2 }], ['Παιχνίδια ρόλων και επανάληψη με κίνηση', { K: 2 }]] },
    { q: 'Πώς προτιμάς τη γραμματική;', key: 'grammar', o: [['Πρώτα τον κανόνα, μετά παραδείγματα', 'explicit'], ['Πρώτα παραδείγματα — βγάζω μόνος μου τον κανόνα', 'implicit'], ['Λίγο απ\' όλα', 'balanced']] },
    { q: 'Πόσο χρόνο μπορείς ρεαλιστικά να διαθέτεις καθημερινά;', key: 'time', o: [['5 λεπτά', 5], ['10–15 λεπτά', 12], ['20–30 λεπτά', 25], ['Πάνω από 30 λεπτά', 40]] },
    { q: 'Ποιος είναι ο κύριος στόχος σου;', key: 'goal', o: [['Ταξίδια & καθημερινή επικοινωνία', 'travel'], ['Δουλειά & επαγγελματική χρήση', 'work'], ['Πλήρης ευχέρεια', 'fluency'], ['Εξετάσεις / πτυχίο', 'exams']] },
    { q: 'Πώς νιώθεις όταν πρέπει να μιλήσεις σε άλλη γλώσσα;', key: 'anxiety', o: [['Άνετα — μου αρέσει να δοκιμάζω', 0], ['Λίγο άγχος, αλλά το κάνω', 1], ['Το αποφεύγω όσο μπορώ', 2]] },
    { q: 'Τι σε κρατάει να συνεχίζεις κάτι;', key: 'motivation', o: [['Σερί, πόντοι, μικρές νίκες', 'game'], ['Να βλέπω μετρήσιμη πρόοδο', 'progress'], ['Η περιέργεια και η ποικιλία', 'variety'], ['Η δέσμευση σε έναν στόχο', 'goal']] }
  ];
  /* Δοκιμή μνήμης με ψευδολέξεις: μετράμε πραγματική απόδοση, όχι μόνο ό,τι λέμε για τον εαυτό μας */
  const PSEUDO = ['τόβα', 'κελίν', 'ράμπο', 'σίφα', 'νούρι', 'δάλκα', 'πέμιλ', 'ζόρκα'];
  const PICS = ['🍎', '🐟', '🚲', '☂️', '🎈', '🔑', '🌵', '🦉'];

  let P = null;
  const profileStart = () => { P = { step: 'intro', qi: 0, raw: { V: 0, A: 0, R: 0, K: 0 }, ans: {} }; G.go('#/profile-test'); };

  const renderProfile = (root) => {
    if (!P) profileStart();
    const ttsEl = G.Speech.hasTTS('el');
    if (P.step === 'intro') {
      root.innerHTML = `<div class="page test">
        <div class="hero">🧭</div><h2>Ας γνωριστούμε</h2>
        <p>Δύο σύντομα βήματα (~4 λεπτά): <b>9 ερωτήσεις</b> για τις συνήθειές σου και μια <b>δοκιμή μνήμης</b> 60 δευτερολέπτων που μετράει πώς συγκρατείς πραγματικά — με τα μάτια ή με τα αυτιά.</p>
        <div class="note">🔬 <b>Τίμια σημείωση:</b> η ιδέα ότι ο καθένας μαθαίνει <i>μόνο</i> με ένα «στυλ» δεν στηρίζεται από την έρευνα. Γι' αυτό το προφίλ σου ρυθμίζει την <b>αναλογία</b> των ασκήσεων — δεν αποκλείει κανέναν τρόπο. Η πραγματική ταχύτητα έρχεται από: επανάληψη στη σωστή στιγμή, ενεργή ανάκληση, ανάμειξη και παραγωγή λόγου. Αυτά είναι χτισμένα μέσα στην εφαρμογή.</div>
        <button class="btn primary wide go">Ξεκίνα</button></div>`;
      root.querySelector('.go').addEventListener('click', () => { P.step = 'q'; renderProfile(root); });
      return;
    }
    if (P.step === 'q') {
      const q = Q[P.qi];
      root.innerHTML = `<div class="page test">
        <div class="progress thin"><i style="width:${(P.qi / (Q.length + 1)) * 100}%"></i></div>
        <div class="tag">Ερώτηση ${P.qi + 1} από ${Q.length}</div><h3>${h(q.q)}</h3>
        <div class="opts">${q.o.map((o, k) => `<button class="opt" data-k="${k}">${h(o[0])}</button>`).join('')}</div></div>`;
      root.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
        const v = q.o[+b.dataset.k][1];
        if (q.key) P.ans[q.key] = v; else for (const k in v) P.raw[k] += v[k];
        P.qi++;
        if (P.qi >= Q.length) { P.step = 'memintro'; }
        renderProfile(root);
      }));
      return;
    }
    if (P.step === 'memintro') {
      const order = G.U.shuffle(PSEUDO.map((w, i) => ({ w, p: PICS[i] })));
      P.vis = order.slice(0, 4); P.aud = order.slice(4, 8); P.memScore = { V: 0, A: 0 };
      root.innerHTML = `<div class="page test"><div class="hero">🧠</div><h2>Δοκιμή μνήμης</h2>
        <p>Θα δεις 4 φανταστικές λέξεις <b>γραμμένες</b> δίπλα σε μια εικόνα${ttsEl ? ' και μετά θα ακούσεις 4 άλλες <b>χωρίς να τις δεις</b>' : ''}. Προσπάθησε να τις συγκρατήσεις. Μετά θα σε ρωτήσω.</p>
        ${ttsEl ? '<p class="muted small">Άνοιξε τον ήχο 🔊</p>' : '<p class="muted small">(Η συσκευή δεν έχει ελληνική φωνή — θα γίνει μόνο ο οπτικός γύρος.)</p>'}
        <button class="btn primary wide go">Είμαι έτοιμος</button></div>`;
      root.querySelector('.go').addEventListener('click', () => { P.step = 'study'; P.si = 0; renderProfile(root); });
      return;
    }
    if (P.step === 'study') {
      const seq = [...P.vis.map((x) => ({ ...x, m: 'V' })), ...(ttsEl ? P.aud.map((x) => ({ ...x, m: 'A' })) : [])];
      if (P.si >= seq.length) { P.step = 'memtest'; P.ti = 0; P.tests = G.U.shuffle([...P.vis.map((x) => ({ ...x, m: 'V' })), ...(ttsEl ? P.aud.map((x) => ({ ...x, m: 'A' })) : [])]); return renderProfile(root); }
      const x = seq[P.si];
      root.innerHTML = `<div class="page test center"><div class="tag">${x.m === 'V' ? 'Κοίτα' : 'Άκου'} · ${P.si + 1}/${seq.length}</div>
        <div class="memcard"><div class="emoji huge">${x.p}</div>${x.m === 'V' ? `<div class="l2">${h(x.w)}</div>` : '<div class="l2 muted">🔊 …</div>'}</div></div>`;
      if (x.m === 'A') { G.Speech.speak(x.w, 'el', { rate: 0.85 }); setTimeout(() => G.Speech.speak(x.w, 'el', { rate: 0.85 }), 1400); }
      setTimeout(() => { if (location.hash === '#/profile-test' && P && P.step === 'study') { P.si++; renderProfile(root); } }, x.m === 'V' ? 2600 : 3200);
      return;
    }
    if (P.step === 'memtest') {
      if (P.ti >= P.tests.length) { P.step = 'result'; return renderProfile(root); }
      const x = P.tests[P.ti];
      const set = x.m === 'V' ? P.vis : P.aud;
      if (x.m === 'V') {
        root.innerHTML = `<div class="page test"><div class="tag">Ποια λέξη ήταν αυτή; ${P.ti + 1}/${P.tests.length}</div>
          <div class="prompt"><span class="emoji huge">${x.p}</span></div>
          <div class="opts">${G.U.shuffle(set).map((o) => `<button class="opt" data-w="${h(o.w)}">${h(o.w)}</button>`).join('')}</div></div>`;
      } else {
        root.innerHTML = `<div class="page test"><div class="tag">Άκου: ποια εικόνα ήταν; ${P.ti + 1}/${P.tests.length}</div>
          <div class="prompt listen">${G.EX.say(x.w, 'el', 'xl')}</div>
          <div class="opts grid4">${G.U.shuffle(set).map((o) => `<button class="opt big" data-w="${h(o.w)}">${o.p}</button>`).join('')}</div></div>`;
        setTimeout(() => G.Speech.speak(x.w, 'el', { rate: 0.85 }), 200);
      }
      root.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.w === x.w) P.memScore[x.m]++;
        P.ti++; renderProfile(root);
      }));
      return;
    }
    if (P.step === 'result') return profileResult(root);
  };

  const MOD_TXT = {
    V: ['Οπτικός', '👁️', 'Εικόνες, χρώματα γένους, αντιστοιχίσεις ζευγαριών.'],
    A: ['Ακουστικός', '👂', 'Περισσότερη ακρόαση, υπαγόρευση και shadowing.'],
    R: ['Αναγνώστης', '📖', 'Ορισμοί, κείμενα, γραπτές επιλογές και συμπληρώσεις.'],
    K: ['Πρακτικός', '🛠️', 'Παραγωγή: γράψε, μίλα, φτιάξε προτάσεις.']
  };
  const profileResult = (root) => {
    const r = Object.assign({}, P.raw);
    r.V += P.memScore.V * 1.5; r.A += P.memScore.A * 1.5;
    const g = P.ans.goal;
    if (g === 'travel') { r.A += 1.5; r.K += 1.5; } else if (g === 'exams') { r.R += 2; } else if (g === 'work') { r.R += 1; r.K += 1; } else { r.A += 1; r.K += 1; }
    const sum = r.V + r.A + r.R + r.K || 1;
    const mod = {}; for (const k of 'VARK') mod[k] = r[k] / sum;
    const t = P.ans.time || 12;
    const prof = {
      mod, grammar: P.ans.grammar || 'balanced', goal: g || 'fluency', anxiety: P.ans.anxiety || 0, motivation: P.ans.motivation || 'progress',
      minutes: t, size: t <= 5 ? 8 : t <= 12 ? 15 : t <= 25 ? 25 : 35, newPerSession: t <= 5 ? 4 : t <= 12 ? 7 : t <= 25 ? 10 : 12,
      memory: P.memScore, at: Date.now()
    };
    G.S.profile = prof;
    G.S.settings.dailyXp = t <= 5 ? 30 : t <= 12 ? 60 : t <= 25 ? 120 : 180;
    G.Store.save(true);
    const order = 'VARK'.split('').sort((a, b) => mod[b] - mod[a]);
    const top = order[0];
    const ttsEl = G.Speech.hasTTS('el');
    root.innerHTML = `<div class="page test">
      <div class="hero">${MOD_TXT[top][1]}</div><h2>Το προφίλ σου: ${MOD_TXT[top][0]}${mod[order[1]] > mod[top] - 0.05 ? ' & ' + MOD_TXT[order[1]][0] : ''}</h2>
      <div class="bars">${order.map((k) => `<div class="bar"><span>${MOD_TXT[k][1]} ${MOD_TXT[k][0]}</span><div><i style="width:${Math.round(mod[k] * 100)}%"></i></div><b>${Math.round(mod[k] * 100)}%</b></div>`).join('')}</div>
      <div class="note">Μνήμη: ${P.memScore.V}/4 οπτικά${ttsEl ? ` · ${P.memScore.A}/4 ακουστικά` : ''}. ${ttsEl && P.memScore.A !== P.memScore.V ? (P.memScore.A > P.memScore.V ? 'Συγκρατείς καλύτερα όσα ακούς.' : 'Συγκρατείς καλύτερα όσα βλέπεις.') : ''}</div>
      <h3>Πώς προσαρμόζεται το μάθημα</h3>
      <ul class="list">
        <li>${MOD_TXT[top][1]} ${MOD_TXT[top][2]}</li>
        <li>⏱️ Συνεδρίες ~${prof.minutes} λεπτών (${prof.size} βήματα), στόχος ${G.S.settings.dailyXp} XP/ημέρα.</li>
        <li>📐 Γραμματική: ${prof.grammar === 'explicit' ? 'πρώτα ο κανόνας, μετά εξάσκηση' : prof.grammar === 'implicit' ? 'πρώτα παραδείγματα, ο κανόνας στο τέλος' : 'κανόνας με άμεση εξάσκηση'}.</li>
        <li>🗣️ ${prof.anxiety >= 1 ? 'Ομιλία χωρίς πίεση: ξεκινάμε με επανάληψη πίσω από τον ομιλητή (shadowing) και μόνο σε λέξεις που ήδη ξέρεις.' : 'Ομιλία από την πρώτη μέρα — η παραγωγή λόγου επιταχύνει τη μάθηση.'}</li>
        <li>🔁 Όλοι οι τρόποι μένουν ενεργοί (ελάχιστο 12% ο καθένας) — η ανάμειξη αποδίδει καλύτερα από την «καθαρή» εξειδίκευση.</li>
      </ul>
      <button class="btn primary wide go">Συνέχεια →</button></div>`;
    root.querySelector('.go').addEventListener('click', () => { P = null; location.hash = G.S.onboarded ? '#/home' : '#/choose'; });
  };

  /* ============================================ ΚΑΤΑΤΑΞΗ ΞΕΝΗΣ ΓΛΩΣΣΑΣ */
  const DESC = {
    A0: ['Αρχάριος', 'Ξεκινάμε από τα θεμέλια — σε λίγες εβδομάδες θα λες τις πρώτες σου φράσεις.'],
    A1: ['Βασικός χρήστης', 'Καταλαβαίνεις και λες απλές, καθημερινές φράσεις.'],
    A2: ['Στοιχειώδης χρήστης', 'Τα βγάζεις πέρα σε απλές, συνηθισμένες καταστάσεις.'],
    B1: ['Ανεξάρτητος χρήστης', 'Χειρίζεσαι τα περισσότερα ταξίδια, μιλάς για εμπειρίες και σχέδια.'],
    B2: ['Ανεξάρτητος χρήστης (ανώτερος)', 'Συζητάς με ευχέρεια και καταλαβαίνεις σύνθετα κείμενα.'],
    C1: ['Έμπειρος χρήστης', 'Εκφράζεσαι αυθόρμητα και ευέλικτα σε δουλειά και σπουδές.'],
    C2: ['Άριστος χειριστής', 'Σχεδόν σαν μητρικός ομιλητής — εδώ μετρούν οι αποχρώσεις.']
  };
  let T = null;
  const placementStart = (code) => { T = { code, step: 'intro' }; G.go('#/placement/' + code); };
  const levelItems = (code, li) => {
    const lvl = G.LEVELS[li];
    const bank = G.U.shuffle(G.PLACEMENT[code][lvl]).map((q) => ({ kind: 'q', q }));
    const out = bank.slice(0, 2);
    const sents = G.C.allSents(code).filter((s) => s.lvl === lvl);
    const pool = sents.length ? sents : G.C.allSents(code).filter((s) => G.C.lvIdx(s.lvl) >= Math.min(li, 4));
    if (G.Speech.hasTTS(code) && pool.length) out.push({ kind: 'listen', s: G.U.pick(pool) });
    else out.push(bank[2]);
    return G.U.shuffle(out);
  };
  const renderPlacement = (root, code) => {
    if (!T || T.code !== code) T = { code, step: 'intro' };
    const L = G.LANGS[code];
    if (code === 'el') return renderGreekTest(root);
    if (T.step === 'intro') {
      root.innerHTML = `<div class="page test"><div class="hero">${L.flag}</div><h2>Τεστ κατάταξης: ${h(L.name)}</h2>
        <p>Προσαρμοστικό τεστ <b>3–5 λεπτών</b>: οι ερωτήσεις δυσκολεύουν όσο απαντάς σωστά και σταματούν μόλις βρούμε το επίπεδό σου (A1–C2). Περιλαμβάνει και ακουστική κατανόηση.</p>
        <div class="note">⚠️ Μη μαντεύεις. Αν δεν ξέρεις, πάτα <b>«Δεν ξέρω»</b> — ένα «φουσκωμένο» επίπεδο σημαίνει μαθήματα πολύ δύσκολα και πιο αργή πρόοδο.</div>
        <div class="col gap"><button class="btn primary wide go">Ξεκίνα το τεστ</button><button class="btn ghost wide zero">Είμαι εντελώς αρχάριος</button></div></div>`;
      root.querySelector('.go').addEventListener('click', () => { Object.assign(T, { step: 'run', li: 1, passed: {}, failed: {}, items: levelItems(code, 1), k: 0, right: 0, total: 0, asked: 0 }); renderPlacement(root, code); });
      root.querySelector('.zero').addEventListener('click', () => placementFinish(root, code, -1));
      return;
    }
    if (T.step === 'run') {
      const it = T.items[T.k];
      const lvl = G.LEVELS[T.li];
      const dk = '<button class="opt dk" data-dk="1">🤷 Δεν ξέρω</button>';
      if (it.kind === 'q') {
        const [q, right, ...wrong] = it.q;
        const opts = G.U.shuffle([right, ...wrong]);
        root.innerHTML = `<div class="page test"><div class="progress thin"><i style="width:${Math.min(95, T.asked * 7)}%"></i></div>
          <div class="tag">Ερώτηση ${T.asked + 1}</div>
          <div class="prompt"><span class="l2 sent" lang="${L.tts}">${q.split('___').map(h).join('<span class="blank">____</span>')}</span></div>
          <div class="opts">${opts.map((o) => `<button class="opt" data-v="${h(o)}" lang="${L.tts}">${h(o)}</button>`).join('')}${dk}</div></div>`;
        bindRun(root, code, (v) => v === right);
      } else {
        const s = it.s, opts = G.U.shuffle([s.el, ...G.C.sentDistractors(s, 3).map((x) => x.el)]);
        root.innerHTML = `<div class="page test"><div class="progress thin"><i style="width:${Math.min(95, T.asked * 7)}%"></i></div>
          <div class="tag">Ερώτηση ${T.asked + 1} · ακουστική κατανόηση</div>
          <div class="prompt listen">${G.EX.say(s.l2, code, 'xl')}</div>
          <div class="opts">${opts.map((o) => `<button class="opt" data-v="${h(o)}">${h(o)}</button>`).join('')}${dk}</div></div>`;
        setTimeout(() => G.Speech.speak(s.l2, code), 300);
        bindRun(root, code, (v) => v === s.el);
      }
      void lvl;
    }
  };
  const bindRun = (root, code, isRight) => {
    root.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
      const ok = !b.dataset.dk && isRight(b.dataset.v);
      T.asked++; T.total++; if (ok) T.right++;
      T.k++;
      if (T.k >= T.items.length) {
        const pass = T.right >= 2;
        if (pass) T.passed[T.li] = 1; else T.failed[T.li] = 1;
        let nxt = null;
        if (pass && T.li < 5 && !T.failed[T.li + 1] && !T.passed[T.li + 1]) nxt = T.li + 1;
        if (!pass && T.li > 0 && !T.passed[T.li - 1] && !T.failed[T.li - 1]) nxt = T.li - 1;
        if (nxt === null) {
          const best = Math.max(-1, ...Object.keys(T.passed).map(Number));
          return placementFinish(root, code, best);
        }
        T.li = nxt; T.items = levelItems(code, nxt); T.k = 0; T.right = 0;
      }
      renderPlacement(root, code);
    }));
  };
  const placementFinish = (root, code, li) => {
    const lvl = li < 0 ? 'A0' : G.LEVELS[li];
    const L = G.Store.lang(code); L.level = lvl; L.placed = Date.now();
    G.Store.save(true);
    const seeded = G.C.seedKnown(code);
    const [name, desc] = DESC[lvl];
    const next = G.C.nextUnit(code);
    root.innerHTML = `<div class="page test"><div class="hero">${G.LANGS[code].flag}</div>
      <div class="levelbadge">${lvl === 'A0' ? 'A0' : lvl}</div><h2>${h(name)}</h2><p>${h(desc)}</p>
      <ul class="list">
        <li>▶️ Ξεκινάς από: <b>${h(next.e + ' ' + next.t)}</b> (${next.lvl})</li>
        ${seeded ? `<li>✅ ${seeded} λέξεις χαμηλότερων επιπέδων μπήκαν σε <b>γρήγορη επιβεβαίωση</b>: θα εμφανίζονται σποραδικά τις επόμενες 3 εβδομάδες — όσες ξέρεις κλειδώνουν, όσες όχι ξαναμαθαίνονται.</li>` : ''}
        <li>🔄 Μπορείς να ξαναδώσεις το τεστ όποτε θέλεις από τις Ρυθμίσεις.</li>
      </ul>
      <button class="btn primary wide go">Πάμε για το πρώτο μάθημα →</button>
      <button class="btn ghost wide home">Αρχική</button></div>`;
    T = null;
    root.querySelector('.go').addEventListener('click', () => { G.S.current = code; G.Store.save(); G.Run.start(G.Plan.foreign(code)); });
    root.querySelector('.home').addEventListener('click', () => { G.S.current = code; G.Store.save(); location.hash = '#/home'; });
  };

  /* ============================================ ΕΛΛΗΝΙΚΑ: ΤΕΣΤ ΓΙΑ ΜΗΤΡΙΚΟΥΣ */
  const GT_DESC = [
    ['Γερή βάση', 'Ώρα για εμπλουτισμό: λόγιο λεξιλόγιο, ακρίβεια, σύνταξη.'],
    ['Καλός χειριστής του λόγου', 'Χειρίζεσαι σωστά τη γλώσσα· τώρα στοχεύουμε σε πλούτο και ύφος.'],
    ['Προχωρημένος', 'Γνωρίζεις τις λεπτές διακρίσεις· ήρθε η ώρα της ρητορικής δεινότητας.'],
    ['Λόγιος — επίπεδο ρήτορα', 'Κατέχεις και τις λόγιες μορφές. Εστιάζουμε στην εκφορά, το ύφος και την πειθώ.']
  ];
  const renderGreekTest = (root) => {
    if (T.step === 'intro') {
      root.innerHTML = `<div class="page test"><div class="hero">🇬🇷</div><h2>Ελληνικά για μητρικούς ομιλητές</h2>
        <p>Εδώ δεν μετράμε αν «ξέρεις ελληνικά» — μετράμε <b>ακρίβεια, λόγιες μορφές, λεξιλόγιο και ρητορική</b>. Τρεις βαθμίδες, έως 18 ερωτήσεις.</p>
        <div class="note">Αν διστάζεις, πάτα «Δεν ξέρω». Το αποτέλεσμα καθορίζει από πού θα ξεκινήσει το λεξιλόγιο.</div>
        <button class="btn primary wide go">Ξεκίνα</button></div>`;
      root.querySelector('.go').addEventListener('click', () => { Object.assign(T, { step: 'run', tier: 1, k: 0, right: 0, passed: 0, items: G.U.shuffle(G.GREEK_TEST.filter((x) => x[0] === 1)) }); renderGreekTest(root); });
      return;
    }
    const it = T.items[T.k];
    const [, q, right, ...wrong] = it;
    const opts = G.U.shuffle([right, ...wrong]);
    root.innerHTML = `<div class="page test"><div class="progress thin"><i style="width:${((T.tier - 1) * 6 + T.k) / 18 * 100}%"></i></div>
      <div class="tag">Βαθμίδα ${T.tier} · ${T.k + 1}/6</div><h3>${h(q).replace('___', '<span class="blank">____</span>')}</h3>
      <div class="opts">${opts.map((o) => `<button class="opt" data-v="${h(o)}">${h(o)}</button>`).join('')}<button class="opt dk" data-dk="1">🤷 Δεν ξέρω</button></div></div>`;
    root.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
      if (!b.dataset.dk && b.dataset.v === right) T.right++;
      T.k++;
      if (T.k >= T.items.length) {
        const pass = T.right >= 4;
        if (pass) T.passed = T.tier;
        if (pass && T.tier < 3) { T.tier++; T.k = 0; T.right = 0; T.items = G.U.shuffle(G.GREEK_TEST.filter((x) => x[0] === T.tier)); }
        else return greekFinish(root);
      }
      renderGreekTest(root);
    }));
  };
  const greekFinish = (root) => {
    const p = T.passed, L = G.Store.lang('el');
    L.ntier = Math.max(1, p); L.level = ['N0', 'N1', 'N2', 'N3'][p]; L.placed = Date.now();
    G.Store.save(true);
    const [name, desc] = GT_DESC[p];
    root.innerHTML = `<div class="page test"><div class="hero">🏛️</div><div class="levelbadge">${['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][p]}</div><h2>${h(name)}</h2><p>${h(desc)}</p>
      <ul class="list"><li>📚 Λεξιλόγιο από τη βαθμίδα ${L.ntier} και πάνω, με επανάληψη σε διαστήματα.</li>
      <li>🎤 Το «Εργαστήριο λόγου» μετρά ρυθμό, γεμίσματα («εεε», «ας πούμε»), ποικιλία λεξιλογίου και δομή — εκεί θα γίνει η μεγαλύτερη διαφορά.</li></ul>
      <button class="btn primary wide go">Πάμε →</button></div>`;
    T = null;
    root.querySelector('.go').addEventListener('click', () => { G.S.current = 'el'; G.Store.save(); location.hash = '#/home'; });
  };

  return { profileStart, renderProfile, placementStart, renderPlacement, DESC };
})();
