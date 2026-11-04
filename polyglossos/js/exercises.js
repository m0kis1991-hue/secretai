/* Ασκήσεις. Κάθε άσκηση: (el, step, ctx) — ctx.answer({ok, grade, note, correct}) ή ctx.next(). */
window.G = window.G || {};
G.EX = (() => {
  const h = G.U.esc;
  const say = (text, code, cls = '') => `<button class="say ${cls}" data-say="${h(text)}" data-lang="${code}" aria-label="Άκουσε">🔊</button>`;
  const slow = (text, code) => `<button class="say slow" data-say="${h(text)}" data-lang="${code}" data-slow="1" aria-label="Αργά">🐢</button>`;
  const ART_RE = /^(der|die|das|le|la|les|l'|el|los|las|il|lo|gli|i)\s*/i;
  /* Χρωματισμός γένους — βοηθά τη μνήμη: αρσ. μπλε, θηλ. κόκκινο, ουδ. πράσινο */
  const genderClass = (l2, code) => {
    const a = (l2.match(ART_RE) || [])[1]; if (!a) return '';
    const x = a.toLowerCase();
    if (code === 'de') return x === 'der' ? 'g-m' : x === 'die' ? 'g-f' : x === 'das' ? 'g-n' : '';
    if (['le', 'el', 'il', 'lo', 'los', 'gli', 'i'].includes(x)) return 'g-m';
    if (['la', 'las'].includes(x)) return 'g-f';
    return '';
  };
  const options = (el, list, correct, ctx, { lang = null, big = false } = {}) => {
    const opts = G.U.shuffle(list);
    el.querySelector('.opts').innerHTML = opts.map((o, k) => `<button class="opt ${big ? 'big' : ''}" data-k="${k}" ${lang ? `lang="${G.LANGS[lang].tts}"` : ''}>${h(o)}</button>`).join('');
    el.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
      if (el.dataset.done) return; el.dataset.done = 1;
      const v = opts[+b.dataset.k], ok = v === correct;
      b.classList.add(ok ? 'right' : 'wrong');
      if (!ok) el.querySelectorAll('.opt').forEach((x) => { if (opts[+x.dataset.k] === correct) x.classList.add('right'); });
      ctx.answer({ ok, grade: ok ? 2 : 0, correct });
    }));
  };
  const specialChars = { fr: 'é è ê à â ç ô û ù î ï œ', es: 'á é í ó ú ñ ü ¿ ¡', it: 'à è é ì ò ù', de: 'ä ö ü ß Ä Ö Ü', en: '', el: '' };
  const typeBox = (el, expected, code, ctx, { hint = true } = {}) => {
    const chars = (specialChars[code] || '').split(' ').filter(Boolean);
    el.querySelector('.typebox').innerHTML = `
      <input class="inp" autocomplete="off" autocapitalize="off" spellcheck="false" lang="${G.LANGS[code].tts}" placeholder="Γράψε εδώ…">
      ${chars.length ? `<div class="chars">${chars.map((c) => `<button class="ch" type="button">${c}</button>`).join('')}</div>` : ''}
      <div class="row">${hint ? '<button class="btn ghost hint" type="button">💡 Βοήθεια</button>' : ''}<button class="btn primary check" type="button">Έλεγχος</button></div>`;
    const inp = el.querySelector('.inp');
    setTimeout(() => inp.focus(), 50);
    el.querySelectorAll('.ch').forEach((b) => b.addEventListener('click', () => { const p = inp.selectionStart || inp.value.length; inp.value = inp.value.slice(0, p) + b.textContent + inp.value.slice(p); inp.focus(); inp.setSelectionRange(p + 1, p + 1); }));
    let hints = 0;
    const hb = el.querySelector('.hint');
    if (hb) hb.addEventListener('click', () => { const v = G.Check.variants(expected)[0]; hints++; inp.value = v.slice(0, Math.min(v.length - 1, hints * 2)); inp.focus(); });
    const go = () => {
      if (el.dataset.done || !inp.value.trim()) return; el.dataset.done = 1; inp.blur();
      const r = G.Check.answer(inp.value, expected, code);
      if (hints && r.ok) r.grade = 1;
      inp.classList.add(r.ok ? 'right' : 'wrong');
      ctx.answer({ ok: r.ok, grade: r.grade, note: r.note, correct: expected });
    };
    el.querySelector('.check').addEventListener('click', go);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  };
  const autoplay = (text, code) => { if (G.S.settings.autoplay) setTimeout(() => G.Speech.speak(text, code), 250); };

  /* ======================= ΞΕΝΕΣ ΓΛΩΣΣΕΣ ======================= */
  const X = {};

  X.intro = (el, st, ctx) => {
    const w = ctx.item;
    el.innerHTML = `<div class="tag">Νέα λέξη</div>
      <div class="card intro">
        <div class="emoji">${h(w.emoji || '📘')}</div>
        <div class="l2 ${genderClass(w.l2, w.code)}" lang="${G.LANGS[w.code].tts}">${h(w.l2)}</div>
        <div class="row center">${say(w.l2, w.code, 'lg')}${slow(w.l2, w.code)}</div>
        <div class="el">${h(w.el)}</div>
        ${genderClass(w.l2, w.code) ? '<div class="muted small">Το χρώμα δείχνει το γένος: <span class="g-m">αρσενικό</span> · <span class="g-f">θηλυκό</span>' + (w.code === 'de' ? ' · <span class="g-n">ουδέτερο</span>' : '') + '</div>' : ''}
      </div>
      <button class="btn primary wide go">Το κράτησα →</button>`;
    autoplay(w.l2, w.code);
    el.querySelector('.go').addEventListener('click', () => ctx.next(3));
  };

  X.mc_l2_l1 = (el, st, ctx) => {
    const w = ctx.item;
    el.innerHTML = `<div class="tag">Τι σημαίνει;</div>
      <div class="prompt"><span class="l2 ${genderClass(w.l2, w.code)}" lang="${G.LANGS[w.code].tts}">${h(w.l2)}</span>${say(w.l2, w.code)}</div>
      <div class="opts"></div>`;
    autoplay(w.l2, w.code);
    options(el, [w.el, ...G.C.wordDistractors(w, 3, 'el').map((x) => x.el)], w.el, ctx);
  };

  X.mc_l1_l2 = (el, st, ctx) => {
    const w = ctx.item;
    el.innerHTML = `<div class="tag">Πώς λέγεται;</div>
      <div class="prompt"><span class="el big">${h(w.el)}</span></div>
      <div class="opts"></div>`;
    options(el, [w.l2, ...G.C.wordDistractors(w, 3).map((x) => x.l2)], w.l2, ctx, { lang: w.code });
  };

  X.emoji_mc = (el, st, ctx) => {
    const w = ctx.item;
    el.innerHTML = `<div class="tag">Ποια λέξη ταιριάζει στην εικόνα;</div>
      <div class="prompt"><span class="emoji huge">${h(w.emoji)}</span></div>
      <div class="opts"></div>`;
    options(el, [w.l2, ...G.C.wordDistractors(w, 3).map((x) => x.l2)], w.l2, ctx, { lang: w.code });
  };

  X.listen_mc = (el, st, ctx) => {
    const w = ctx.item;
    el.innerHTML = `<div class="tag">Άκου και διάλεξε τη σημασία</div>
      <div class="prompt listen">${say(w.l2, w.code, 'xl')}${slow(w.l2, w.code)}</div>
      <div class="opts"></div>`;
    setTimeout(() => G.Speech.speak(w.l2, w.code), 250);
    options(el, [w.el, ...G.C.wordDistractors(w, 3, 'el').map((x) => x.el)], w.el, ctx);
  };

  X.type_l1_l2 = (el, st, ctx) => {
    const w = ctx.item;
    el.innerHTML = `<div class="tag">Γράψε στα ${h(G.LANGS[w.code].name)}</div>
      <div class="prompt"><span class="emoji">${h(w.emoji || '')}</span><span class="el big">${h(w.el)}</span></div>
      <div class="typebox"></div>`;
    typeBox(el, w.l2, w.code, ctx);
  };

  X.dictation = (el, st, ctx) => {
    const w = ctx.item;
    el.innerHTML = `<div class="tag">Υπαγόρευση: γράψε ό,τι ακούς</div>
      <div class="prompt listen">${say(w.l2, w.code, 'xl')}${slow(w.l2, w.code)}</div>
      <div class="typebox"></div>`;
    setTimeout(() => G.Speech.speak(w.l2, w.code), 250);
    typeBox(el, w.l2, w.code, ctx, { hint: w.kind === 'w' });
  };

  /* Ομιλία: shadowing + αναγνώριση φωνής (ή αυτοαξιολόγηση αν δεν υποστηρίζεται) */
  X.speak = (el, st, ctx) => {
    const w = ctx.item, code = w.code === 'el' ? 'el' : w.code;
    const text = w.l2;
    el.innerHTML = `<div class="tag">Πες το δυνατά</div>
      <div class="card">
        <div class="l2 ${genderClass(text, code)}" lang="${G.LANGS[code].tts}">${h(text)}</div>
        <div class="el">${h(w.el)}</div>
        <div class="row center">${say(text, code, 'lg')}${slow(text, code)}</div>
      </div>
      <div class="speakzone">
        ${G.Speech.srSupported ? '<button class="mic" type="button" aria-label="Μίλα">🎤</button><div class="heard muted">Πάτα το μικρόφωνο και μίλα</div>' : '<div class="muted small">Η συσκευή δεν υποστηρίζει αναγνώριση φωνής. Άκου, επανάλαβε δυνατά και αξιολόγησε τον εαυτό σου.</div>'}
        <div class="row center self ${G.Speech.srSupported ? 'hidden' : ''}"><button class="btn ghost" data-g="1">😕 Δυσκολεύτηκα</button><button class="btn primary" data-g="2">👍 Το είπα καλά</button></div>
      </div>`;
    autoplay(text, code);
    let tries = 0;
    const selfBtns = el.querySelector('.self');
    selfBtns.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { if (el.dataset.done) return; el.dataset.done = 1; ctx.answer({ ok: true, grade: +b.dataset.g, correct: text, self: true }); }));
    const mic = el.querySelector('.mic');
    if (mic) mic.addEventListener('click', async () => {
      if (el.dataset.done || mic.classList.contains('on')) return;
      G.Speech.stop(); mic.classList.add('on'); el.querySelector('.heard').textContent = 'Ακούω…';
      const r = await G.Speech.listenOnce(code);
      mic.classList.remove('on');
      const heard = el.querySelector('.heard');
      if (!r || r.error || !r.text) {
        heard.textContent = r && (r.error === 'not-allowed' || r.error === 'service-not-allowed') ? 'Δεν δόθηκε άδεια μικροφώνου. Αξιολόγησε μόνος σου:' : r && r.error === 'network' ? 'Η αναγνώριση φωνής χρειάζεται internet. Αξιολόγησε μόνος σου:' : 'Δεν άκουσα κάτι. Ξαναδοκίμασε ή αξιολόγησε μόνος σου:';
        selfBtns.classList.remove('hidden'); return;
      }
      const sim = G.Check.speech(r.alts, text); tries++;
      heard.innerHTML = `Άκουσα: «${h(r.text)}» <b>${Math.round(sim * 100)}%</b>`;
      if (sim >= 0.8) { el.dataset.done = 1; ctx.answer({ ok: true, grade: sim >= 0.92 ? 2 : 1, correct: text, note: sim >= 0.92 ? 'Εξαιρετική προφορά!' : 'Καλή προσπάθεια — άκου ξανά το πρότυπο.' }); }
      else if (tries >= 2) { selfBtns.classList.remove('hidden'); heard.innerHTML += '<br><span class="small">Η αναγνώριση δεν είναι τέλεια· αν πιστεύεις ότι το είπες σωστά, πες το:</span>'; }
      else heard.innerHTML += '<br><span class="small">Ξαναδοκίμασε — άκου πρώτα το πρότυπο 🔊</span>';
    });
  };

  /* Αντιστοίχιση ζευγαριών — για ομάδα λέξεων */
  X.match = (el, st, ctx) => {
    const items = st.ids.map(G.C.item);
    const left = G.U.shuffle(items), right = G.U.shuffle(items);
    el.innerHTML = `<div class="tag">Αντιστοίχισε τα ζευγάρια</div>
      <div class="match"><div class="col l">${left.map((w) => `<button class="tile" data-id="${w.id}" lang="${G.LANGS[w.code].tts}">${h(w.l2)}</button>`).join('')}</div>
      <div class="col r">${right.map((w) => `<button class="tile" data-id="${w.id}">${h(w.el)}</button>`).join('')}</div></div>`;
    let sel = null; const errs = {}; let left_ = items.length;
    el.querySelectorAll('.tile').forEach((b) => b.addEventListener('click', () => {
      if (b.classList.contains('done')) return;
      const side = b.closest('.col').classList.contains('l') ? 'l' : 'r';
      if (side === 'l') G.Speech.speak(G.C.item(b.dataset.id).l2, items[0].code);
      if (!sel || sel.side === side) { el.querySelectorAll('.tile.sel').forEach((x) => x.classList.remove('sel')); sel = { b, side }; b.classList.add('sel'); return; }
      if (sel.b.dataset.id === b.dataset.id) {
        [sel.b, b].forEach((x) => { x.classList.remove('sel'); x.classList.add('done'); });
        G.U.tone(true); left_--; sel = null;
        if (!left_) setTimeout(() => ctx.answerGroup(items.map((w) => ({ id: w.id, grade: errs[w.id] ? 1 : 2 }))), 300);
      } else {
        errs[sel.b.dataset.id] = 1; errs[b.dataset.id] = 1;
        [sel.b, b].forEach((x) => { x.classList.add('shake'); setTimeout(() => x.classList.remove('shake', 'sel'), 400); });
        G.U.tone(false); G.U.vibrate(60); sel = null;
      }
    }));
  };

  /* Πρόταση: τοκενοποίηση για «σειρά λέξεων» */
  const tokens = (s) => s.replace(/[¿¡]/g, '').split(/\s+/).map((t) => t.replace(/^[«"(]+|[.,!?;:»")]+$/g, '')).filter((t) => t && !/^[?!:;.,]+$/.test(t));
  X.order = (el, st, ctx) => {
    const s = ctx.item, target = tokens(s.l2);
    const extra = G.C.sentDistractors(s, 2).map((x) => G.U.pick(tokens(x.l2))).filter((t) => !target.map((z) => z.toLowerCase()).includes(t.toLowerCase()));
    const pool = G.U.shuffle([...target, ...extra].map((t, k) => ({ t, k })));
    el.innerHTML = `<div class="tag">Φτιάξε την πρόταση</div>
      <div class="prompt"><span class="el">${h(s.el)}</span></div>
      <div class="answerline"></div><div class="bank">${pool.map((p) => `<button class="tok" data-k="${p.k}" lang="${G.LANGS[s.code].tts}">${h(p.t)}</button>`).join('')}</div>
      <div class="row"><button class="btn ghost reset" type="button">↺</button><button class="btn primary check" type="button">Έλεγχος</button></div>`;
    const line = el.querySelector('.answerline'), bank = el.querySelector('.bank');
    bank.addEventListener('click', (e) => { const b = e.target.closest('.tok'); if (!b || el.dataset.done) return; line.appendChild(b); });
    line.addEventListener('click', (e) => { const b = e.target.closest('.tok'); if (!b || el.dataset.done) return; bank.appendChild(b); });
    el.querySelector('.reset').addEventListener('click', () => { if (el.dataset.done) return; [...line.children].forEach((b) => bank.appendChild(b)); });
    el.querySelector('.check').addEventListener('click', () => {
      if (el.dataset.done || !line.children.length) return; el.dataset.done = 1;
      const got = [...line.children].map((b) => b.textContent).join(' ');
      const ok = G.U.norm(got) === G.U.norm(target.join(' '));
      line.classList.add(ok ? 'right' : 'wrong');
      ctx.answer({ ok, grade: ok ? 2 : 0, correct: s.l2 });
    });
  };

  X.cloze = (el, st, ctx) => {
    const s = ctx.item, toks = tokens(s.l2);
    const unitWords = G.C.unit(s.code, s.unit).words.map((w) => G.Check.strip(G.U.norm(w.l2.split(' / ')[0]), s.code));
    let idx = toks.findIndex((t) => unitWords.includes(G.U.norm(t)));
    if (idx < 0) { const cands = toks.map((t, k) => [t, k]).filter(([t]) => t.replace(/'/g, '').length >= 4); idx = cands.length ? G.U.pick(cands)[1] : 0; }
    const answer = toks[idx];
    const others = G.C.allSents(s.code).filter((x) => x.id !== s.id).flatMap((x) => tokens(x.l2)).filter((t) => t.length >= 3 && G.U.norm(t) !== G.U.norm(answer));
    const near = others.filter((t) => Math.abs(t.length - answer.length) <= 3);
    const dist = [...new Set(G.U.shuffle(near.length > 10 ? near : others).map((t) => t))].slice(0, 3);
    const shown = s.l2.replace(new RegExp('(^|[\\s¿¡«(])' + answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[\\s.,!?;:»)])'), '$1<span class="blank">____</span>');
    el.innerHTML = `<div class="tag">Συμπλήρωσε το κενό</div>
      <div class="prompt col"><span class="l2 sent" lang="${G.LANGS[s.code].tts}">${shown.includes('blank') ? shown.split('<span class="blank">____</span>').map(h).join('<span class="blank">____</span>') : h(s.l2)}</span><span class="el small">${h(s.el)}</span></div>
      <div class="opts"></div>`;
    options(el, [answer, ...dist], answer, ctx, { lang: s.code });
  };

  X.listen_sentence = (el, st, ctx) => {
    const s = ctx.item;
    el.innerHTML = `<div class="tag">Άκου την πρόταση — τι σημαίνει;</div>
      <div class="prompt listen">${say(s.l2, s.code, 'xl')}${slow(s.l2, s.code)}</div>
      <div class="opts"></div>`;
    setTimeout(() => G.Speech.speak(s.l2, s.code), 250);
    options(el, [s.el, ...G.C.sentDistractors(s, 3).map((x) => x.el)], s.el, ctx);
  };

  X.grammar = (el, st, ctx) => {
    const g = st.g, code = st.code;
    el.innerHTML = `<div class="tag">Γραμματική · ${h(g.lvl)}</div>
      <div class="card grammar"><h3>${h(g.t)}</h3><p>${g.b}</p>
      <ul class="examples">${g.x.map(([a, b]) => `<li><span lang="${G.LANGS[code].tts}">${h(a)}</span> ${say(a, code)}<br><span class="muted">${h(b)}</span></li>`).join('')}</ul></div>
      <button class="btn primary wide go">Ας το εξασκήσουμε →</button>`;
    el.querySelector('.go').addEventListener('click', () => { const L = G.Store.lang(code); if (!L.grammarSeen.includes(g.t)) L.grammarSeen.push(g.t); G.Store.save(); ctx.next(5); });
  };

  X.quiz = (el, st, ctx) => {
    const [q, right, ...wrong] = st.q;
    const parts = q.split('___');
    el.innerHTML = `<div class="tag">${st.label ? h(st.label) : 'Διάλεξε τη σωστή επιλογή'}</div>
      <div class="prompt"><span class="l2 sent" lang="${G.LANGS[st.code] ? G.LANGS[st.code].tts : 'el-GR'}">${parts.map(h).join('<span class="blank">____</span>')}</span></div>
      <div class="opts"></div>`;
    options(el, [right, ...wrong], right, ctx, { lang: st.code });
  };

  /* ======================= ΕΛΛΗΝΙΚΑ ======================= */
  const stemMatch = (token, lemma) => {
    const a = G.U.stripAccents(token.toLowerCase()), b = G.U.stripAccents(lemma.toLowerCase());
    let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++;
    return k;
  };
  const highlight = (ex, lemma) => {
    const toks = ex.split(/(\s+)/);
    let best = -1, bestK = 0;
    toks.forEach((t, i) => { const k = stemMatch(t.replace(/[.,;:!·«»]/g, ''), lemma); if (k > bestK) { bestK = k; best = i; } });
    if (bestK < Math.min(4, lemma.length - 2)) return { html: h(ex), idx: -1, toks };
    return { html: toks.map((t, i) => (i === best ? `<b>${h(t)}</b>` : h(t))).join(''), idx: best, toks };
  };

  X.g_intro = (el, st, ctx) => {
    const v = ctx.item;
    el.innerHTML = `<div class="tag">Λέξη για τη φαρέτρα σου · βαθμίδα ${v.tier}</div>
      <div class="card intro lex">
        <div class="l2">${h(v.w)}</div>
        <div class="row center">${say(v.w, 'el', 'lg')}</div>
        <div class="def">${h(v.def)}</div>
        <div class="exm">«${highlight(v.ex, v.w).html}» ${say(v.ex, 'el')}</div>
        <div class="syn">${v.syn.split(',').map((s) => `<span class="chip">${h(s.trim())}</span>`).join('')}</div>
      </div>
      <div class="muted small center">Συμβουλή: πες τη λέξη δυνατά και φτιάξε μία δική σου πρόταση με αυτήν τώρα.</div>
      <button class="btn primary wide go">Το κράτησα →</button>`;
    el.querySelector('.go').addEventListener('click', () => ctx.next(3));
  };
  X.g_def2word = (el, st, ctx) => {
    const v = ctx.item;
    el.innerHTML = `<div class="tag">Ποια λέξη ταιριάζει στον ορισμό;</div>
      <div class="prompt"><span class="el">${h(v.def)}</span></div><div class="opts"></div>`;
    options(el, [v.w, ...G.C.greekDistractors(v, 3, 'w')], v.w, ctx);
  };
  X.g_word2def = (el, st, ctx) => {
    const v = ctx.item;
    el.innerHTML = `<div class="tag">Τι σημαίνει;</div>
      <div class="prompt"><span class="l2">${h(v.w)}</span>${say(v.w, 'el')}</div><div class="opts"></div>`;
    options(el, [v.def, ...G.C.greekDistractors(v, 3, 'def')], v.def, ctx);
  };
  X.g_cloze = (el, st, ctx) => {
    const v = ctx.item, hl = highlight(v.ex, v.w);
    if (hl.idx < 0) return X.g_def2word(el, st, ctx);
    const shown = hl.toks.map((t, i) => (i === hl.idx ? '<span class="blank">____</span>' + h(t.replace(/^[^.,;:!·«»]+/, '')) : h(t))).join('');
    el.innerHTML = `<div class="tag">Συμπλήρωσε (σε κατάλληλο τύπο)</div>
      <div class="prompt"><span class="el">${shown}</span></div><div class="opts"></div>`;
    options(el, [v.w, ...G.C.greekDistractors(v, 3, 'w')], v.w, ctx);
  };
  X.g_use = (el, st, ctx) => {
    const v = ctx.item;
    el.innerHTML = `<div class="tag">Παραγωγή λόγου</div>
      <div class="prompt col"><span class="el">Φτιάξε μια δική σου πρόταση με τη λέξη</span><span class="l2">${h(v.w)}</span><span class="muted small">${h(v.def)}</span></div>
      <textarea class="inp area" rows="3" placeholder="Γράψε ή υπαγόρευσε την πρότασή σου…"></textarea>
      <div class="row">${G.Speech.srSupported ? '<button class="btn ghost micbtn" type="button">🎤 Υπαγόρευση</button>' : ''}<button class="btn primary check" type="button">Έλεγχος</button></div>`;
    const ta = el.querySelector('.area');
    const mb = el.querySelector('.micbtn');
    if (mb) mb.addEventListener('click', async () => { mb.textContent = '🎙️ Ακούω…'; const r = await G.Speech.listenOnce('el', { timeout: 12000 }); mb.textContent = '🎤 Υπαγόρευση'; if (r && r.text) ta.value = (ta.value + ' ' + r.text).trim(); });
    el.querySelector('.check').addEventListener('click', () => {
      if (el.dataset.done) return; const txt = ta.value.trim(); if (!txt) return;
      el.dataset.done = 1;
      const toks = G.U.words(txt);
      const need = Math.max(4, Math.min(v.w.length - 2, 7));
      const has = toks.some((t) => stemMatch(t, v.w) >= need);
      const n = toks.length;
      if (!has) return ctx.answer({ ok: false, grade: 0, correct: v.w, note: 'Δεν βρήκα τη λέξη στην πρότασή σου. Παράδειγμα: «' + v.ex + '»' });
      ctx.answer({ ok: true, grade: n >= 6 ? 3 : 2, correct: v.w, note: n < 6 ? 'Σωστή χρήση! Δοκίμασε την επόμενη φορά μια πιο σύνθετη πρόταση.' : 'Ωραία! Σύγκρινε με το παράδειγμα: «' + v.ex + '»' });
    });
  };
  X.i_intro = (el, st, ctx) => {
    const v = ctx.item;
    el.innerHTML = `<div class="tag">Λόγια έκφραση</div>
      <div class="card intro lex"><div class="l2">${h(v.w)}</div><div class="row center">${say(v.w, 'el', 'lg')}</div>
      <div class="def">${h(v.def)}</div><div class="exm">«${h(v.ex)}» ${say(v.ex, 'el')}</div></div>
      <button class="btn primary wide go">Το κράτησα →</button>`;
    el.querySelector('.go').addEventListener('click', () => ctx.next(3));
  };
  X.i_meaning = (el, st, ctx) => {
    const v = ctx.item;
    el.innerHTML = `<div class="tag">Τι σημαίνει η έκφραση;</div>
      <div class="prompt"><span class="l2">${h(v.w)}</span>${say(v.w, 'el')}</div><div class="opts"></div>`;
    options(el, [v.def, ...G.C.greekDistractors(v, 3, 'def')], v.def, ctx);
  };
  X.i_reverse = (el, st, ctx) => {
    const v = ctx.item;
    el.innerHTML = `<div class="tag">Ποια έκφραση σημαίνει…</div>
      <div class="prompt"><span class="el">«${h(v.def)}»</span></div><div class="opts"></div>`;
    options(el, [v.w, ...G.C.greekDistractors(v, 3, 'w')], v.w, ctx);
  };
  X.e_choose = (el, st, ctx) => {
    const v = ctx.item;
    el.innerHTML = `<div class="tag">Ποιο είναι σωστό;</div><div class="opts"></div>`;
    options(el, [v.right, v.wrong], v.right, { answer: (r) => ctx.answer(Object.assign(r, { note: v.why })) }, { big: true });
  };
  X.p_choose = (el, st, ctx) => {
    const v = ctx.item, parts = v.s.split('___');
    el.innerHTML = `<div class="tag">Παρώνυμα: ποια λέξη ταιριάζει;</div>
      <div class="prompt"><span class="el">${parts.map(h).join('<span class="blank">____</span>')}</span></div><div class="opts"></div>`;
    options(el, [v.right, ...v.wrongs], v.right, { answer: (r) => ctx.answer(Object.assign(r, { note: v.why })) });
  };
  X.c_choose = (el, st, ctx) => {
    const v = ctx.item, parts = v.s.split('___');
    el.innerHTML = `<div class="tag">Συνδετική λέξη: τι ταιριάζει λογικά;</div>
      <div class="prompt"><span class="el">${parts.map(h).join('<span class="blank">____</span>')}</span></div><div class="opts"></div>`;
    options(el, [v.right, ...v.wrongs], v.right, ctx);
  };
  X.d_intro = (el, st, ctx) => {
    const v = ctx.item;
    el.innerHTML = `<div class="tag">Σχήμα λόγου</div>
      <div class="card intro lex"><div class="l2">${h(v.w)}</div><div class="def">${h(v.def)}</div><div class="exm">${h(v.ex)} ${say(v.ex.replace(/[«»]/g, ''), 'el')}</div></div>
      <div class="muted small center">Πρόκληση: χρησιμοποίησέ το στην επόμενη συζήτησή σου.</div>
      <button class="btn primary wide go">Το κράτησα →</button>`;
    el.querySelector('.go').addEventListener('click', () => ctx.next(3));
  };
  X.d_identify = (el, st, ctx) => {
    const v = ctx.item;
    el.innerHTML = `<div class="tag">Ποιο σχήμα λόγου είναι;</div>
      <div class="prompt"><span class="el">${h(v.ex)}</span></div><div class="opts"></div>`;
    options(el, [v.w, ...G.C.greekDistractors(v, 3, 'w')], v.w, ctx);
  };
  X.d_define = (el, st, ctx) => {
    const v = ctx.item;
    el.innerHTML = `<div class="tag">Ποιο σχήμα περιγράφεται;</div>
      <div class="prompt"><span class="el">${h(v.def)}</span></div><div class="opts"></div>`;
    options(el, [v.w, ...G.C.greekDistractors(v, 3, 'w')], v.w, ctx);
  };

  /* Μεταδεδομένα τύπων: τρόποι πρόσληψης (V=οπτικός, A=ακουστικός, R=ανάγνωση/γραφή, K=παραγωγή/πράξη) */
  const META = {
    mc_l2_l1: { m: 'R', stage: 'recog', kind: 'w' },
    emoji_mc: { m: 'V', stage: 'recog', kind: 'w' },
    listen_mc: { m: 'A', stage: 'recog', kind: 'w', tts: 1 },
    mc_l1_l2: { m: 'RV', stage: 'both', kind: 'w' },
    type_l1_l2: { m: 'KR', stage: 'recall', kind: 'w' },
    dictation: { m: 'AK', stage: 'recall', kind: 'w', tts: 1 },
    speak: { m: 'KA', stage: 'recall', kind: 'ws', tts: 1 },
    listen_sentence: { m: 'A', stage: 'recog', kind: 's', tts: 1 },
    cloze: { m: 'R', stage: 'recog', kind: 's' },
    order: { m: 'KV', stage: 'recall', kind: 's' },
    dictation_s: { m: 'AK', stage: 'recall', kind: 's', tts: 1 }
  };
  X.dictation_s = X.dictation;
  return { X, META, say, slow, genderClass };
})();
