/* Οθόνες εφαρμογής. */
window.G = window.G || {};
G.Screens = (() => {
  const h = G.U.esc;
  const TIPS = [
    'Λίγο και συχνά: 15′ κάθε μέρα αποδίδουν περισσότερο από 2 ώρες την Κυριακή.',
    'Πες τις λέξεις δυνατά — η παραγωγή λόγου ενισχύει αισθητά τη συγκράτηση.',
    'Το λάθος τη σωστή στιγμή είναι μέρος της μάθησης: ό,τι ξεχνάς και ξαναθυμάσαι, κλειδώνει.',
    'Μάθε τα ουσιαστικά πάντα με το άρθρο τους: la mer, der Tisch, il mare.',
    'Άκου κάτι στη γλώσσα-στόχο ενώ περπατάς ή μαγειρεύεις — ακόμη κι αν δεν τα καταλαβαίνεις όλα.',
    'Πολλές γλώσσες μαζί κουράζουν: έχε 1–2 «κύριες» και κράτα τις άλλες σε συντήρηση με τις επαναλήψεις.',
    'Shadowing: άκου μια φράση και επανάλαβέ την αμέσως, μιμούμενος ρυθμό και μελωδία.',
    'Γράψε 3 προτάσεις για τη μέρα σου στη γλώσσα-στόχο πριν κοιμηθείς.',
    'Η επανάληψη λίγο πριν ξεχάσεις είναι η πιο αποδοτική — γι\' αυτό η εφαρμογή διαλέγει πότε θα ξαναδείς κάθε λέξη.',
    'Ο ύπνος σταθεροποιεί τη μνήμη: μια σύντομη επανάληψη το βράδυ αξίζει διπλά.'
  ];
  const GR_TIPS = [
    'Για μία μέρα, αντικατέστησε κάθε «πολύ» με μια ακριβέστερη λέξη.',
    'Πριν από μια σημαντική συζήτηση, διάλεξε 2 λόγιες λέξεις και βάλε στόχο να τις χρησιμοποιήσεις.',
    'Η παύση είναι πιο πειστική από το «εεε». Δοκίμασέ το σήμερα σε ένα τηλεφώνημα.',
    'Διάβαζε δυνατά 5 λεπτά τη μέρα από ένα καλό βιβλίο — η άρθρωση είναι μυς.',
    'Ηχογράφησε τον εαυτό σου ένα λεπτό. Ό,τι σε ενοχλεί, αυτό είναι το επόμενο βήμα σου.',
    'Ρήματα αντί για ουσιαστικά: «αναλύουμε» αντί «κάνουμε ανάλυση».'
  ];
  const dayIdx = () => Math.floor(Date.now() / 86400000);

  const ringSvg = (pct) => { const c = 2 * Math.PI * 22; return `<svg viewBox="0 0 52 52" class="goalring"><circle cx="26" cy="26" r="22" class="trk"/><circle cx="26" cy="26" r="22" class="val" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}" transform="rotate(-90 26 26)"/></svg>`; };
  const topbar = () => {
    const t = G.Store.today(), goal = G.S.settings.dailyXp, cur = G.S.current;
    return `<header class="top">
      <div class="langs">${G.LANG_ORDER.map((c) => `<button class="flag ${c === cur ? 'on' : ''}" data-lang-switch="${c}" title="${h(G.LANGS[c].name)}">${G.LANGS[c].flag}</button>`).join('')}</div>
      <div class="meta"><span class="streak" title="Σερί ημερών">🔥${G.S.streak.count}</span><span class="goal" title="Ημερήσιος στόχος">${ringSvg(t.xp / goal)}<b>${t.xp}</b></span></div>
    </header>`;
  };
  const bindTop = (root) => root.querySelectorAll('[data-lang-switch]').forEach((b) => b.addEventListener('click', () => { G.S.current = b.dataset.langSwitch; G.Store.save(); G.App.render(); }));

  /* ---------------------------------------------------- Αρχική */
  const home = (root) => {
    const code = G.S.current, L = G.Store.lang(code), lang = G.LANGS[code];
    if (code === 'el') return greekHome(root);
    const c = G.SRS.countBy(code + ':'), u = G.C.nextUnit(code), p = G.C.unitProgress(u);
    const others = G.LANG_ORDER.filter((x) => x !== code).map((x) => [x, G.SRS.countBy(x + ':').due]).filter(([, d]) => d > 0);
    const tts = G.Speech.hasTTS(code);
    root.innerHTML = `${topbar()}<div class="page">
      <div class="hello"><h2>${lang.flag} ${h(lang.name)}</h2><span class="lvl">${L.level ? (L.level === 'A0' ? 'Αρχάριος' : 'Επίπεδο ' + L.level) : 'Χωρίς κατάταξη'}</span></div>
      ${!L.placed ? `<div class="card cta"><div><b>Βρες το επίπεδό σου</b><div class="muted small">Τεστ 3–5 λεπτών ώστε να μη χάνεις χρόνο σε ό,τι ήδη ξέρεις.</div></div><button class="btn primary place">Τεστ</button></div>` : ''}
      <div class="card next">
        <div class="tag">Επόμενο μάθημα · ${u.lvl}</div>
        <h3>${h(u.e)} ${h(u.t)}</h3>
        <div class="pbar"><i style="width:${Math.round(p.pct * 100)}%"></i></div>
        <div class="muted small">${p.seen}/${p.total} λέξεις · ${c.due} επαναλήψεις σε αναμονή</div>
        <button class="btn primary wide big go">▶ Συνέχισε</button>
      </div>
      <div class="grid2">
        <button class="tilebtn rev"><span>🔁</span>Επανάληψη<small>${c.due} για σήμερα</small></button>
        <button class="tilebtn les"><span>🗺️</span>Μαθήματα<small>${G.C.units(code).length} ενότητες</small></button>
        <button class="tilebtn listen" ${tts ? '' : 'disabled'}><span>🎧</span>Ακρόαση<small>γρήγορη άσκηση</small></button>
        <button class="tilebtn speakd" ${tts ? '' : 'disabled'}><span>🗣️</span>Ομιλία<small>shadowing</small></button>
        <button class="tilebtn gram"><span>📐</span>Γραμματική<small>${(G.GRAMMAR[code] || []).length} θέματα</small></button>
        <button class="tilebtn words"><span>📚</span>Λεξιλόγιο<small>${c.learned} μαθημένες</small></button>
        <button class="tilebtn lab"><span>🎤</span>Εργαστήριο λόγου<small>ελεύθερη ομιλία</small></button>
        <button class="tilebtn stats"><span>📈</span>Πρόοδος<small>${c.mastered} κατακτημένες</small></button>
      </div>
      ${others.length ? `<div class="card slim"><span class="muted small">Επαναλήψεις σε άλλες γλώσσες:</span> ${others.map(([x, d]) => `<button class="chip" data-lang-switch="${x}">${G.LANGS[x].flag} ${d}</button>`).join(' ')}</div>` : ''}
      ${!tts ? `<div class="note">🔇 Δεν βρέθηκε φωνή για ${h(lang.name)} στη συσκευή. Εγκατάστησέ τη από τις ρυθμίσεις του κινητού (Μετατροπή κειμένου σε ομιλία) για ασκήσεις ακρόασης.</div>` : ''}
      <div class="tip">💡 ${h(TIPS[dayIdx() % TIPS.length])}</div>
    </div>`;
    bindTop(root);
    const on = (sel, fn) => { const e = root.querySelector(sel); if (e) e.addEventListener('click', fn); };
    on('.place', () => G.Tests.placementStart(code));
    on('.go', () => G.Run.start(G.Plan.foreign(code)));
    on('.rev', () => G.Run.start(G.Plan.foreign(code, { mode: 'review' })));
    on('.les', () => { location.hash = '#/lessons'; });
    on('.gram', () => { location.hash = '#/grammar'; });
    on('.words', () => { location.hash = '#/words'; });
    on('.lab', () => { location.hash = '#/lab'; });
    on('.stats', () => { location.hash = '#/stats'; });
    on('.listen', () => drill(code, ['listen_mc', 'listen_sentence', 'dictation'], 'Ακρόαση'));
    on('.speakd', () => drill(code, ['speak'], 'Ομιλία · shadowing'));
    root.querySelectorAll('.card.slim [data-lang-switch]').forEach((b) => b.addEventListener('click', () => { G.S.current = b.dataset.langSwitch; G.Store.save(); G.App.render(); }));
  };
  /* Στοχευμένη άσκηση με συγκεκριμένους τύπους, από ό,τι έχεις ήδη δει */
  const drill = (code, types, title) => {
    let ids = Object.keys(G.S.cards).filter((k) => k.startsWith(code + ':') && !(G.S.cards[k].s && !G.S.cards[k].r) && G.C.item(k));
    if (ids.length < 5) { const u = G.C.nextUnit(code); ids = ids.concat(u.words.map((w) => w.id), u.sents.map((s) => s.id)); }
    const steps = G.U.sample([...new Set(ids)], (G.S.profile && G.S.profile.size) || 12).map((id) => {
      const it = G.C.item(id);
      const ok = types.filter((t) => G.EX.META[t].kind.includes(it.kind));
      return ok.length ? { t: G.U.pick(ok), id } : null;
    }).filter(Boolean);
    G.Run.start({ steps, code, title });
  };

  /* ---------------------------------------------------- Ελληνικά: κέντρο */
  const greekHome = (root) => {
    const L = G.Store.lang('el'), tier = L.ntier || 1;
    const pool = G.C.greek('v').filter((v) => v.tier <= tier + 1);
    const wotd = pool[dayIdx() % pool.length];
    const cnt = (k) => { const all = G.C.greek(k); const learned = all.filter((x) => G.S.cards[x.id]).length; const due = all.filter((x) => G.S.cards[x.id] && G.S.cards[x.id].d <= Date.now()).length; return { all: all.length, learned, due }; };
    const S = { v: cnt('v'), i: cnt('i'), e: cnt('e'), p: cnt('p'), c: cnt('c'), d: cnt('d') };
    const due = Object.values(S).reduce((a, b) => a + b.due, 0);
    const lastSp = G.S.speeches.filter((s) => s.code === 'el').slice(-1)[0];
    root.innerHTML = `${topbar()}<div class="page">
      <div class="hello"><h2>🇬🇷 Ελληνικά</h2><span class="lvl">${L.level ? ['Βάση', 'Καλός χειριστής', 'Προχωρημένος', 'Λόγιος'][+L.level.slice(1)] : 'Εκφορά λόγου & λεξιλόγιο'}</span></div>
      ${!L.placed ? `<div class="card cta"><div><b>Τεστ για μητρικούς ομιλητές</b><div class="muted small">Μετράει ακρίβεια, λόγιες μορφές, ρητορική.</div></div><button class="btn primary place">Τεστ</button></div>` : ''}
      <div class="card wotd">
        <div class="tag">Λέξη της ημέρας</div>
        <div class="row between"><h3>${h(wotd.w)}</h3>${G.EX.say(wotd.w, 'el')}</div>
        <div>${h(wotd.def)}</div><div class="muted small exm">«${h(wotd.ex)}»</div>
        <div class="syn">${wotd.syn.split(',').map((s) => `<span class="chip">${h(s.trim())}</span>`).join('')}</div>
        <div class="muted small">Πρόκληση: χρησιμοποίησέ τη σήμερα σε μια πραγματική συζήτηση.</div>
      </div>
      <button class="btn primary wide big go">▶ Καθημερινό μάθημα${due ? ` · ${due} επαναλήψεις` : ''}</button>
      <div class="grid2">
        <button class="tilebtn" data-f="v"><span>📚</span>Λόγιο λεξιλόγιο<small>${S.v.learned}/${S.v.all}</small></button>
        <button class="tilebtn" data-f="i"><span>🏛️</span>Λόγιες εκφράσεις<small>${S.i.learned}/${S.i.all}</small></button>
        <button class="tilebtn" data-f="e"><span>✍️</span>Συχνά λάθη<small>${S.e.learned}/${S.e.all}</small></button>
        <button class="tilebtn" data-f="p"><span>⚖️</span>Παρώνυμα<small>${S.p.learned}/${S.p.all}</small></button>
        <button class="tilebtn" data-f="c"><span>🔗</span>Συνδετικές λέξεις<small>${S.c.learned}/${S.c.all}</small></button>
        <button class="tilebtn" data-f="d"><span>🎭</span>Σχήματα λόγου<small>${S.d.learned}/${S.d.all}</small></button>
      </div>
      <div class="card lab-cta"><div><b>🎤 Εργαστήριο λόγου</b><div class="muted small">${lastSp ? `Τελευταίο σκορ: ${lastSp.score}/100 · ${lastSp.wpm} λ/λ · ${lastSp.fpm} γεμίσματα/λεπτό` : 'Αυτοσχέδια ομιλία με ανάλυση ρυθμού, γεμισμάτων, λεξιλογίου & δομής.'}</div></div><button class="btn primary labgo">Πάμε</button></div>
      <div class="grid2">
        <button class="tilebtn theory"><span>🎓</span>Θεωρία ρητορικής<small>${G.GR.lessons.length} μαθήματα</small></button>
        <button class="tilebtn conn"><span>🧭</span>Οδηγός συνδετικών<small>ανά λειτουργία</small></button>
        <button class="tilebtn twist"><span>👄</span>Άρθρωση<small>γλωσσοδέτες</small></button>
        <button class="tilebtn words"><span>🔎</span>Λεξικό μου<small>αναζήτηση</small></button>
      </div>
      <div class="tip">💡 ${h(GR_TIPS[dayIdx() % GR_TIPS.length])}</div>
    </div>`;
    bindTop(root);
    const on = (sel, fn) => { const e = root.querySelector(sel); if (e) e.addEventListener('click', fn); };
    on('.place', () => G.Tests.placementStart('el'));
    on('.go', () => G.Run.start(G.Plan.greek()));
    root.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => G.Run.start(G.Plan.greek({ focus: b.dataset.f }))));
    on('.labgo', () => { location.hash = '#/lab'; });
    on('.theory', () => { location.hash = '#/theory'; });
    on('.conn', () => { location.hash = '#/connectors'; });
    on('.twist', () => { location.hash = '#/twisters'; });
    on('.words', () => { location.hash = '#/words'; });
  };

  /* ---------------------------------------------------- Μαθήματα */
  const lessons = (root) => {
    const code = G.S.current;
    if (code === 'el') { location.hash = '#/home'; return; }
    const L = G.Store.lang(code), pi = G.C.lvIdx(L.level), nu = G.C.nextUnit(code);
    const groups = {};
    for (const u of G.C.units(code)) (groups[u.lvl] = groups[u.lvl] || []).push(u);
    root.innerHTML = `${topbar()}<div class="page"><h2>🗺️ Μαθήματα · ${G.LANGS[code].flag}</h2>
      ${Object.keys(groups).map((lvl) => `<div class="lvlhead"><b>${lvl}</b><span class="muted small">${G.C.lvIdx(lvl) <= pi ? 'κάτω από το επίπεδό σου · γρήγορη επιβεβαίωση' : ''}</span></div>
        <div class="units">${groups[lvl].map((u) => { const p = G.C.unitProgress(u); return `<button class="unit ${u.id === nu.id ? 'cur' : ''} ${p.pct >= 1 ? 'done' : ''}" data-u="${u.id}">
          <span class="ue">${u.e}</span><span class="ut">${h(u.t)}<small>${p.seen}/${p.total} λέξεις · ${Math.round(p.mastery * 100)}% σταθερές</small></span>
          <span class="pring" style="--p:${Math.round(p.pct * 100)}"></span></button>`; }).join('')}</div>`).join('')}
    </div>`;
    bindTop(root);
    root.querySelectorAll('[data-u]').forEach((b) => b.addEventListener('click', () => G.Run.start(G.Plan.foreign(code, { mode: 'unit', unitId: b.dataset.u }))));
  };

  /* ---------------------------------------------------- Γραμματική */
  const grammar = (root) => {
    const code = G.S.current === 'el' ? 'en' : G.S.current;
    const L = G.Store.lang(code), list = G.GRAMMAR[code] || [];
    root.innerHTML = `${topbar()}<div class="page"><h2>📐 Γραμματική · ${G.LANGS[code].flag}</h2>
      <p class="muted small">Σύντομες εξηγήσεις στα ελληνικά, με παραλληλισμούς από τη μητρική σου γλώσσα, και άμεση εξάσκηση.</p>
      <div class="units">${list.map((g, k) => `<button class="unit ${L.grammarSeen.includes(g.t) ? 'done' : ''}" data-g="${k}"><span class="ue">${g.lvl}</span><span class="ut">${h(g.t)}<small>${L.grammarSeen.includes(g.t) ? '✓ ολοκληρώθηκε' : '2 ασκήσεις'}</small></span></button>`).join('')}</div></div>`;
    bindTop(root);
    root.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => G.Run.start(G.Plan.grammarSession(code, list[+b.dataset.g]))));
  };

  /* ---------------------------------------------------- Λεξιλόγιο */
  const status = (id) => {
    const c = G.S.cards[id];
    if (!c) return ['new', 'νέα'];
    if (c.s && !c.r) return ['seed', 'προς επιβεβαίωση'];
    if (c.i >= 21) return ['mast', 'κατακτημένη'];
    if (c.i >= 7) return ['solid', 'σταθερή'];
    return ['learn', 'μαθαίνεται'];
  };
  const words = (root) => {
    const code = G.S.current;
    const items = code === 'el' ? [...G.C.greek('v'), ...G.C.greek('i')] : G.C.allWords(code);
    let q = '', filter = 'all';
    const draw = () => {
      const nq = G.U.stripAccents(q.toLowerCase());
      const list = items.filter((it) => {
        const st = status(it.id)[0];
        if (filter === 'known' && (st === 'new' || st === 'seed')) return false;
        if (filter === 'new' && st !== 'new') return false;
        if (!nq) return true;
        const hay = code === 'el' ? it.w + ' ' + it.def : it.l2 + ' ' + it.el;
        return G.U.stripAccents(hay.toLowerCase()).includes(nq);
      });
      root.querySelector('.wl').innerHTML = list.slice(0, 300).map((it) => { const [cls, lbl] = status(it.id); return code === 'el'
        ? `<li><div><b>${h(it.w)}</b> ${G.EX.say(it.w, 'el')}<div class="small muted">${h(it.def)}</div></div><span class="st ${cls}">${lbl}</span></li>`
        : `<li><div><b class="${G.EX.genderClass(it.l2, code)}" lang="${G.LANGS[code].tts}">${h(it.l2)}</b> ${G.EX.say(it.l2, code)}<div class="small muted">${h(it.emoji)} ${h(it.el)} · ${it.lvl}</div></div><span class="st ${cls}">${lbl}</span></li>`; }).join('') || '<li class="muted">Δεν βρέθηκαν λέξεις.</li>';
      root.querySelector('.cnt').textContent = `${list.length} λέξεις`;
    };
    root.innerHTML = `${topbar()}<div class="page"><h2>📚 Λεξιλόγιο · ${G.LANGS[code].flag}</h2>
      <input class="inp search" placeholder="🔎 Αναζήτηση…" autocomplete="off">
      <div class="chips"><button class="chip on" data-fl="all">Όλες</button><button class="chip" data-fl="known">Που ξέρω</button><button class="chip" data-fl="new">Νέες</button><span class="muted small cnt"></span></div>
      <ul class="list words wl"></ul></div>`;
    bindTop(root);
    root.querySelector('.search').addEventListener('input', (e) => { q = e.target.value; draw(); });
    root.querySelectorAll('[data-fl]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.fl; root.querySelectorAll('[data-fl]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
    draw();
  };

  /* ---------------------------------------------------- Θεωρία & οδηγός συνδετικών */
  const theory = (root) => {
    root.innerHTML = `${topbar()}<div class="page"><h2>🎓 Θεωρία ρητορικής</h2>
      ${G.GR.lessons.map((l) => `<details class="card lesson"><summary>${l.e} ${h(l.t)}</summary><p>${l.b}</p></details>`).join('')}
      <h3>Σχήματα λόγου</h3>
      <ul class="list">${G.C.greek('d').map((d) => `<li><div><b>${h(d.w)}</b><div class="small">${h(d.def)}</div><div class="small muted">${h(d.ex)}</div></div></li>`).join('')}</ul>
      <button class="btn primary wide dgo">Εξάσκηση στα σχήματα λόγου</button></div>`;
    bindTop(root);
    root.querySelector('.dgo').addEventListener('click', () => G.Run.start(G.Plan.greek({ focus: 'd' })));
  };
  const connectors = (root) => {
    root.innerHTML = `${topbar()}<div class="page"><h2>🧭 Συνδετικές λέξεις</h2>
      <p class="muted small">Ο λόγος χωρίς συνδετικά ακούγεται σαν λίστα. Με αυτά, ακούγεται σαν σκέψη. Διάλεξε 1–2 από κάθε κατηγορία που δεν χρησιμοποιείς ποτέ.</p>
      ${Object.entries(G.GR.connectors).map(([k, v]) => `<div class="card slim"><b>${h(k)}</b><div class="syn">${v.map((x) => `<span class="chip">${h(x)}</span>`).join('')}</div></div>`).join('')}
      <button class="btn primary wide cgo">Εξάσκηση</button></div>`;
    bindTop(root);
    root.querySelector('.cgo').addEventListener('click', () => G.Run.start(G.Plan.greek({ focus: 'c' })));
  };

  /* ---------------------------------------------------- Πρόοδος */
  const stats = (root) => {
    const days = []; for (let k = 13; k >= 0; k--) { const d = new Date(Date.now() - k * 86400000); const key = G.U.dayKey(d); days.push([key, G.S.days[key] || { xp: 0, sec: 0 }, d]); }
    const maxXp = Math.max(G.S.settings.dailyXp, ...days.map(([, v]) => v.xp));
    const week = days.slice(-7).reduce((a, [, v]) => a + (v.sec || 0), 0);
    const totalXp = Object.values(G.S.langs).reduce((a, l) => a + (l.xp || 0), 0);
    const ans = Object.values(G.S.days).reduce((a, d) => [a[0] + (d.answers || 0), a[1] + (d.correct || 0)], [0, 0]);
    const p = G.S.profile;
    const MOD = { V: '👁️ Οπτικός', A: '👂 Ακουστικός', R: '📖 Αναγνώστης', K: '🛠️ Πρακτικός' };
    root.innerHTML = `${topbar()}<div class="page"><h2>📈 Πρόοδος</h2>
      <div class="stats3"><div><b>🔥${G.S.streak.count}</b><span>σερί (ρεκόρ ${G.S.streak.best})</span></div><div><b>${totalXp}</b><span>συνολικά XP</span></div><div><b>${Math.round(week / 60)}′</b><span>αυτή την εβδομάδα</span></div></div>
      <div class="muted small center">🧊 Παγώματα σερί διαθέσιμα: ${G.S.streak.freezes} · ακρίβεια όλων των απαντήσεων: ${ans[0] ? Math.round((ans[1] / ans[0]) * 100) : 0}%</div>
      <h3>Τελευταίες 14 μέρες</h3>
      <div class="chart">${days.map(([k, v, d]) => `<div class="col" title="${k}: ${v.xp} XP"><i style="height:${Math.round((v.xp / maxXp) * 100)}%" class="${v.xp >= G.S.settings.dailyXp ? 'hit' : ''}"></i><span>${'ΚΔΤΤΠΠΣ'[d.getDay()]}</span></div>`).join('')}</div>
      <h3>Γλώσσες</h3>
      <div class="langstats">${G.LANG_ORDER.map((c) => { const L = G.S.langs[c]; const cc = G.SRS.countBy(c + ':'); return `<div class="card slim row between" data-lang-switch="${c}"><div><b>${G.LANGS[c].flag} ${h(G.LANGS[c].name)}</b><div class="small muted">${L && L.level ? (c === 'el' ? ['Βάση', 'Καλός χειριστής', 'Προχωρημένος', 'Λόγιος'][+L.level.slice(1)] : L.level) : 'δεν ξεκίνησε'} · ${(L && L.xp) || 0} XP</div></div><div class="small right">${cc.learned} μαθημένα<br>${cc.mastered} κατακτημένα</div></div>`; }).join('')}</div>
      ${G.S.speeches.length ? `<h3>Ομιλίες</h3>${G.Lab.sparkline(G.S.speeches.slice(-15).map((s) => s.score))}<div class="muted small">Μ.ό. τελευταίων 5: ${Math.round(G.S.speeches.slice(-5).reduce((a, s) => a + s.score, 0) / Math.min(5, G.S.speeches.length))}/100</div>` : ''}
      ${p ? `<h3>Προφίλ μάθησης</h3><div class="bars">${'VARK'.split('').sort((a, b) => p.mod[b] - p.mod[a]).map((k) => `<div class="bar"><span>${MOD[k]}</span><div><i style="width:${Math.round(p.mod[k] * 100)}%"></i></div><b>${Math.round(p.mod[k] * 100)}%</b></div>`).join('')}</div>` : ''}
      <button class="btn ghost wide retake">↻ Επανάληψη τεστ προφίλ</button></div>`;
    bindTop(root);
    root.querySelectorAll('.langstats [data-lang-switch]').forEach((b) => b.addEventListener('click', () => { G.S.current = b.dataset.langSwitch; G.Store.save(); location.hash = '#/home'; }));
    root.querySelector('.retake').addEventListener('click', () => G.Tests.profileStart());
  };

  /* ---------------------------------------------------- Ρυθμίσεις */
  const settings = (root) => {
    const S = G.S.settings;
    const voiceRows = G.LANG_ORDER.map((c) => { const vs = G.Speech.voicesFor(c); const cur = G.Speech.voiceFor(c); return `<div class="row between vrow"><span>${G.LANGS[c].flag}</span>${vs.length ? `<select data-voice="${c}">${vs.map((v) => `<option ${cur && v.name === cur.name ? 'selected' : ''}>${h(v.name)}</option>`).join('')}</select>` : '<span class="muted small">καμία φωνή</span>'}<button class="btn ghost sm" data-test="${c}">▶</button></div>`; }).join('');
    root.innerHTML = `${topbar()}<div class="page settings"><h2>⚙️ Ρυθμίσεις</h2>
      <div class="card"><h3>Στόχος</h3><div class="chips">${[30, 60, 120, 180].map((x) => `<button class="chip ${S.dailyXp === x ? 'on' : ''}" data-xp="${x}">${x} XP</button>`).join('')}</div>
        <label class="row between">Μέγεθος μαθήματος <select class="size">${[8, 12, 15, 20, 25, 35].map((x) => `<option ${(G.S.profile && G.S.profile.size) === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>
      <div class="card"><h3>Φωνή & ήχος</h3>
        <label class="row between">Ταχύτητα ομιλίας <input type="range" min="0.6" max="1.2" step="0.05" value="${S.rate}" class="rate"><b class="ratev">${S.rate}</b></label>
        <label class="row between">Αυτόματη εκφώνηση <input type="checkbox" class="autoplay" ${S.autoplay ? 'checked' : ''}></label>
        <label class="row between">Ήχοι σωστού/λάθους <input type="checkbox" class="sound" ${S.sound ? 'checked' : ''}></label>
        <label class="row between">Δόνηση <input type="checkbox" class="haptics" ${S.haptics ? 'checked' : ''}></label>
        <div class="voices">${voiceRows}</div>
        <p class="muted small">Λείπει φωνή; Android: Ρυθμίσεις → Σύστημα → Γλώσσες → Μετατροπή κειμένου σε ομιλία → εγκατάσταση δεδομένων φωνής. iPhone: Ρυθμίσεις → Προσβασιμότητα → Εκφώνηση περιεχομένου → Φωνές.</p></div>
      <div class="card"><h3>Εμφάνιση</h3><div class="chips">${[['auto', 'Αυτόματο'], ['light', 'Φωτεινό'], ['dark', 'Σκοτεινό']].map(([k, l]) => `<button class="chip ${S.theme === k ? 'on' : ''}" data-theme="${k}">${l}</button>`).join('')}</div></div>
      <div class="card"><h3>Τεστ</h3><button class="btn ghost wide prof">↻ Τεστ προφίλ μάθησης</button>
        <div class="chips">${G.LANG_ORDER.map((c) => `<button class="chip" data-place="${c}">${G.LANGS[c].flag} Κατάταξη</button>`).join('')}</div></div>
      <div class="card"><h3>Δεδομένα</h3><p class="muted small">Όλα αποθηκεύονται <b>μόνο στη συσκευή σου</b>. Κάνε τακτικά αντίγραφο ασφαλείας — αν καθαρίσεις τα δεδομένα του browser, χάνονται.</p>
        <div class="row"><button class="btn ghost exp">⬇️ Αντίγραφο</button><label class="btn ghost imp">⬆️ Επαναφορά<input type="file" accept="application/json,.json" hidden></label></div>
        <button class="btn danger wide reset">Διαγραφή όλων</button></div>
      <p class="muted small center">Πολύγλωσσος · λειτουργεί εκτός σύνδεσης · χωρίς λογαριασμό, χωρίς διαφημίσεις</p></div>`;
    bindTop(root);
    const $ = (s) => root.querySelector(s);
    root.querySelectorAll('[data-xp]').forEach((b) => b.addEventListener('click', () => { S.dailyXp = +b.dataset.xp; G.Store.save(); settings(root); }));
    $('.size').addEventListener('change', (e) => { G.S.profile = G.S.profile || { mod: { V: 0.25, A: 0.25, R: 0.25, K: 0.25 } }; G.S.profile.size = +e.target.value; G.Store.save(); });
    $('.rate').addEventListener('input', (e) => { S.rate = +e.target.value; $('.ratev').textContent = S.rate; G.Store.save(); });
    for (const k of ['autoplay', 'sound', 'haptics']) $('.' + k).addEventListener('change', (e) => { S[k] = e.target.checked; G.Store.save(); });
    root.querySelectorAll('[data-voice]').forEach((s) => s.addEventListener('change', () => { S.voices[s.dataset.voice] = s.value; G.Store.save(); }));
    const SAMPLE = { en: 'Hello, how are you today?', fr: 'Bonjour, comment allez-vous ?', es: 'Hola, ¿qué tal estás?', it: 'Ciao, come stai oggi?', de: 'Hallo, wie geht es dir heute?', el: 'Καλημέρα, τι κάνετε σήμερα;' };
    root.querySelectorAll('[data-test]').forEach((b) => b.addEventListener('click', () => G.Speech.speak(SAMPLE[b.dataset.test], b.dataset.test)));
    root.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => { S.theme = b.dataset.theme; G.Store.save(); G.App.applyTheme(); settings(root); }));
    $('.prof').addEventListener('click', () => G.Tests.profileStart());
    root.querySelectorAll('[data-place]').forEach((b) => b.addEventListener('click', () => G.Tests.placementStart(b.dataset.place)));
    $('.exp').addEventListener('click', () => {
      const blob = new Blob([G.Store.exportJson()], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `polyglossos-backup-${G.U.dayKey()}.json`; document.body.appendChild(a); a.click(); a.remove();
    });
    $('.imp input').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { G.Store.importJson(await f.text()); G.toast('✅ Τα δεδομένα επαναφέρθηκαν'); location.hash = '#/home'; G.App.render(); } catch (err) { G.toast('❌ ' + err.message); }
    });
    $('.reset').addEventListener('click', () => { if (confirm('Σίγουρα; Θα διαγραφούν όλη η πρόοδος και οι ρυθμίσεις.') && confirm('Τελευταία ευκαιρία — να διαγραφούν όλα;')) { G.Store.reset(); G.Store.save(true); location.hash = '#/welcome'; G.App.render(); } });
  };

  /* ---------------------------------------------------- Onboarding */
  const welcome = (root) => {
    root.innerHTML = `<div class="page welcome">
      <div class="logo">Π</div><h1>Πολύγλωσσος</h1>
      <p class="lead">Αγγλικά, Γαλλικά, Ισπανικά, Ιταλικά, Γερμανικά — και Ελληνικά σε επίπεδο ρήτορα.</p>
      <ul class="list feat">
        <li>🧭 Προφίλ μάθησης με πραγματική δοκιμή μνήμης</li>
        <li>🎯 Προσαρμοστικό τεστ κατάταξης A1–C2</li>
        <li>🔁 Επανάληψη τη σωστή στιγμή — όχι νωρίτερα, όχι αργότερα</li>
        <li>🎧🗣️ Ακρόαση, υπαγόρευση, ομιλία με αναγνώριση φωνής</li>
        <li>🎤 Εργαστήριο λόγου: ρυθμός, γεμίσματα, λεξιλόγιο, δομή</li>
        <li>📴 Λειτουργεί εκτός σύνδεσης · τα δεδομένα μένουν στο κινητό σου</li>
      </ul>
      <button class="btn primary wide big go">Ξεκίνα (~4′)</button>
      <button class="btn ghost wide skip">Παράλειψη τεστ προφίλ</button></div>`;
    root.querySelector('.go').addEventListener('click', () => G.Tests.profileStart());
    root.querySelector('.skip').addEventListener('click', () => { location.hash = '#/choose'; });
  };
  const choose = (root) => {
    const sel = new Set(G.S.chosen || ['en']);
    let primary = G.S.current && sel.has(G.S.current) ? G.S.current : [...sel][0];
    const draw = () => {
      root.innerHTML = `<div class="page"><h2>Ποιες γλώσσες θέλεις;</h2>
        <p class="muted small">Όλες είναι προεγκατεστημένες — διάλεξε με ποιες ξεκινάς. Πάτα ξανά για να ορίσεις την <b>κύρια</b> ⭐.</p>
        <div class="langpick">${G.LANG_ORDER.map((c) => `<button class="lp ${sel.has(c) ? 'on' : ''} ${c === primary ? 'pri' : ''}" data-c="${c}"><span>${G.LANGS[c].flag}</span><b>${h(G.LANGS[c].name)}</b><small>${h(G.LANGS[c].native)}</small>${c === primary ? '<i>⭐</i>' : ''}</button>`).join('')}</div>
        ${sel.size > 2 ? '<div class="note">💬 Συμβουλή δασκάλου: με περισσότερες από 2 νέες γλώσσες ταυτόχρονα η πρόοδος σε καθεμία επιβραδύνεται και οι γλώσσες «μπερδεύονται» (ειδικά ισπανικά–ιταλικά). Πρότασή μου: 1 κύρια καθημερινά + τις άλλες μόνο με τις επαναλήψεις τους.</div>' : ''}
        <button class="btn primary wide big go" ${sel.size ? '' : 'disabled'}>Συνέχεια: τεστ κατάταξης ${primary ? G.LANGS[primary].flag : ''}</button>
        <button class="btn ghost wide skip" ${sel.size ? '' : 'disabled'}>Χωρίς τεστ — ξεκίνα από την αρχή</button></div>`;
      root.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => {
        const c = b.dataset.c;
        if (!sel.has(c)) { sel.add(c); primary = primary || c; }
        else if (primary !== c) primary = c;
        else { sel.delete(c); primary = [...sel][0] || null; }
        draw();
      }));
      const done = () => { G.S.chosen = [...sel]; G.S.current = primary; G.S.onboarded = true; sel.forEach((c) => G.Store.lang(c)); G.Store.save(true); };
      root.querySelector('.go').addEventListener('click', () => { done(); G.Tests.placementStart(primary); });
      root.querySelector('.skip').addEventListener('click', () => { done(); const L = G.Store.lang(primary); if (!L.level) { L.level = primary === 'el' ? 'N1' : 'A0'; L.ntier = 1; } G.Store.save(); location.hash = '#/home'; });
    };
    draw();
  };

  return { home, lessons, grammar, words, theory, connectors, stats, settings, welcome, choose };
})();
