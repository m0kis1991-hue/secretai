/* Δρομολόγηση, πλοήγηση, θέμα, service worker. */
window.G = window.G || {};
G.toast = (msg, ms = 2600) => {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms);
};

/* Πλοήγηση που ανανεώνει την οθόνη ακόμη κι αν το hash δεν αλλάζει */
G.go = (hash) => { if (location.hash === hash) G.App.render(); else location.hash = hash; };

G.App = (() => {
  const root = () => document.getElementById('app');
  const NAV = [['home', '🏠', 'Αρχική'], ['lessons', '🗺️', 'Μαθήματα'], ['lab', '🎤', 'Λόγος'], ['stats', '📈', 'Πρόοδος'], ['settings', '⚙️', 'Ρυθμίσεις']];
  const nav = (cur) => {
    let n = document.querySelector('nav.bottom');
    if (!n) { n = document.createElement('nav'); n.className = 'bottom'; document.body.appendChild(n); }
    const items = NAV.map(([k, i, l]) => (k === 'lessons' && G.S.current === 'el') ? ['words', '📚', 'Λεξικό'] : [k, i, l]);
    n.innerHTML = items.map(([k, i, l]) => `<a href="#/${k}" class="${k === cur ? 'on' : ''}"><span>${i}</span>${l}</a>`).join('');
    n.style.display = '';
  };
  const hideNav = () => { const n = document.querySelector('nav.bottom'); if (n) n.style.display = 'none'; };

  const applyTheme = () => {
    const t = G.S.settings.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    const dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#14122b' : '#4f46e5');
  };

  const render = () => {
    const r = root(); if (!r) return;
    G.Speech.stop(); G.Lab.cleanup();
    const hash = location.hash.replace(/^#\/?/, '') || (G.S.onboarded ? 'home' : 'welcome');
    const [route, arg] = hash.split('/');
    if (!G.S.onboarded && !['welcome', 'profile-test', 'choose', 'placement'].includes(route)) { location.hash = '#/welcome'; return; }
    window.scrollTo(0, 0);
    const main = ['home', 'lessons', 'lab', 'stats', 'settings', 'words', 'grammar', 'theory', 'connectors', 'twisters'];
    if (main.includes(route)) nav(route === 'grammar' || route === 'words' && G.S.current !== 'el' ? 'lessons' : ['theory', 'connectors', 'twisters'].includes(route) ? 'home' : route); else hideNav();
    document.body.classList.toggle('has-nav', main.includes(route));
    switch (route) {
      case 'welcome': return G.Screens.welcome(r);
      case 'profile-test': return G.Tests.renderProfile(r);
      case 'choose': return G.Screens.choose(r);
      case 'placement': return G.Tests.renderPlacement(r, arg || G.S.current);
      case 'session': return G.Run.render(r);
      case 'lessons': return G.Screens.lessons(r);
      case 'grammar': return G.Screens.grammar(r);
      case 'words': return G.Screens.words(r);
      case 'theory': return G.Screens.theory(r);
      case 'connectors': return G.Screens.connectors(r);
      case 'lab': return G.Lab.renderHome(r);
      case 'twisters': return G.Lab.twisters(r);
      case 'stats': return G.Screens.stats(r);
      case 'settings': return G.Screens.settings(r);
      default: return G.Screens.home(r);
    }
  };

  const init = () => {
    applyTheme();
    if (window.matchMedia) try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) {}
    window.addEventListener('hashchange', render);
    /* Κουμπιά εκφώνησης οπουδήποτε */
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-say]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      b.classList.add('playing');
      G.Speech.speak(b.dataset.say, b.dataset.lang || G.S.current, { slow: !!b.dataset.slow }).then(() => b.classList.remove('playing'));
    }, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden) G.Store.save(true); });
    window.addEventListener('pagehide', () => G.Store.save(true));
    G.Speech.ready.then(() => { if (/^#\/(home|settings)?$/.test(location.hash) || !location.hash) render(); });
    render();
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) G.toast('🔄 Νέα έκδοση διαθέσιμη — κλείσε και άνοιξε ξανά την εφαρμογή.', 5000); });
        });
      }).catch(() => {});
    }
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  };
  return { init, render, applyTheme };
})();

document.addEventListener('DOMContentLoaded', G.App.init);
