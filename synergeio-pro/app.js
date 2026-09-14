// =========================================================
//  ΣυνεργείοPro - Main app: router + views
// =========================================================
(function () {
  'use strict';

  // ---------- State ----------
  const state = {
    customers: [],
    vehicles: [],
    services: [],
    settings: {},
    jobOrders: [],
    appointments: [],
  };

  async function loadAll() {
    [state.customers, state.vehicles, state.services, state.jobOrders, state.appointments, state.settings] = await Promise.all([
      DB.getAll('customers'),
      DB.getAll('vehicles'),
      DB.getAll('services'),
      DB.getAll('job_orders'),
      DB.getAll('appointments'),
      DB.getAllSettings(),
    ]);
    if (!state.settings.currency) state.settings.currency = 'EUR';
    if (!state.settings.intervalKm) state.settings.intervalKm = 10000;
    if (!state.settings.intervalMonths) state.settings.intervalMonths = 12;
    if (!state.settings.laborRate) state.settings.laborRate = 35;
    // workshopId is set either via activation screen (registered) or skip button (local/demo)
  }

  // ---------- Helpers ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function customerById(id) { return state.customers.find((c) => c.id === id); }
  function vehicleById(id) { return state.vehicles.find((v) => v.id === id); }
  function serviceById(id) { return state.services.find((s) => s.id === id); }
  function jobOrderById(id) { return state.jobOrders.find((j) => j.id === id); }
  function appointmentById(id) { return (state.appointments || []).find((a) => a.id === id); }

  // ---- KTEO / Emissions helpers ----
  function endOfMonth(yyyymm) {
    if (!yyyymm) return null;
    const [y, m] = yyyymm.split('-').map(Number);
    return new Date(y, m, 0); // last day of the given month
  }
  function fmtMonth(yyyymm) {
    if (!yyyymm) return '—';
    const MONTHS = ['Ιαν','Φεβ','Μαρ','Απρ','Μαΐ','Ιουν','Ιουλ','Αυγ','Σεπ','Οκτ','Νοε','Δεκ'];
    const [y, m] = yyyymm.split('-').map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  }
  function expiryStatus(yyyymm) {
    if (!yyyymm) return null;
    const expiry = endOfMonth(yyyymm);
    const daysLeft = Math.floor((expiry - new Date()) / 86400000);
    return { expiry, daysLeft, month: yyyymm,
      status: daysLeft < 0 ? 'expired' : daysLeft <= 14 ? 'critical' : daysLeft <= 60 ? 'upcoming' : 'ok' };
  }
  function kteoStatus(v) { return expiryStatus(v.kteoExpiry); }
  function emissionsStatus(v) { return expiryStatus(v.emissionsExpiry); }

  function normPlate(p) {
    // Remove spaces/dashes first, then uppercase
    let s = (p || '').toUpperCase().replace(/[\s\-_.]/g, '');

    // Convert spelled-out Greek letter names → single letter (longest first to avoid partial matches)
    // Voice recognition says "ΜΙ ΝΙ ΡΟ" → writes "ΜΙΝΙΡΟ" → we decode back to "ΜΝΡ"
    const NAMES = [
      ['ΟΜΙΚΡΟΝ','Ο'],
      ['ΕΨΙΛΟΝ','Ε'],['ΛΑΜΒΔΑ','Λ'],['ΥΨΙΛΟΝ','Υ'],['ΟΜΙΚΡΟ','Ο'],
      ['ΓΑΜΜΑ','Γ'],['ΔΕΛΤΑ','Δ'],['ΚΑΠΠΑ','Κ'],['ΛΑΜΔΑ','Λ'],['ΣΙΓΜΑ','Σ'],['ΩΜΕΓΑ','Ω'],['ΕΨΙΛΟ','Ε'],['ΥΨΙΛΟ','Υ'],
      ['ΑΛΦΑ','Α'],['ΒΗΤΑ','Β'],['ΒΙΤΑ','Β'],['ΓΑΜΑ','Γ'],['ΖΗΤΑ','Ζ'],['ΖΙΤΑ','Ζ'],['ΘΗΤΑ','Θ'],['ΘΙΤΑ','Θ'],['ΙΩΤΑ','Ι'],
      ['ΗΤΑ','Η'],['ΤΑΥ','Τ'],['ΤΑΦ','Τ'],
      ['ΜΙ','Μ'],['ΜΥ','Μ'],['ΝΙ','Ν'],['ΝΥ','Ν'],['ΡΟ','Ρ'],['ΡΩ','Ρ'],
      ['ΠΙ','Π'],['ΦΙ','Φ'],['ΧΙ','Χ'],['ΨΙ','Ψ'],['ΞΙ','Ξ'],
    ];
    for (const [name, letter] of NAMES) {
      s = s.split(name).join(letter);
    }

    // Keep only letters and digits
    s = s.replace(/[^A-ZΑ-ΩΆΈΉΊΌΎΏ0-9]/g, '');

    // Greek plate format: max 3 letters + max 4 digits
    const letters = s.replace(/[0-9]/g, '').slice(0, 3);
    const digits  = s.replace(/[^0-9]/g, '').slice(0, 4);
    return letters + digits;
  }
  function kteoStatusBadge(st, label, icon_name) {
    if (!st) return '';
    const col = {
      ok:       'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
      upcoming: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
      critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
      expired:  'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
    }[st.status];
    const dayTxt = st.daysLeft < 0 ? `Ληγμένο (${-st.daysLeft}μ.)` : st.daysLeft === 0 ? 'Λήγει σήμερα!' : st.daysLeft <= 14 ? `Λήγει σε ${st.daysLeft}μ.` : st.daysLeft <= 60 ? `${st.daysLeft} ημέρες` : 'Σε ισχύ';
    return `<div class="flex items-center justify-between border rounded-xl px-3 py-2.5 ${col}">
      <div class="flex items-center gap-2">
        ${icon(icon_name,'w-4 h-4 flex-shrink-0')}
        <span class="text-xs font-semibold">${label}</span>
      </div>
      <div class="text-right">
        <div class="text-sm font-bold">${fmtMonth(st.month)}</div>
        <div class="text-xs opacity-80">${dayTxt}</div>
      </div>
    </div>`;
  }

  const TASK_PRESETS_BY_TYPE = {
    car: [
      { cat: 'task_cat_engine',       tasks: ['oil_change','oil_filter','air_filter','fuel_filter','spark_plugs','timing_belt','serpentine_belt','coolant'] },
      { cat: 'task_cat_brakes',       tasks: ['brake_pads_front','brake_pads_rear','brake_discs_front','brake_discs_rear','brake_fluid'] },
      { cat: 'task_cat_cabin',        tasks: ['cabin_filter','battery','ac','wipers'] },
      { cat: 'task_cat_wheels',       tasks: ['tires','alignment','balancing','wheel_bearing'] },
      { cat: 'task_cat_transmission', tasks: ['gearbox_oil','differential_oil'] },
      { cat: 'task_cat_general',      tasks: ['diagnostics'] },
    ],
    moto: [
      { cat: 'task_cat_engine',       tasks: ['oil_change','oil_filter','air_filter','spark_plugs','valve_clearance','coolant'] },
      { cat: 'task_cat_brakes',       tasks: ['brake_pads_front','brake_pads_rear','brake_fluid'] },
      { cat: 'task_cat_transmission', tasks: ['chain_sprocket','gearbox_oil'] },
      { cat: 'task_cat_wheels',       tasks: ['tires','wheel_bearing','suspension'] },
      { cat: 'task_cat_cabin',        tasks: ['battery'] },
      { cat: 'task_cat_general',      tasks: ['diagnostics'] },
    ],
    boat: [
      { cat: 'task_cat_engine',       tasks: ['oil_change','oil_filter','fuel_filter','spark_plugs','impeller','coolant'] },
      { cat: 'task_cat_drive',        tasks: ['leg_oil','propeller','shaft_seal'] },
      { cat: 'task_cat_hull',         tasks: ['anode','antifouling','hull_clean'] },
      { cat: 'task_cat_cabin',        tasks: ['battery'] },
      { cat: 'task_cat_general',      tasks: ['diagnostics'] },
    ],
    truck: [
      { cat: 'task_cat_engine',       tasks: ['oil_change','oil_filter','air_filter','fuel_filter','coolant','timing_belt','serpentine_belt'] },
      { cat: 'task_cat_brakes',       tasks: ['brake_pads_front','brake_pads_rear','brake_discs_front','brake_discs_rear','brake_fluid','brake_drums'] },
      { cat: 'task_cat_cabin',        tasks: ['cabin_filter','battery','ac'] },
      { cat: 'task_cat_wheels',       tasks: ['tires','alignment','balancing'] },
      { cat: 'task_cat_transmission', tasks: ['gearbox_oil','differential_oil'] },
      { cat: 'task_cat_general',      tasks: ['diagnostics'] },
    ],
  };

  function renderTasksForVehicle(vehicleType, selectedTasks) {
    const groups = TASK_PRESETS_BY_TYPE[vehicleType] || TASK_PRESETS_BY_TYPE.car;
    return groups.map(({ cat, tasks }) => `
      <div class="mb-3 last:mb-0">
        <div class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 px-1">${U.escape(t(cat))}</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
          ${tasks.map((key) => `
            <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer">
              <input type="checkbox" data-task="${key}" ${selectedTasks.has(key) ? 'checked' : ''} class="w-4 h-4 rounded accent-blue-600 flex-shrink-0" />
              <span class="text-sm">${U.escape(t('task_' + key))}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  function taskLabel(key) {
    if (!key) return '';
    if (key.startsWith('custom:')) return U.escape(key.slice(7));
    return U.escape(t('task_' + key));
  }

  function joStatusBadge(status) {
    const cfg = {
      pending: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
      in_progress: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
      completed: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    };
    const labels = { pending: 'jo_status_pending', in_progress: 'jo_status_in_progress', completed: 'jo_status_completed' };
    return `<span class="text-xs px-2 py-0.5 rounded-full font-medium ${cfg[status] || cfg.pending}">${t(labels[status] || 'jo_status_pending')}</span>`;
  }

  function servicesForVehicle(vid) {
    return state.services.filter((s) => s.vehicleId === vid)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  function vehiclesForCustomer(cid) {
    return state.vehicles.filter((v) => v.customerId === cid);
  }

  function vehicleLabel(v) {
    if (!v) return '—';
    return [v.brand, v.model, v.year ? `(${v.year})` : '', v.plate ? `• ${v.plate}` : '']
      .filter(Boolean).join(' ');
  }

  function svcRevenue(sv) {
    // Legacy records (created before parts/labor tracking existed) have neither field set —
    // fall back to the old flat `cost`. Records that do track parts/labor report their real
    // total even when it's exactly 0 (e.g. free warranty work), instead of masking it with `cost`.
    const hasPartsOrLabor = (Array.isArray(sv.parts) && sv.parts.length > 0) || sv.laborHours != null;
    if (!hasPartsOrLabor) return Number(sv.cost) || 0;
    const parts = (sv.parts || []).reduce((sum, p) => sum + (Number(p.qty)||0)*(Number(p.price)||0), 0);
    const laborRate = sv.laborRate != null ? (Number(sv.laborRate) || 0) : (Number(state.settings.laborRate) || 0);
    const labor = (Number(sv.laborHours)||0) * laborRate;
    return parts + labor;
  }

  function vehicleIcon(type) {
    switch (type) {
      case 'moto': return 'bike';
      case 'boat': return 'ship';
      case 'truck': return 'truck';
      default: return 'car';
    }
  }

  function icon(name, cls) {
    return `<i data-lucide="${name}" class="${cls || 'w-5 h-5'}"></i>`;
  }


  function refreshIcons() {
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    initVoiceButtons();
  }

  // ---- Voice input ----
  function micBtn(forId, { transform = '', cls = '' } = {}) {
    if (!U.hasSpeech()) return '';
    return `<button type="button" class="voice-btn flex-shrink-0 w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center ${cls}"
      data-vfor="${forId}" data-vtr="${transform}" title="${t('voice_tap_hint')}" aria-label="${t('voice_tap_hint')}">
      ${icon('mic', 'w-5 h-5')}
    </button>`;
  }

  // Shared Greek digit-word → digit map (used by phone + number transforms)
  const GREEK_DIGITS = {
    'μηδέν':0,'μηδεν':0,'μηδέν':0,
    'ένα':1,'ενα':1,'μία':1,'μια':1,'μια':1,
    'δύο':2,'δυο':2,
    'τρία':3,'τρια':3,'τρεις':3,'τρείς':3,
    'τέσσερα':4,'τεσσερα':4,'τέσσερις':4,'τεσσερις':4,'τέσσερα':4,
    'πέντε':5,'πεντε':5,
    'έξι':6,'εξι':6,'έξη':6,'εξη':6,'εξ':6,
    'επτά':7,'εφτά':7,'εφτα':7,'επτα':7,'εφτά':7,
    'οκτώ':8,'οχτώ':8,'οκτω':8,'οχτω':8,
    'εννέα':9,'εννιά':9,'εννεα':9,'εννια':9,'εννιά':9,
  };

  function applyGreekDigits(s) {
    let r = s;
    for (const [w, d] of Object.entries(GREEK_DIGITS)) {
      r = r.replace(new RegExp(w, 'gi'), String(d));
    }
    return r;
  }

  const VOICE_TRANSFORMS = {
    plate: (s) => s.toUpperCase().replace(/\s+/g, '').replace(/[^A-ZΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ0-9]/gi, ''),

    phone: (s) => {
      const hasPlus = /[+]|συν\b|plus\b/i.test(s);
      let r = applyGreekDigits(s).replace(/[^0-9]/g, '');
      return (hasPlus ? '+' : '') + r;
    },

    number: (s) => applyGreekDigits(s).replace(/[^0-9]/g, ''),

    email: (s) => s.toLowerCase().trim()
      .replace(/\s*(παπάκι|at\b|ατ\b|@)\s*/g, '@')
      .replace(/\s*(τελεία|dot\b|point\b|\.)\s*/g, '.')
      .replace(/\s*(παύλα|dash\b|-)\s*/g, '-')
      .replace(/\s*(κάτω\s*παύλα|underscore\b|_)\s*/g, '_')
      .replace(/\s+/g, ''),

    name: (s) => s.toUpperCase(),
  };

  function initVoiceButtons() {
    if (!U.hasSpeech()) return;
    $$('.voice-btn[data-vfor]').forEach((btn) => {
      if (btn._vb) return;
      btn._vb = true;

      const tr = btn.dataset.vtr;
      const transform = VOICE_TRANSFORMS[tr] || undefined;

      function startRec(e) {
        e.preventDefault();
        if (btn._rec) return;
        const target = document.getElementById(btn.dataset.vfor);
        if (!target) return;
        btn._rec = true;
        btn.classList.add('!bg-red-500', '!text-white');
        btn.innerHTML = icon('mic-off', 'w-5 h-5 animate-pulse');
        refreshIcons();
        btn._recognition = U.triggerVoice(target, {
          transform,
          onEnd: () => {
            btn._rec = false;
            btn._recognition = null;
            btn.classList.remove('!bg-red-500', '!text-white');
            btn.innerHTML = icon('mic', 'w-5 h-5');
            refreshIcons();
          },
        });
      }

      function stopRec(e) {
        if (btn._recognition) {
          try { btn._recognition.stop(); } catch (_) {}
        }
      }

      btn.addEventListener('mousedown', startRec);
      btn.addEventListener('touchstart', startRec, { passive: false });
      btn.addEventListener('mouseup', stopRec);
      btn.addEventListener('touchend', stopRec);
      btn.addEventListener('mouseleave', stopRec);
    });
  }

  // ---------- Router ----------
  const routes = {
    '': renderDashboard,
    '/': renderDashboard,
    '/dashboard': renderDashboard,
    '/customers': renderCustomers,
    '/customers/new': () => renderCustomerForm(),
    '/customers/:id': (id) => renderCustomerDetail(id),
    '/customers/:id/edit': (id) => renderCustomerForm(id),
    '/vehicles': renderVehicles,
    '/vehicles/new': () => renderVehicleForm(),
    '/vehicles/:id': (id) => renderVehicleDetail(id),
    '/vehicles/:id/edit': (id) => renderVehicleForm(id),
    '/services': renderServices,
    '/services/new': () => renderServiceForm(),
    '/services/:id': (id) => renderServiceDetail(id),
    '/services/:id/edit': (id) => renderServiceForm(id),
    '/reminders': renderReminders,
    '/scan': renderAIScan,
    '/settings': renderSettings,
    '/advisor': renderAdvisor,
    '/superadmin': renderSuperAdmin,
    '/contact': renderContact,
    '/activate': () => {
      // Already fully licensed — nothing to do here, and the only way out of this screen
      // besides entering a code is "Try Demo", which would silently overwrite their real
      // workshopId/data. Send them back instead of exposing that trap to a stray click.
      if (state.settings.workshopId && (state.settings.workshopMode === 'licensed' || state.settings.workshopMode === 'admin')) {
        go('/dashboard');
        return;
      }
      showActivationScreen();
    },
    '/job-orders': renderJobOrders,
    '/job-orders/new': () => renderJobOrderForm(),
    '/job-orders/:id': (id) => renderJobOrderDetail(id),
    '/job-orders/:id/edit': (id) => renderJobOrderForm(id),
    '/job-orders/:id/work': (id) => renderJobOrderWork(id),
    '/schedule': renderSchedule,
    '/stats': renderStats,
    '/marketing': renderMarketing,
    '/appointments': renderAppointments,
  };

  function matchRoute(path) {
    if (routes[path]) return { fn: routes[path], params: [] };
    for (const route in routes) {
      if (!route.includes(':')) continue;
      const re = new RegExp('^' + route.replace(/:[^/]+/g, '([^/]+)') + '$');
      const m = path.match(re);
      if (m) return { fn: routes[route], params: m.slice(1) };
    }
    return { fn: renderDashboard, params: [] };
  }

  async function router() {
    const hash = (location.hash.replace(/^#/, '') || '/dashboard').split('?')[0];
    const { fn, params } = matchRoute(hash);
    const root = $('#view');
    try {
      await loadAll();
      root && root.scrollTo?.(0, 0);
      window.scrollTo(0, 0);
      await fn(...params);
    } catch (e) {
      console.error('Router error:', e);
      if (root) root.innerHTML = `<div class="p-6 text-red-500"><b>Σφάλμα:</b> ${U ? U.escape(String(e && e.message || e)) : String(e)}</div>`;
    }
    refreshIcons();
    updateActiveNav();
  }

  function updateActiveNav() {
    const hash = location.hash.replace(/^#/, '') || '/dashboard';
    $$('[data-nav]').forEach((el) => {
      const isActive = hash.startsWith(el.dataset.nav);
      el.classList.toggle('text-blue-700', isActive);
      el.classList.toggle('dark:text-blue-500', isActive);
      el.classList.toggle('text-slate-500', !isActive);
      el.classList.toggle('dark:text-slate-400', !isActive);
    });
  }

  function go(path) {
    location.hash = '#' + path;
  }
  window.go = go;

  // ---------- Header ----------
  function pageHeader(title, opts) {
    opts = opts || {};
    const back = opts.back !== false;
    const actions = opts.actions || '';
    return `
      <div class="sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur border-b border-slate-200 dark:border-slate-800 pt-safe">
        <div class="max-w-5xl mx-auto flex items-center gap-3 px-4 py-3">
          ${back ? `<button onclick="history.back()" class="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">${icon('arrow-left')}</button>` : ''}
          <h1 class="text-lg font-semibold flex-1 truncate">${U.escape(title)}</h1>
          ${actions}
        </div>
      </div>
    `;
  }

  // =========================================================
  //  DASHBOARD
  // =========================================================
  async function renderDashboard() {
    // --- stats ---
    const totalVehicles  = state.vehicles.length;
    const totalCustomers = state.customers.length;
    const pendingJOs     = (state.jobOrders || []).filter((j) => j.status !== 'completed').length;
    const overdueVehicles = state.vehicles
      .map((v) => ({ v, r: U.reminderStatus(v, servicesForVehicle(v.id), state.settings) }))
      .filter(({ r }) => r.status === 'overdue' || r.status === 'upcoming');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart  = new Date(now.getFullYear(), 0, 1);
    const revenueThisMonth = state.services.filter((sv) => sv.date && new Date(sv.date) >= monthStart).reduce((s, sv) => s + svcRevenue(sv), 0);
    const revenueThisYear  = state.services.filter((sv) => sv.date && new Date(sv.date) >= yearStart).reduce((s, sv) => s + svcRevenue(sv), 0);
    const sym = { EUR: '€', USD: '$', GBP: '£' }[state.settings.currency || 'EUR'] || '€';
    const fmtRev = (n) => sym + U.fmtNum(n);

    $('#view').innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center px-4 py-10 pb-28 sm:pb-12">
        <div class="w-full max-w-md space-y-8">

        <!-- Plate search -->
        <div>
          <div class="w-full max-w-md">

            <!-- Icon + title -->
            <div class="text-center mb-7">
              <div class="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-600/30">
                ${icon('search','w-10 h-10 text-white')}
              </div>
              <h1 class="text-2xl font-bold text-slate-900 dark:text-white">${t('plate_search_title')}</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">${t('plate_search_subtitle')}</p>
            </div>

            <!-- Search card -->
            <div class="bg-slate-900 dark:bg-slate-800 rounded-3xl p-5 shadow-2xl">
              <!-- Plate input -->
              <input id="dash-plate" type="text" inputmode="text" autocomplete="off" spellcheck="false"
                placeholder="${t('plate_search_placeholder')}"
                class="w-full px-4 py-4 rounded-2xl text-3xl font-bold tracking-widest uppercase text-center bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:normal-case placeholder-slate-300 dark:placeholder-slate-500 border-0 focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
                maxlength="12" />

              <!-- Action buttons row -->
              <div class="grid grid-cols-2 gap-2">
                <button id="dash-plate-cam" class="h-12 flex items-center justify-center gap-1.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-colors" title="${t('plate_photo_btn')}">
                  ${icon('camera','w-5 h-5')} <span>${t('plate_photo_btn')}</span>
                </button>
                <button id="dash-plate-btn" class="h-12 flex items-center justify-center gap-1.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors">
                  ${icon('arrow-right','w-5 h-5')} <span>${t('plate_search_btn')}</span>
                </button>
              </div>

              <!-- Hidden file inputs for plate photo (camera / gallery) -->
              <input type="file" id="dash-plate-file-cam" accept="image/*" capture="environment" class="hidden" />
              <input type="file" id="dash-plate-file-gallery" accept="image/*" class="hidden" />

              <!-- Result -->
              <div id="dash-plate-result" class="mt-4 empty:hidden"></div>
            </div>

          </div>
        </div>

        <!-- Stats panel -->
        <div class="space-y-4">

          <!-- 6 stat cards: 2 rows of 3 on sm, 2 cols on mobile -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <a href="#/vehicles" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-500 flex items-center justify-center flex-shrink-0">
                ${icon('car','w-5 h-5')}
              </div>
              <div>
                <div class="text-2xl font-bold">${totalVehicles}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">Οχήματα</div>
              </div>
            </a>
            <a href="#/customers" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                ${icon('users','w-5 h-5')}
              </div>
              <div>
                <div class="text-2xl font-bold">${totalCustomers}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">Πελάτες</div>
              </div>
            </a>
            <a href="#/job-orders" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                ${icon('clipboard-check','w-5 h-5')}
              </div>
              <div>
                <div class="text-2xl font-bold">${pendingJOs}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">Εκκρεμείς</div>
              </div>
            </a>
            <a href="#/reminders" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div class="w-10 h-10 rounded-xl ${overdueVehicles.length ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'} flex items-center justify-center flex-shrink-0">
                ${icon('bell','w-5 h-5')}
              </div>
              <div>
                <div class="text-2xl font-bold">${overdueVehicles.length}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">Υπενθυμίσεις</div>
              </div>
            </a>
            <a href="#/stats" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                ${icon('trending-up','w-5 h-5')}
              </div>
              <div>
                <div class="text-lg font-bold leading-tight">${fmtRev(revenueThisMonth)}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">Έσοδα μήνα</div>
              </div>
            </a>
            <a href="#/stats" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div class="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0">
                ${icon('bar-chart-2','w-5 h-5')}
              </div>
              <div>
                <div class="text-lg font-bold leading-tight">${fmtRev(revenueThisYear)}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">Έσοδα έτους</div>
              </div>
            </a>
          </div>

          <!-- Quick actions -->
          <div class="grid grid-cols-2 gap-2">
            <a href="#/services/new" class="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-3 flex items-center gap-2 font-medium text-sm transition-colors">
              ${icon('wrench','w-4 h-4 flex-shrink-0')} Νέο Service
            </a>
            <a href="#/job-orders/new" class="bg-amber-500 hover:bg-amber-600 text-white rounded-2xl p-3 flex items-center gap-2 font-medium text-sm transition-colors">
              ${icon('clipboard-check','w-4 h-4 flex-shrink-0')} Νέα Εντολή
            </a>
            <a href="#/marketing" class="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-3 flex items-center gap-2 font-medium text-sm transition-colors">
              ${icon('megaphone','w-4 h-4 flex-shrink-0')} Marketing
            </a>
            <a href="#/stats" class="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl p-3 flex items-center gap-2 font-medium text-sm transition-colors">
              ${icon('bar-chart-2','w-4 h-4 flex-shrink-0')} Στατιστικά
            </a>
          </div>

          <!-- Upcoming appointments today/tomorrow -->
          ${(() => {
            const todayStr = U.localDateStr();
            const tomorrowStr = U.localDateStr(Date.now() + 86400000);
            const soon = (state.appointments || [])
              .filter((a) => !['completed','cancelled'].includes(a.status) && (a.date === todayStr || a.date === tomorrowStr))
              .sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
            if (!soon.length) return '';
            return `
            <div>
              <h2 class="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                ${icon('calendar','w-4 h-4')} Ραντεβού σήμερα/αύριο
              </h2>
              <div class="space-y-2">
                ${soon.map((a) => {
                  const c = customerById(a.customerId);
                  const v = a.vehicleId ? vehicleById(a.vehicleId) : null;
                  const isToday = a.date === todayStr;
                  return `<a href="#/appointments" class="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-blue-900/40 p-3 shadow-sm">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isToday ? 'bg-blue-600 text-white' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'} text-xs font-bold tabular-nums">${a.time}</div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-sm truncate">${U.escape(c?.name || '—')}</div>
                      ${v ? `<div class="text-xs text-slate-500 truncate">${U.escape(vehicleLabel(v))}</div>` : ''}
                    </div>
                    <div class="text-xs font-medium flex-shrink-0 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}">
                      ${isToday ? 'Σήμερα' : 'Αύριο'}
                    </div>
                  </a>`;
                }).join('')}
              </div>
            </div>`;
          })()}

          <!-- Vehicles needing service -->
          ${overdueVehicles.length ? `
          <div>
            <h2 class="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              ${icon('bell','w-4 h-4')} Χρειάζονται επίσκεψη
            </h2>
            <div class="space-y-2">
              ${overdueVehicles.map(({ v, r }) => {
                const c = customerById(v.customerId);
                const isOverdue = r.status === 'overdue';
                return `
                <a href="#/vehicles/${v.id}" class="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl border ${isOverdue ? 'border-red-200 dark:border-red-900/40' : 'border-amber-200 dark:border-amber-900/40'} p-3 shadow-sm">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}">
                    ${icon(vehicleIcon(v.type || 'car'),'w-5 h-5')}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-sm truncate">${U.escape((v.plate || '').toUpperCase())} · ${U.escape(v.brand || '')} ${U.escape(v.model || '')}</div>
                    ${c ? `<div class="text-xs text-slate-500 dark:text-slate-400 truncate">${U.escape(c.name)}</div>` : ''}
                  </div>
                  <div class="text-xs font-medium flex-shrink-0 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}">
                    ${isOverdue ? `${-r.days}μ. εκπρόθεσμο` : `${r.days}μ. απομένουν`}
                  </div>
                </a>`;
              }).join('')}
            </div>
          </div>
          ` : ''}

          <!-- ΚΤΕΟ / emissions expiring within 14 days -->
          ${(() => {
            const kteoSoon = state.vehicles
              .map((v) => ({ v, st: kteoStatus(v), kind: 'kteo' }))
              .filter((x) => x.st && x.st.daysLeft >= 0 && x.st.daysLeft <= 14);
            const emSoon = state.vehicles
              .map((v) => ({ v, st: emissionsStatus(v), kind: 'emissions' }))
              .filter((x) => x.st && x.st.daysLeft >= 0 && x.st.daysLeft <= 14);
            const combined = [...kteoSoon, ...emSoon].sort((a, b) => a.st.daysLeft - b.st.daysLeft);
            if (!combined.length) return '';
            return `
            <div>
              <h2 class="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                ${icon('shield-alert','w-4 h-4')} ΚΤΕΟ / Καυσαέρια λήγουν (14μ.)
              </h2>
              <div class="space-y-2">
                ${combined.map(({ v, st, kind }) => {
                  const c = customerById(v.customerId);
                  const label = kind === 'kteo' ? 'ΚΤΕΟ' : 'Καυσαέρια';
                  const icoName = kind === 'kteo' ? 'shield-check' : 'wind';
                  return `<a href="#/vehicles/${v.id}" class="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-blue-900/40 p-3 shadow-sm">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      ${icon(icoName,'w-5 h-5')}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-sm truncate">${U.escape((v.plate || '').toUpperCase())} · ${U.escape(v.brand || '')} ${U.escape(v.model || '')}</div>
                      ${c ? `<div class="text-xs text-slate-500 dark:text-slate-400 truncate">${U.escape(c.name)}</div>` : ''}
                    </div>
                    <div class="text-xs font-medium flex-shrink-0 text-blue-600 dark:text-blue-400 text-right">
                      <div>${label}</div>
                      <div>${st.daysLeft === 0 ? 'Σήμερα!' : `${st.daysLeft}μ.`}</div>
                    </div>
                  </a>`;
                }).join('')}
              </div>
              <a href="#/reminders" class="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">${icon('arrow-right','w-3 h-3')} Όλες οι υπενθυμίσεις</a>
            </div>`;
          })()}

        </div>

        </div>
      </div>
    `;
    refreshIcons();

    // ---------- plate lookup ----------
    function plateLookup() {
      const raw = normPlate($('#dash-plate')?.value || '');
      if (!raw) return;
      const result = $('#dash-plate-result');
      const v = state.vehicles.find((x) => normPlate(x.plate) === raw);
      if (v) {
        const c = customerById(v.customerId);
        const lastSvc = servicesForVehicle(v.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const activeJOs = (state.jobOrders || []).filter((j) => j.vehicleId === v.id && j.status !== 'completed').length;
        result.innerHTML = `
          <div class="bg-white/10 rounded-2xl p-3 flex items-center gap-3 mb-3">
            <div class="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-500 flex items-center justify-center flex-shrink-0">
              ${icon(vehicleIcon(v.type || 'car'), 'w-6 h-6')}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-sm text-white">${U.escape(v.brand || '')} ${U.escape(v.model || '')} <span class="text-slate-400 font-normal text-xs">${v.year || ''}</span></div>
              ${c ? `<div class="text-xs text-slate-300 truncate">${U.escape(c.name)}</div>` : ''}
              ${v.mileage ? `<div class="text-xs text-slate-400">${Number(v.mileage).toLocaleString()} km</div>` : ''}
              ${lastSvc ? `<div class="text-xs text-slate-400">τελ. service: ${U.fmtDate(lastSvc.date)}</div>` : ''}
              ${activeJOs ? `<div class="text-xs text-amber-400 font-medium">${activeJOs} εκκρεμείς εντολές</div>` : ''}
            </div>
          </div>
          <button onclick="go('/services/new?vehicle=${v.id}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors text-lg mb-2">
            ${icon('wrench','w-5 h-5')} Νέο Service
          </button>
          <div class="grid grid-cols-2 gap-2">
            <button onclick="go('/job-orders/new?vehicle=${v.id}')" class="bg-white/10 hover:bg-white/20 text-white font-medium py-2.5 rounded-2xl flex items-center justify-center gap-1.5 transition-colors text-sm">
              ${icon('clipboard-check','w-4 h-4')} Εντολή
            </button>
            <button onclick="go('/vehicles/${v.id}')" class="bg-white/10 hover:bg-white/20 text-white font-medium py-2.5 rounded-2xl flex items-center justify-center gap-1.5 transition-colors text-sm">
              ${icon('history','w-4 h-4')} Ιστορικό
            </button>
          </div>
        `;
      } else {
        result.innerHTML = `
          <div class="text-center py-2 mb-2">
            <p class="text-slate-300 text-sm font-medium mb-0.5">Δεν βρέθηκε στο αρχείο</p>
            <p class="text-slate-500 text-xs">Καταχώρησε το νέο όχημα</p>
          </div>
          <div class="flex flex-col gap-2">
            <button onclick="sessionStorage.setItem('scan_expected_plate','${raw}');go('/scan')" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors">
              ${icon('scan-line','w-5 h-5')} Σκανάρισμα εγγράφου (AI)
            </button>
            <button onclick="go('/vehicles/new')" class="w-full bg-white/15 hover:bg-white/25 text-white font-medium py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm">
              ${icon('plus','w-4 h-4')} Χειροκίνητη καταχώρηση
            </button>
          </div>
        `;
      }
      refreshIcons();
    }

    // ---------- plate photo OCR ----------
    async function platePhotoOCR(file) {
      const result = $('#dash-plate-result');
      result.innerHTML = `<div class="text-center text-slate-400 text-sm py-2 flex items-center justify-center gap-2">${icon('loader','w-4 h-4 animate-spin')} ${t('plate_reading')}</div>`;
      refreshIcons();
      try {
        // Resize to max 900px and compress to reduce upload time
        const dataUrl = await new Promise((res, rej) => {
          const img = new Image();
          const reader = new FileReader();
          reader.onload = (e) => {
            img.onload = () => {
              const MAX = 900;
              const scale = Math.min(1, MAX / Math.max(img.width, img.height));
              const w = Math.round(img.width * scale);
              const h = Math.round(img.height * scale);
              const canvas = document.createElement('canvas');
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d').drawImage(img, 0, 0, w, h);
              res(canvas.toDataURL('image/jpeg', 0.75));
            };
            img.onerror = rej;
            img.src = e.target.result;
          };
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        const resp = await fetch('/api/plate-ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: dataUrl }),
        });
        const data = await resp.json();
        if (data.plate) {
          const inp = $('#dash-plate');
          if (inp) inp.value = data.plate;
          result.innerHTML = '';
          plateLookup();
        } else {
          result.innerHTML = `<p class="text-center text-red-400 text-sm py-2">Δεν βρέθηκε πινακίδα στη φωτογραφία</p>`;
        }
      } catch (e) {
        result.innerHTML = `<p class="text-center text-red-400 text-sm py-2">Σφάλμα ανάγνωσης πινακίδας</p>`;
      }
    }

    // ---------- event wiring ----------
    const plateInput = $('#dash-plate');
    if (plateInput) {
      plateInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') plateLookup(); });
      plateInput.addEventListener('input', () => {
        plateInput.value = plateInput.value.toUpperCase();
        const r = $('#dash-plate-result');
        if (r) r.innerHTML = '';
      });
    }
    $('#dash-plate-btn')?.addEventListener('click', plateLookup);

    const fileCam = $('#dash-plate-file-cam');
    const fileGallery = $('#dash-plate-file-gallery');

    $('#dash-plate-cam')?.addEventListener('click', () => {
      const sheet = document.createElement('div');
      sheet.className = 'fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4';
      sheet.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-4 space-y-2">
          <div class="text-center text-xs text-slate-400 font-medium pb-1">Επιλογή φωτογραφίας πινακίδας</div>
          <button id="sheet-cam" class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
            <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center flex-shrink-0">
              ${icon('camera','w-5 h-5')}
            </div>
            <div>
              <div class="font-medium text-sm">Κάμερα</div>
              <div class="text-xs text-slate-400">Τράβηξε φωτογραφία τώρα</div>
            </div>
          </button>
          <button id="sheet-gallery" class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
            <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center flex-shrink-0">
              ${icon('image','w-5 h-5')}
            </div>
            <div>
              <div class="font-medium text-sm">Άλμπουμ</div>
              <div class="text-xs text-slate-400">Επίλεξε από τη συλλογή σου</div>
            </div>
          </button>
          <button id="sheet-cancel" class="w-full text-center text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 py-2.5 font-medium transition-colors">Ακύρωση</button>
        </div>`;
      document.body.appendChild(sheet);
      refreshIcons();
      sheet.querySelector('#sheet-cam').addEventListener('click', () => { sheet.remove(); fileCam?.click(); });
      sheet.querySelector('#sheet-gallery').addEventListener('click', () => { sheet.remove(); fileGallery?.click(); });
      sheet.querySelector('#sheet-cancel').addEventListener('click', () => sheet.remove());
      sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.remove(); });
    });

    fileCam?.addEventListener('change', () => {
      if (fileCam.files?.[0]) platePhotoOCR(fileCam.files[0]);
    });
    fileGallery?.addEventListener('change', () => {
      if (fileGallery.files?.[0]) platePhotoOCR(fileGallery.files[0]);
    });
  }

  function reminderRow(r) {
    const c = customerById(r.v.customerId);
    const isOverdue = r.status === 'overdue';
    return `
      <a href="#/vehicles/${r.v.id}" class="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-3 border ${isOverdue ? 'border-red-200 dark:border-red-900/50' : 'border-amber-200 dark:border-amber-900/50'}">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center ${isOverdue ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300'}">
          ${icon(vehicleIcon(r.v.type), 'w-5 h-5')}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">${U.escape(vehicleLabel(r.v))}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400 truncate">${U.escape(c?.name || '—')}</div>
        </div>
        <div class="text-xs font-medium ${isOverdue ? 'text-red-600 dark:text-red-300' : 'text-amber-600 dark:text-amber-300'}">
          ${isOverdue ? t('overdue_by', { n: -r.days }) : t('days_left', { n: r.days })}
        </div>
      </a>
    `;
  }

  function serviceRow(s) {
    const v = vehicleById(s.vehicleId);
    const c = v ? customerById(v.customerId) : null;
    return `
      <a href="#/services/${s.id}" class="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
        <div class="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
          ${icon('wrench', 'w-5 h-5')}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">${U.escape(vehicleLabel(v))} • ${s.mileage ? s.mileage + ' km' : ''}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400 truncate">${U.fmtDate(s.date)} • ${U.escape(c?.name || '—')}</div>
        </div>
      </a>
    `;
  }

  // =========================================================
  //  CUSTOMERS
  // =========================================================
  async function renderCustomers() {
    const search = '';
    $('#view').innerHTML = `
      ${pageHeader(t('customers'), {
        back: false,
        actions: `<a href="#/customers/new" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">${icon('plus','w-4 h-4')} ${t('add')}</a>`
      })}
      <div class="max-w-5xl mx-auto p-4 pb-24 sm:pb-4">
        <div class="relative mb-4">
          <input id="search-input" type="search" placeholder="${t('search')}" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600" />
          <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">${icon('search','w-4 h-4')}</div>
        </div>
        <div id="customers-list"></div>
      </div>
    `;
    const list = $('#customers-list');
    const render = (q) => {
      q = (q || '').toLowerCase();
      const filtered = state.customers
        .filter((c) => !q || [c.name, c.phone, c.email, c.company].some((f) => (f || '').toLowerCase().includes(q)))
        .sort((a, b) => a.name.localeCompare(b.name));
      if (!filtered.length) {
        list.innerHTML = emptyState('users', t('no_customers'), t('qa_new_customer'), '#/customers/new');
        refreshIcons();
        return;
      }
      list.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
          ${filtered.map(customerRow).join('')}
        </div>
      `;
      refreshIcons();
    };
    render('');
    $('#search-input').addEventListener('input', U.debounce((e) => render(e.target.value), 200));
  }

  function customerRow(c) {
    const count = vehiclesForCustomer(c.id).length;
    return `
      <a href="#/customers/${c.id}" class="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
        <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center font-semibold">
          ${U.escape((c.name || '?').slice(0, 1).toUpperCase())}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">${U.escape(c.name)}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400 truncate">${U.escape(c.phone || '')} ${c.email ? '• ' + U.escape(c.email) : ''}</div>
        </div>
        <div class="text-xs text-slate-400 flex items-center gap-1">${icon('car','w-3 h-3')} ${count}</div>
      </a>
    `;
  }

  function emptyState(iconName, msg, ctaLabel, ctaHref) {
    return `
      <div class="text-center py-16">
        <div class="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-3">${icon(iconName,'w-8 h-8')}</div>
        <div class="text-slate-500 dark:text-slate-400 mb-4">${U.escape(msg)}</div>
        ${ctaHref ? `<a href="${ctaHref}" class="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">${icon('plus','w-4 h-4')} ${U.escape(ctaLabel)}</a>` : ''}
      </div>
    `;
  }

  async function renderCustomerDetail(id) {
    const c = customerById(id);
    if (!c) { go('/customers'); return; }
    const vs = vehiclesForCustomer(id);

    // Customer stats
    const cSvcs = state.services.filter((sv) => vs.some((v) => v.id === sv.vehicleId));
    const totalSpent = cSvcs.reduce((sum, sv) => sum + svcRevenue(sv), 0);
    const lastSvc = cSvcs.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const sym = { EUR: '€', USD: '$', GBP: '£' }[state.settings.currency || 'EUR'] || '€';
    const sinceDate = c.createdAt ? U.fmtDate(c.createdAt) : '—';

    $('#view').innerHTML = `
      ${pageHeader(c.name, {
        actions: `
          <a href="#/customers/${c.id}/edit" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">${icon('edit-2','w-5 h-5')}</a>
          <button id="del-customer" class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600">${icon('trash-2','w-5 h-5')}</button>
        `
      })}
      <div class="max-w-5xl mx-auto p-4 pb-24 sm:pb-4 space-y-4">

        <!-- Customer KPIs -->
        <div class="grid grid-cols-4 gap-2">
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
            <div class="text-lg font-bold text-blue-600 dark:text-blue-400">${cSvcs.length}</div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Service</div>
          </div>
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
            <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400">${sym}${U.fmtNum(totalSpent)}</div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Σύνολο</div>
          </div>
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
            <div class="text-sm font-bold">${lastSvc ? U.fmtDate(lastSvc.date) : '—'}</div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Τελ. service</div>
          </div>
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
            <div class="text-sm font-bold">${sinceDate}</div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Πελάτης από</div>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
          ${c.phone ? `<div class="flex items-center gap-2"><span class="text-slate-400">${icon('phone','w-4 h-4')}</span><a href="tel:${U.escape(c.phone)}" class="text-blue-700 dark:text-blue-500">${U.escape(c.phone)}</a></div>` : ''}
          ${c.email ? `<div class="flex items-center gap-2"><span class="text-slate-400">${icon('mail','w-4 h-4')}</span><a href="mailto:${U.escape(c.email)}" class="text-blue-700 dark:text-blue-500">${U.escape(c.email)}</a></div>` : ''}
          ${c.address ? `<div class="flex items-center gap-2"><span class="text-slate-400">${icon('map-pin','w-4 h-4')}</span>${U.escape(c.address)}</div>` : ''}
          ${c.company ? `<div class="flex items-center gap-2"><span class="text-slate-400">${icon('briefcase','w-4 h-4')}</span>${U.escape(c.company)}</div>` : ''}
          ${c.taxId ? `<div class="flex items-center gap-2"><span class="text-slate-400">${icon('hash','w-4 h-4')}</span>ΑΦΜ: ${U.escape(c.taxId)}</div>` : ''}
          ${c.notes ? `<div class="text-sm text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-700">${U.escape(c.notes)}</div>` : ''}

          ${c.phone ? `
            <div class="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <a target="_blank" href="${U.whatsappLink(c.phone, '')}" class="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-circle','w-4 h-4')} WhatsApp</a>
              <a href="${U.smsLink(c.phone, '')}" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-square','w-4 h-4')} SMS</a>
              <a href="tel:${U.escape(c.phone)}" class="flex-1 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('phone-call','w-4 h-4')} ${t('open')}</a>
            </div>
          ` : ''}
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <h2 class="font-semibold">${t('customer_vehicles')}</h2>
            <a href="#/vehicles/new?customer=${c.id}" class="text-sm text-blue-700 dark:text-blue-500 flex items-center gap-1">${icon('plus','w-4 h-4')} ${t('new_vehicle')}</a>
          </div>
          ${vs.length ? `
            <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
              ${vs.map(vehicleRow).join('')}
            </div>
          ` : `<div class="text-sm text-slate-500 dark:text-slate-400 italic py-4">${t('no_vehicles')}</div>`}
        </div>
      </div>
    `;

    $('#del-customer').addEventListener('click', async () => {
      if (!confirm(t('confirm_delete'))) return;
      for (const v of vs) {
        const vJOs = state.jobOrders.filter((j) => j.vehicleId === v.id);
        for (const j of vJOs) await DB.remove('job_orders', j.id);
        for (const s of servicesForVehicle(v.id)) await DB.remove('services', s.id);
        await DB.remove('vehicles', v.id);
      }
      for (const a of (state.appointments || []).filter((a) => a.customerId === c.id)) await DB.remove('appointments', a.id);
      await DB.remove('customers', c.id);
      U.toast(t('deleted'));
      go('/customers');
    });
  }

  async function renderCustomerForm(id) {
    const c = id ? customerById(id) : {};
    if (id && !c) { go('/customers'); return; }

    // Scan flow: pre-fill name and link to vehicle
    const pendingName = !id ? (sessionStorage.getItem('ai_scan_customer_name') || '') : '';
    const pendingVehicleId = !id ? (sessionStorage.getItem('ai_scan_vehicle_id') || '') : '';
    const pendingVehicle = pendingVehicleId ? vehicleById(pendingVehicleId) : null;

    const linkBanner = pendingVehicle ? `
      <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 flex items-start gap-2 text-sm">
        ${icon('link','w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0')}
        <div>
          <div class="font-medium text-indigo-800 dark:text-indigo-200">Σύνδεση με όχημα</div>
          <div class="text-indigo-600 dark:text-indigo-300 text-xs mt-0.5">${U.escape(vehicleLabel(pendingVehicle))}</div>
        </div>
      </div>` : '';

    $('#view').innerHTML = `
      ${pageHeader(id ? t('edit') + ' ' + t('customer') : t('new_customer'))}
      <div class="max-w-2xl mx-auto p-4 pb-24 sm:pb-4 space-y-4">
        ${linkBanner}
        <form id="customer-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">${t('customer_name')} <span class="text-red-500">*</span></label>
            <div class="flex gap-2">
              <input type="text" name="name" id="cf-name" value="${U.escape((c.name || pendingName || '').toUpperCase())}" required autocomplete="name" data-vi="1"
                oninput="this.value=this.value.toUpperCase()"
                class="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ${micBtn('cf-name', { transform: 'name' })}
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">${t('customer_phone')}</label>
            <div class="flex gap-2">
              <input type="tel" name="phone" id="cf-phone" value="${U.escape(c.phone || '')}" placeholder="+30 69..." data-vi="1"
                class="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ${micBtn('cf-phone', { transform: 'phone' })}
            </div>
          </div>
          ${formField('email', t('customer_email'), c.email, { type: 'email', voice: true, transform: 'email' })}
          ${formField('address', t('customer_address'), c.address, { voice: true })}
          <div class="grid grid-cols-2 gap-3">
            ${formField('company', t('customer_company'), c.company, { voice: true })}
            ${formField('taxId', t('customer_tax_id'), c.taxId, { voice: true, transform: 'number' })}
          </div>
          ${formTextArea('notes', t('notes'), c.notes)}
          <!-- Contact methods (multi-select) -->
          <div>
            <label class="block text-sm font-medium mb-1">Τρόποι επικοινωνίας <span class="text-xs font-normal text-slate-400">(επίλεξε όσους έχει ο πελάτης)</span></label>
            <div class="grid grid-cols-2 gap-2" id="cm-grid">
              <button type="button" data-cm="sms" class="cm-btn flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-medium transition-all">
                ${icon('message-square','w-5 h-5')} SMS
              </button>
              <button type="button" data-cm="whatsapp" class="cm-btn flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-medium transition-all">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.529 5.843L0 24l6.306-1.505A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.655-.493-5.193-1.357l-.371-.22-3.747.895.93-3.65-.24-.385A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                WhatsApp
              </button>
            </div>
            <input type="hidden" name="contactMethods" id="contact-methods-val" value="" />
          </div>
          <div class="flex gap-2 pt-2">
            <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg">${t('save')}</button>
            <button type="button" onclick="history.back()" class="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-medium py-2.5 rounded-lg">${t('cancel')}</button>
          </div>
        </form>
      </div>
    `;
    // Contact methods — multi-select toggle buttons
    const cmActive = { sms:'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700', whatsapp:'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600' };
    const cmInactive = 'border-slate-200 dark:border-slate-700 text-slate-500';
    // Load existing: new field contactMethods[] or legacy preferredContact string
    const existingMethods = c.contactMethods
      ? (Array.isArray(c.contactMethods) ? c.contactMethods : JSON.parse(c.contactMethods || '[]'))
      : (c.preferredContact ? [c.preferredContact] : []);
    const activeMethods = new Set(existingMethods);

    function refreshCmBtns() {
      $$('.cm-btn').forEach((b) => {
        const m = b.dataset.cm;
        b.className = 'cm-btn flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-medium transition-all ' +
          (activeMethods.has(m) ? cmActive[m] : cmInactive);
      });
      $('#contact-methods-val').value = JSON.stringify([...activeMethods]);
    }
    refreshCmBtns();
    $$('.cm-btn').forEach((b) => b.addEventListener('click', () => {
      const m = b.dataset.cm;
      activeMethods.has(m) ? activeMethods.delete(m) : activeMethods.add(m);
      refreshCmBtns();
    }));
    $('#customer-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = formData(e.target);
      if (!id && state.settings.workshopMode === 'demo' && state.customers.filter((c) => !c.id.startsWith('demo-')).length >= 3) {
        U.toast('Λειτουργία Demo: μέχρι 3 δωρεάν καταχωρήσεις. Ενεργοποιήστε για απεριόριστη χρήση.', 'error');
        return;
      }
      if (id) data.id = id;
      const saved = await DB.add('customers', data);
      U.toast(t('saved'));
      if (pendingVehicle) {
        await DB.add('vehicles', { ...pendingVehicle, customerId: saved.id });
        sessionStorage.removeItem('ai_scan_customer_name');
        sessionStorage.removeItem('ai_scan_vehicle_id');
        go('/vehicles/' + pendingVehicleId);
      } else {
        go('/customers/' + saved.id);
      }
    });
  }

  // =========================================================
  //  VEHICLES
  // =========================================================
  async function renderVehicles() {
    $('#view').innerHTML = `
      ${pageHeader(t('vehicles'), {
        back: false,
        actions: `<a href="#/vehicles/new" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">${icon('plus','w-4 h-4')} ${t('add')}</a>`
      })}
      <div class="max-w-5xl mx-auto p-4 pb-24 sm:pb-4">
        <div class="flex gap-2 mb-4">
          <div class="relative flex-1">
            <input id="search-input" type="search" placeholder="${t('search')}" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600" />
            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">${icon('search','w-4 h-4')}</div>
          </div>
          <select id="type-filter" class="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
            <option value="">${t('vehicle_type')}</option>
            <option value="car">${t('vehicle_type_car')}</option>
            <option value="moto">${t('vehicle_type_moto')}</option>
            <option value="boat">${t('vehicle_type_boat')}</option>
            <option value="truck">${t('vehicle_type_truck')}</option>
          </select>
        </div>
        <div id="vehicles-list"></div>
      </div>
    `;
    const list = $('#vehicles-list');
    const render = () => {
      const q = ($('#search-input').value || '').toLowerCase();
      const tf = $('#type-filter').value;
      const filtered = state.vehicles.filter((v) => {
        if (tf && v.type !== tf) return false;
        if (!q) return true;
        const c = customerById(v.customerId);
        return [v.brand, v.model, v.plate, v.vin, c?.name].some((f) => (f || '').toLowerCase().includes(q));
      });
      if (!filtered.length) {
        list.innerHTML = emptyState('car', t('no_vehicles'), t('new_vehicle'), '#/vehicles/new');
        refreshIcons();
        return;
      }
      list.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
          ${filtered.map(vehicleRow).join('')}
        </div>
      `;
      refreshIcons();
    };
    render();
    $('#search-input').addEventListener('input', U.debounce(render, 200));
    $('#type-filter').addEventListener('change', render);
  }

  function vehicleRow(v) {
    const c = customerById(v.customerId);
    const r = U.reminderStatus(v, servicesForVehicle(v.id), state.settings);
    const statusBadge =
      r.status === 'overdue' ? `<span class="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">${t('overdue_by',{n:-r.days})}</span>`
      : r.status === 'upcoming' ? `<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">${t('days_left',{n:r.days})}</span>`
      : '';
    return `
      <a href="#/vehicles/${v.id}" class="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
        <div class="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
          ${icon(vehicleIcon(v.type),'w-5 h-5')}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">${U.escape(vehicleLabel(v))}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400 truncate">${U.escape(c?.name || '—')}</div>
        </div>
        ${statusBadge}
      </a>
    `;
  }

  // Module-level chart instances (to destroy on re-render)
  let _charts = [];
  function destroyCharts() { _charts.forEach((c) => { try { c.destroy(); } catch(e){} }); _charts = []; }

  function serviceIconConfig(type) {
    const s = (type || '').toLowerCase();
    if (s.includes('λάδ') || s.includes('oil') || s.includes('λιπ')) return { icon: 'droplets', bg: 'bg-blue-600' };
    if (s.includes('φρέν') || s.includes('brake') || s.includes('τακάκ') || s.includes('δίσκ')) return { icon: 'disc', bg: 'bg-red-500' };
    if (s.includes('ελαστ') || s.includes('tire') || s.includes('ρόδ')) return { icon: 'circle-dot', bg: 'bg-slate-700' };
    if (s.includes('μπαταρ') || s.includes('battery')) return { icon: 'battery-charging', bg: 'bg-yellow-500' };
    if (s.includes('κτεο') || s.includes('inspect') || s.includes('έλεγχ')) return { icon: 'clipboard-check', bg: 'bg-blue-500' };
    if (s.includes('κλιματ') || s.includes('air') || s.includes('ac')) return { icon: 'wind', bg: 'bg-cyan-500' };
    return { icon: 'wrench', bg: 'bg-blue-500' };
  }

  function vehicleServiceCard(s) {
    const cfg = serviceIconConfig(s.type);
    return `
      <a href="#/services/${s.id}" class="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
        <div class="w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0 shadow-sm">
          ${icon(cfg.icon, 'w-5 h-5 text-white')}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-xs text-slate-400 dark:text-slate-500">${U.fmtDate(s.date)}</div>
          ${s.mileage ? `<div class="text-xs text-slate-500 dark:text-slate-400">${Number(s.mileage).toLocaleString()} km</div>` : ''}
        </div>
        ${icon('chevron-right', 'w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0')}
      </a>
    `;
  }

  function buildVehicleCharts(services) {
    if (!window.Chart) return;
    destroyCharts();

    // Monthly expenses (last 7 months)
    const months = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleDateString('el-GR', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), total: 0 });
    }
    services.forEach((s) => {
      const d = new Date(s.date);
      const mi = months.findIndex((m) => m.year === d.getFullYear() && m.month === d.getMonth());
      if (mi >= 0) {
        months[mi].total += 0;
      }
    });

    const expCanvas = document.getElementById('chart-expenses');
    if (expCanvas) {
      const isDark = document.documentElement.classList.contains('dark');
      const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      const txtColor = isDark ? '#94a3b8' : '#64748b';
      _charts.push(new Chart(expCanvas, {
        type: 'bar',
        data: {
          labels: months.map((m) => m.label),
          datasets: [{ data: months.map((m) => m.total), backgroundColor: months.map((m, i) => i === months.length - 1 ? '#f97316' : '#fdba74'), borderRadius: 6, borderSkipped: false }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: txtColor, font: { size: 10 } } },
            y: { grid: { color: gridColor }, ticks: { color: txtColor, font: { size: 10 }, callback: (v) => v > 0 ? v.toLocaleString() : '' }, beginAtZero: true },
          },
        },
      }));
    }

    // Mileage history line chart
    const milData = services.filter((s) => s.mileage).sort((a, b) => new Date(a.date) - new Date(b.date));
    const milCanvas = document.getElementById('chart-mileage');
    if (milCanvas && milData.length > 1) {
      const isDark = document.documentElement.classList.contains('dark');
      const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      const txtColor = isDark ? '#94a3b8' : '#64748b';
      _charts.push(new Chart(milCanvas, {
        type: 'line',
        data: {
          labels: milData.map((s) => U.fmtDate(s.date).slice(0, 5)),
          datasets: [{
            data: milData.map((s) => Number(s.mileage)),
            borderColor: '#1e293b', backgroundColor: 'rgba(30,41,59,0.08)',
            pointBackgroundColor: '#1e293b', pointRadius: 4, tension: 0.3, fill: true,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: txtColor, font: { size: 10 } } },
            y: { grid: { color: gridColor }, ticks: { color: txtColor, font: { size: 10 }, callback: (v) => v.toLocaleString() }, beginAtZero: false },
          },
        },
      }));
    } else if (milCanvas) {
      milCanvas.parentElement.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">${t('no_mileage_data')}</p>`;
    }
  }

  async function renderVehicleDetail(id) {
    const v = vehicleById(id);
    if (!v) { go('/vehicles'); return; }
    const c = customerById(v.customerId);
    const services = servicesForVehicle(id);
    const r = U.reminderStatus(v, services, state.settings);

    $('#view').innerHTML = `
      <!-- Compact header -->
      <div class="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div class="max-w-5xl mx-auto flex items-center gap-3 px-4 py-3">
          <button onclick="history.back()" class="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">${icon('chevron-left','w-5 h-5')}</button>
          <h1 class="text-base font-semibold flex-1 truncate">${U.escape(t('vehicles'))}</h1>
          <a href="#/vehicles/${v.id}/edit" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">${icon('edit-2','w-5 h-5')}</a>
          <button id="del-vehicle" class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">${icon('trash-2','w-5 h-5')}</button>
        </div>
      </div>

      <!-- Vehicle hero -->
      <div class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-4 pb-0">
        <div class="max-w-5xl mx-auto">
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex-1 min-w-0">
              <div class="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide mb-0.5">${t('vehicle_owner')}: ${U.escape(c?.name || '—')}</div>
              <h2 class="text-2xl font-bold leading-tight">${U.escape(v.brand || '')} ${U.escape(v.model || '')} <span class="text-blue-600">${v.plate ? '(' + U.escape(v.plate) + ')' : v.year ? '(' + v.year + ')' : ''}</span></h2>
              ${v.plate ? `<div class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">${t('vehicle_plate')}: ${U.escape(v.plate)}</div>` : ''}
              ${v.mileage ? `<div class="text-sm font-semibold text-blue-700 dark:text-blue-500 mt-1">${Number(v.mileage).toLocaleString()} km</div>` : ''}
            </div>
            <div class="w-20 h-16 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-center justify-center flex-shrink-0">
              ${icon(vehicleIcon(v.type), 'w-10 h-10 text-blue-500')}
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex gap-2 pb-3 overflow-x-auto no-scrollbar">
            <a href="#/services/new?vehicle=${v.id}" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 whitespace-nowrap shadow-sm flex-shrink-0">${icon('plus','w-4 h-4')} Νέα Καταγραφή</a>
            <a href="#/job-orders/new?vehicle=${v.id}" class="border border-blue-400 dark:border-blue-800 text-blue-700 dark:text-blue-500 bg-blue-50 dark:bg-blue-900/20 text-sm font-medium px-4 py-2 rounded-full flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">${icon('clipboard-check','w-4 h-4')} Εντολή</a>
            <button id="send-reminder" class="border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium px-4 py-2 rounded-full flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">${icon('bell','w-4 h-4')} ${t('send_reminder')}</button>
            <button id="send-history" class="border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium px-4 py-2 rounded-full flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">${icon('share-2','w-4 h-4')} ${t('share')}</button>
          </div>

          <!-- Tabs -->
          <div class="flex border-t border-slate-100 dark:border-slate-800">
            <button data-tab="history" class="tab-btn tab-active px-4 py-3 text-sm font-semibold">${t('vehicle_history')}</button>
            <button data-tab="info" class="tab-btn tab-inactive px-4 py-3 text-sm font-medium">${t('vehicle')}</button>
            <button data-tab="maintenance" class="tab-btn tab-inactive px-4 py-3 text-sm font-medium">Πρόγραμμα</button>
          </div>
        </div>
      </div>

      <!-- Tab content -->
      <div id="tab-content" class="max-w-5xl mx-auto pb-24 sm:pb-8"></div>
    `;

    function renderHistoryTab() {
      const tc = $('#tab-content');
      tc.innerHTML = `
        <div class="sm:grid sm:grid-cols-5 sm:gap-0 min-h-[60vh]">
          <!-- Left: service list -->
          <div class="sm:col-span-3 sm:border-r border-slate-200 dark:border-slate-700">
            ${services.length ? `
              <div class="divide-y divide-slate-100 dark:divide-slate-700">
                ${services.map(vehicleServiceCard).join('')}
              </div>
              ${r.status === 'overdue' || r.status === 'upcoming' ? `
                <div class="mx-4 mt-3 p-3 rounded-xl border ${r.status==='overdue'?'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10':'border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10'}">
                  <div class="text-xs font-semibold ${r.status==='overdue'?'text-red-700 dark:text-red-300':'text-amber-700 dark:text-amber-300'}">${t('next_service_due')}: ${r.nextDate ? U.fmtDate(r.nextDate) : '—'} ${r.days != null ? (r.status==='overdue'?'('+t('overdue_by',{n:-r.days})+')':'('+t('days_left',{n:r.days})+')') : ''}</div>
                </div>
              ` : ''}
            ` : `
              <div class="p-8 text-center">
                <div class="w-14 h-14 mx-auto bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-3 text-blue-500">${icon('wrench','w-7 h-7')}</div>
                <div class="text-slate-400 text-sm">${t('no_service_history')}</div>
                <a href="#/services/new?vehicle=${v.id}" class="mt-3 inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium">${icon('plus','w-4 h-4')} Νέα Καταγραφή</a>
              </div>
            `}
          </div>

          <!-- Right: charts -->
          <div class="sm:col-span-2 p-4 space-y-4">
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold text-sm">Ιστορικό Service</h3>
              </div>
              <div style="height:140px"><canvas id="chart-expenses"></canvas></div>
            </div>
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <h3 class="font-semibold text-sm mb-3">Χιλιόμετρα</h3>
              <div style="height:140px" id="chart-mileage-wrap"><canvas id="chart-mileage"></canvas></div>
            </div>
          </div>
        </div>
      `;
      refreshIcons();
      // Small delay to ensure canvas is in DOM
      setTimeout(() => buildVehicleCharts(services), 50);
    }

    function renderInfoTab() {
      const tc = $('#tab-content');
      tc.innerHTML = `
        <div class="p-4 space-y-4">
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div class="grid grid-cols-2 gap-4 text-sm">
              ${kv(t('vehicle_owner'), c ? `<a class="text-blue-700 dark:text-blue-500 font-semibold" href="#/customers/${c.id}">${U.escape(c.name)}</a>` : '—', true)}
              ${kv(t('vehicle_type'), t('vehicle_type_' + (v.type || 'car')))}
              ${kv(t('vehicle_brand'), v.brand)}
              ${kv(t('vehicle_model'), v.model)}
              ${kv(t('vehicle_year'), v.year)}
              ${kv(t('vehicle_plate'), v.plate)}
              ${kv(t('vehicle_vin'), v.vin, true)}
              ${kv(t('vehicle_engine'), v.engine ? v.engine + ' cc' : '')}
              ${kv(t('vehicle_fuel'), v.fuel ? t('fuel_' + v.fuel) : '')}
              ${kv(t('vehicle_color'), v.color)}
              ${kv(t('vehicle_mileage'), v.mileage ? Number(v.mileage).toLocaleString() + ' km' : '')}
            </div>
            ${v.notes ? `<div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">${U.escape(v.notes)}</div>` : ''}
          </div>
          ${v.regPhoto ? `<img src="${v.regPhoto}" alt="reg" class="w-full max-h-56 object-cover rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm" />` : ''}
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 text-center shadow-sm">
              <div class="text-xs text-slate-400">${t('last_service')}</div>
              <div class="font-bold mt-1">${r.lastService ? U.fmtDate(r.lastService.date) : '—'}</div>
            </div>
            <div class="bg-white dark:bg-slate-800 rounded-2xl border ${r.status==='overdue'?'border-red-300':'border-slate-200 dark:border-slate-700'} p-3 text-center shadow-sm">
              <div class="text-xs text-slate-400">${t('next_service_due')}</div>
              <div class="font-bold mt-1 ${r.status==='overdue'?'text-red-600 dark:text-red-400':''}">${r.nextDate ? U.fmtDate(r.nextDate) : '—'}</div>
              ${r.days != null ? `<div class="text-xs ${r.status==='overdue'?'text-red-500':r.status==='upcoming'?'text-amber-500':'text-slate-400'}">${r.status==='overdue'?t('overdue_by',{n:-r.days}):t('days_left',{n:r.days})}</div>` : ''}
            </div>
          </div>
          ${(v.kteoExpiry || v.emissionsExpiry) ? `
          <div class="space-y-2">
            <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
              ${icon('shield-check','w-3.5 h-3.5')} ΚΤΕΟ &amp; Καυσαέρια
            </div>
            ${kteoStatusBadge(kteoStatus(v), 'ΚΤΕΟ', 'shield-check')}
            ${kteoStatusBadge(emissionsStatus(v), 'Κάρτα Καυσαερίων', 'wind')}
          </div>` : ''}
        </div>
      `;
      refreshIcons();
    }

    function renderMaintenanceTab() {
      const tc = $('#tab-content');
      const entry = window.MAINT_DB ? window.MAINT_DB.find(v.brand, v.model, v.fuel) : null;
      if (!entry) {
        tc.innerHTML = `
          <div class="p-8 text-center text-slate-400 text-sm">
            <div class="w-14 h-14 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">${icon('wrench','w-7 h-7')}</div>
            Δεν βρέθηκαν δεδομένα για αυτό το όχημα.
          </div>`;
        return;
      }
      const catColors = { oil:'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', filter:'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', timing:'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', brake:'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', tire:'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300', fluid:'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', spark:'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', ac:'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300', misc:'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' };
      const catLabel = { oil:'Λάδι', filter:'Φίλτρο', timing:'Χρονισμός', brake:'Φρένα', tire:'Ελαστικά', fluid:'Υγρά', spark:'Μπουζί', ac:'A/C', misc:'Γενικά' };
      const rows = entry.services.map(s => `
        <tr class="border-t border-slate-100 dark:border-slate-700">
          <td class="px-3 py-2.5 text-sm font-medium">${s.n}</td>
          <td class="px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">${[s.km ? s.km.toLocaleString()+' km' : null, s.months ? s.months+' μήνες' : null].filter(Boolean).join(' / ') || '—'}</td>
          <td class="px-3 py-2.5"><span class="text-xs font-medium px-2 py-0.5 rounded-full ${catColors[s.cat]||catColors.misc}">${catLabel[s.cat]||s.cat}</span></td>
          <td class="px-3 py-2.5 text-xs text-slate-400">${s.note||''}</td>
        </tr>
        ${s.warn ? `<tr class="bg-red-50 dark:bg-red-900/10"><td colspan="4" class="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 font-medium">${icon('alert-triangle','w-3.5 h-3.5 inline mr-1')}${s.warn}</td></tr>` : ''}
      `).join('');
      tc.innerHTML = `
        <div class="p-4 space-y-3">
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div class="font-semibold text-sm">${entry.make} ${entry.models.join(' / ')}</div>
                <div class="text-xs text-slate-400">${entry.years}${entry.fuel ? ' · '+entry.fuel : ''}</div>
              </div>
              ${entry.timing ? `<span class="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full font-medium">${icon('clock','w-3 h-3 inline mr-0.5')}${entry.timing}</span>` : ''}
            </div>
            ${entry.note ? `<div class="px-4 py-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/30">${icon('info','w-3.5 h-3.5 inline mr-1')}${entry.note}</div>` : ''}
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead><tr class="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-400 uppercase tracking-wide">
                  <th class="px-3 py-2 font-semibold">Εργασία</th>
                  <th class="px-3 py-2 font-semibold text-right">Διάστημα</th>
                  <th class="px-3 py-2 font-semibold">Κατηγορία</th>
                  <th class="px-3 py-2 font-semibold">Σημείωση</th>
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
          <p class="text-xs text-slate-400 px-1">* Τα παραπάνω αφορούν ενδεικτικά διαστήματα service. Ακολουθείτε πάντα το εγχειρίδιο κατασκευαστή.</p>
        </div>`;
      refreshIcons();
    }

    // Render initial tab
    renderHistoryTab();

    // Tab switching
    $$('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.tab-btn').forEach((b) => { b.classList.remove('tab-active'); b.classList.add('tab-inactive'); });
        btn.classList.remove('tab-inactive'); btn.classList.add('tab-active');
        destroyCharts();
        if (btn.dataset.tab === 'history') renderHistoryTab();
        else if (btn.dataset.tab === 'maintenance') renderMaintenanceTab();
        else renderInfoTab();
      });
    });

    $('#del-vehicle').addEventListener('click', async () => {
      if (!confirm(t('confirm_delete'))) return;
      destroyCharts();
      const vJOs = state.jobOrders.filter((j) => j.vehicleId === v.id);
      for (const j of vJOs) await DB.remove('job_orders', j.id);
      for (const s of services) await DB.remove('services', s.id);
      for (const a of (state.appointments || []).filter((a) => a.vehicleId === v.id)) await DB.remove('appointments', a.id);
      await DB.remove('vehicles', v.id);
      U.toast(t('deleted'));
      go('/vehicles');
    });

    $('#send-reminder').addEventListener('click', () => openReminderDialog(v, c));
    $('#send-history').addEventListener('click', async () => {
      const lines = [];
      lines.push(state.settings.workshopName || t('app_name'));
      lines.push(`${t('vehicle_history')} - ${vehicleLabel(v)}`);
      lines.push('');
      services.forEach((s) => {
        lines.push(`• ${U.fmtDate(s.date)} - ${s.mileage ? Number(s.mileage).toLocaleString() + ' km' : ''}`);
        if (s.description) lines.push('  ' + s.description.split('\n')[0]);
      });
      await U.share(vehicleLabel(v), lines.join('\n'));
    });
  }

  function kv(label, value, full) {
    return `
      <div class="${full ? 'col-span-2' : ''}">
        <div class="text-xs text-slate-500 dark:text-slate-400">${U.escape(label)}</div>
        <div class="font-medium truncate">${value || '—'}</div>
      </div>
    `;
  }

  async function renderVehicleForm(id) {
    const v = id ? vehicleById(id) : {};
    if (id && !v) { go('/vehicles'); return; }

    // Prefill customer from query
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    const prefCustomer = qs.get('customer');
    if (!id && prefCustomer) v.customerId = prefCustomer;

    // Prefill from AI scan
    const aiData = sessionStorage.getItem('ai_scan_result');
    if (!id && aiData) {
      try {
        const d = JSON.parse(aiData);
        Object.assign(v, d);
        sessionStorage.removeItem('ai_scan_result');
      } catch (e) {}
    }

    const sortedCustomers = state.customers.slice().sort((a, b) => a.name.localeCompare(b.name));
    const preselectedCustomer = v.customerId ? customerById(v.customerId) : null;

    function customerPickerRows(filter = '') {
      const q = filter.toLowerCase().trim();
      const matches = q ? sortedCustomers.filter((c) => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)) : sortedCustomers;
      if (!matches.length) return `<div class="px-3 py-4 text-sm text-slate-400 text-center">${t('no_results')}</div>`;
      return matches.slice(0, 12).map((c) => `
        <button type="button" class="cust-pick-row w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" data-cid="${c.id}" data-cname="${U.escape(c.name)}">
          <div class="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400 flex items-center justify-center font-bold text-sm flex-shrink-0">${U.escape(c.name.charAt(0).toUpperCase())}</div>
          <div class="min-w-0">
            <div class="font-medium text-sm truncate">${U.escape(c.name)}</div>
            ${c.phone ? `<div class="text-xs text-slate-400 truncate">${U.escape(c.phone)}</div>` : ''}
          </div>
        </button>
      `).join('');
    }

    $('#view').innerHTML = `
      ${pageHeader(id ? t('edit') + ' ' + t('vehicle') : t('new_vehicle'), {
        actions: !id ? `<a href="#/scan" class="px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium flex items-center gap-1">${icon('scan-line','w-4 h-4')} AI</a>` : ''
      })}
      <div class="max-w-2xl mx-auto p-4 pb-24 sm:pb-4">
        <form id="vehicle-form" class="space-y-4">

          <!-- Searchable customer picker -->
          <div>
            <label class="block text-sm font-medium mb-1">${t('customer_name')} <span class="text-red-500">*</span></label>
            <input type="hidden" name="customerId" id="vf-cid" value="${v.customerId || ''}" />

            <!-- Selected display -->
            <div id="vf-csel" class="${preselectedCustomer ? '' : 'hidden'} flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div class="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">${preselectedCustomer ? U.escape(preselectedCustomer.name.charAt(0).toUpperCase()) : ''}</div>
              <div class="flex-1 min-w-0">
                <div id="vf-csel-name" class="font-semibold truncate">${preselectedCustomer ? U.escape(preselectedCustomer.name) : ''}</div>
                ${preselectedCustomer?.phone ? `<div class="text-xs text-slate-500">${U.escape(preselectedCustomer.phone)}</div>` : ''}
              </div>
              <button type="button" id="vf-cclear" class="text-slate-400 hover:text-red-500 p-1">${icon('x','w-4 h-4')}</button>
            </div>

            <!-- Search -->
            <div id="vf-csearch" class="${preselectedCustomer ? 'hidden' : ''}">
              <div class="flex gap-2">
                <div class="relative flex-1">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">${icon('search','w-4 h-4')}</div>
                  <input type="text" id="vf-cq" placeholder="${t('customer_search_placeholder')}" autocomplete="off"
                    class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <a href="#/customers/new" class="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-500 hover:bg-blue-200 dark:hover:bg-blue-900/50 flex-shrink-0" title="${t('new_customer')}">
                  ${icon('user-plus','w-4 h-4')}
                </a>
              </div>
              <div id="vf-clist" class="mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
                ${customerPickerRows()}
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">${t('vehicle_type')}</label>
            <div class="grid grid-cols-4 gap-2">
              ${['car','moto','boat','truck'].map((tp) => `
                <label class="cursor-pointer">
                  <input type="radio" name="type" value="${tp}" ${(v.type||'car')===tp?'checked':''} class="peer sr-only" />
                  <div class="border border-slate-200 dark:border-slate-700 rounded-lg py-2 text-center text-xs peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600">
                    ${icon(vehicleIcon(tp),'w-5 h-5 mx-auto mb-1')}
                    ${t('vehicle_type_'+tp)}
                  </div>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            ${formField('brand', t('vehicle_brand'), v.brand, { required: true })}
            ${formField('model', t('vehicle_model'), v.model, { required: true })}
          </div>
          <div class="grid grid-cols-2 gap-3">
            ${formField('year', t('vehicle_year'), v.year, { type: 'number' })}
            <div>
              <label class="block text-sm font-medium mb-1">${t('vehicle_plate')}</label>
              <div class="flex gap-2">
                <input type="text" name="plate" id="vf-plate" value="${U.escape(v.plate || '')}" autocomplete="off" spellcheck="false" data-vi="1"
                  class="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500" />
                ${micBtn('vf-plate', { transform: 'plate' })}
              </div>
            </div>
          </div>
          ${formField('vin', t('vehicle_vin'), v.vin)}
          <div class="grid grid-cols-2 gap-3">
            ${formField('engine', t('vehicle_engine'), v.engine, { placeholder: 'cc' })}
            ${formField('engineCode', t('vehicle_engine_code'), v.engineCode)}
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium mb-1">${t('vehicle_fuel')}</label>
              <select name="fuel" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <option value="">—</option>
                ${['gasoline','diesel','lpg','hybrid','electric'].map((f) =>
                  `<option value="${f}" ${v.fuel===f?'selected':''}>${t('fuel_'+f)}</option>`
                ).join('')}
              </select>
            </div>
            ${formField('color', t('vehicle_color'), v.color)}
          </div>
          ${formField('mileage', t('vehicle_mileage'), v.mileage, { type: 'number' })}

          <div>
            <label class="block text-sm font-medium mb-1">${t('photo')} ${t('vehicle')} / ${t('qa_scan_doc')}</label>
            <div class="flex items-center gap-3">
              ${v.regPhoto ? `<img id="reg-preview" src="${v.regPhoto}" class="w-24 h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />` : `<div id="reg-preview-empty" class="w-24 h-24 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400">${icon('image','w-8 h-8')}</div>`}
              <div class="flex-1 flex flex-col gap-2">
                <label class="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-2 rounded-lg text-sm cursor-pointer flex items-center gap-1 justify-center">
                  ${icon('camera','w-4 h-4')} ${t('take_photo')}
                  <input type="file" accept="image/*" capture="environment" class="hidden" id="reg-file" />
                </label>
                <input type="hidden" name="regPhoto" value="${v.regPhoto || ''}" id="reg-photo-hidden" />
              </div>
            </div>
          </div>

          ${formTextArea('notes', t('notes'), v.notes, { voice: true })}

          <!-- ΚΤΕΟ & Καυσαέρια -->
          <div class="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div class="flex items-center gap-2 font-semibold text-sm">
              ${icon('shield-check','w-4 h-4 text-blue-500')}
              ΚΤΕΟ &amp; Κάρτα Καυσαερίων
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">Λήξη ΚΤΕΟ (από αυτοκόλλητο)</label>
                <input type="month" name="kteoExpiry" id="vf-kteo"
                  value="${v.kteoExpiry || ''}"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">Κάρτα Καυσαερίων (αυτόματο −1 έτος)</label>
                <input type="month" name="emissionsExpiry" id="vf-emissions"
                  value="${v.emissionsExpiry || ''}"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <p class="text-xs text-slate-400">Η κάρτα καυσαερίων συμπληρώνεται αυτόματα 1 χρόνο πριν τη λήξη ΚΤΕΟ. Μπορείτε να την τροποποιήσετε.</p>
          </div>

          <div class="flex gap-2 pt-2">
            <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg">${t('save')}</button>
            <button type="button" onclick="history.back()" class="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-medium py-2.5 rounded-lg">${t('cancel')}</button>
          </div>
        </form>
      </div>
    `;

    refreshIcons();

    // Customer picker
    function selectCustomer(cid, cname) {
      $('#vf-cid').value = cid;
      $('#vf-csel-name').textContent = cname;
      $('#vf-csel').querySelector('.w-10').textContent = cname.charAt(0).toUpperCase();
      $('#vf-csel').classList.remove('hidden');
      $('#vf-csearch').classList.add('hidden');
      $('#vf-cq').value = '';
    }
    function clearCustomer() {
      $('#vf-cid').value = '';
      $('#vf-csel').classList.add('hidden');
      $('#vf-csearch').classList.remove('hidden');
      $('#vf-clist').innerHTML = customerPickerRows();
      refreshIcons();
    }
    $('#vf-cclear')?.addEventListener('click', clearCustomer);
    $('#vf-cq')?.addEventListener('input', () => {
      $('#vf-clist').innerHTML = customerPickerRows($('#vf-cq').value);
      refreshIcons();
    });
    $('#vf-clist')?.addEventListener('click', (e) => {
      const row = e.target.closest('.cust-pick-row');
      if (row) selectCustomer(row.dataset.cid, row.dataset.cname);
    });

    // Plate uppercase
    $('#vf-plate')?.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });

    // ΚΤΕΟ: auto-fill emissions = kteo - 12 months
    $('#vf-kteo')?.addEventListener('change', (e) => {
      const val = e.target.value; // YYYY-MM
      if (!val) return;
      const [y, m] = val.split('-').map(Number);
      let ey = y, em = m - 12;
      if (em <= 0) { ey -= 1; em += 12; }
      const emField = $('#vf-emissions');
      if (emField && !emField._userEdited) emField.value = `${ey}-${String(em).padStart(2,'0')}`;
    });
    $('#vf-emissions')?.addEventListener('change', (e) => { e.target._userEdited = true; });

    $('#reg-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const dataUrl = await U.readFileAsDataURL(file);
      const compressed = await U.compressImage(dataUrl, 1400, 0.85);
      $('#reg-photo-hidden').value = compressed;
      const empty = $('#reg-preview-empty');
      if (empty) {
        empty.outerHTML = `<img id="reg-preview" src="${compressed}" class="w-24 h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />`;
      } else {
        $('#reg-preview').src = compressed;
      }
    });

    $('#vehicle-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = formData(e.target);
      if (!id && state.settings.workshopMode === 'demo' && state.vehicles.filter((v) => !v.id.startsWith('demo-')).length >= 3) {
        U.toast('Λειτουργία Demo: μέχρι 3 δωρεάν καταχωρήσεις. Ενεργοποιήστε για απεριόριστη χρήση.', 'error');
        return;
      }
      if (data.year) data.year = String(data.year);
      if (data.mileage) data.mileage = Number(data.mileage);
      if (id) data.id = id;
      else if (v.id) data.id = v.id;
      const saved = await DB.add('vehicles', data);
      U.toast(t('saved'));
      const pendingCustomer = !id && sessionStorage.getItem('ai_scan_customer_name');
      if (pendingCustomer) {
        sessionStorage.setItem('ai_scan_vehicle_id', saved.id);
        go('/customers/new');
      } else {
        go('/vehicles/' + saved.id);
      }
    });
  }

  // =========================================================
  //  SERVICES
  // =========================================================
  async function renderServices() {
    $('#view').innerHTML = `
      ${pageHeader(t('services'), {
        back: false,
        actions: `<a href="#/services/new" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">${icon('plus','w-4 h-4')} ${t('add')}</a>`
      })}
      <div class="max-w-5xl mx-auto p-4 pb-24 sm:pb-4">
        <div class="relative mb-4">
          <input id="search-input" type="search" placeholder="${t('search')}" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
          <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">${icon('search','w-4 h-4')}</div>
        </div>
        <div id="services-list"></div>
      </div>
    `;
    const list = $('#services-list');
    const render = () => {
      const q = ($('#search-input').value || '').toLowerCase();
      const sorted = state.services.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
      const filtered = sorted.filter((s) => {
        if (!q) return true;
        const v = vehicleById(s.vehicleId);
        const c = v ? customerById(v.customerId) : null;
        return [s.type, s.description, v?.brand, v?.model, v?.plate, c?.name].some((f) => (f||'').toLowerCase().includes(q));
      });
      if (!filtered.length) {
        list.innerHTML = emptyState('wrench', t('no_service_history'), t('new_service'), '#/services/new');
        refreshIcons();
        return;
      }
      list.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
          ${filtered.map(serviceRow).join('')}
        </div>
      `;
      refreshIcons();
    };
    render();
    $('#search-input').addEventListener('input', U.debounce(render, 200));
  }

  async function renderServiceDetail(id) {
    const s = serviceById(id);
    if (!s) { go('/services'); return; }
    const v = vehicleById(s.vehicleId);
    const c = v ? customerById(v.customerId) : null;
    $('#view').innerHTML = `
      ${pageHeader(t('service'), {
        actions: `
          <a href="#/services/${s.id}/edit" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">${icon('edit-2','w-5 h-5')}</a>
          <button id="del-service" class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600">${icon('trash-2','w-5 h-5')}</button>
        `
      })}
      <div class="max-w-3xl mx-auto p-4 pb-24 sm:pb-4 space-y-4">
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <div class="text-xs text-slate-500 dark:text-slate-400">${U.fmtDate(s.date)}</div>
              <div class="text-lg font-bold">Service</div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-slate-100 dark:border-slate-700">
            ${kv(t('vehicle'), v ? `<a class="text-blue-700 dark:text-blue-500" href="#/vehicles/${v.id}">${U.escape(vehicleLabel(v))}</a>` : '—', true)}
            ${kv(t('customer'), c ? `<a class="text-blue-700 dark:text-blue-500" href="#/customers/${c.id}">${U.escape(c.name)}</a>` : '—', true)}
            ${kv(t('service_mileage'), s.mileage ? s.mileage + ' km' : '')}
            ${kv(t('service_mechanic'), s.mechanic)}
          </div>
        </div>

        ${s.description ? `
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">${t('service_description')}</div>
            <div class="whitespace-pre-wrap">${U.escape(s.description)}</div>
          </div>
        ` : ''}

        ${(s.checklist && s.checklist.length) ? `
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="text-sm font-semibold flex items-center gap-2">${icon('clipboard-list','w-4 h-4 text-blue-600')} Εργασίες που ζητήθηκαν</div>
              <a href="#/job-orders/new?vehicle=${s.vehicleId}&service=${s.id}" class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium">
                ${icon('plus','w-3 h-3')} Δημιουργία Εντολής
              </a>
            </div>
            <div class="flex flex-wrap gap-2">
              ${s.checklist.map((key) => `
                <span class="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2.5 py-1 rounded-full font-medium">
                  ${icon('check','w-3 h-3')} ${taskLabel(key)}
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${(s.nextServiceDate || s.nextServiceMileage) ? `
          <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
            <div class="text-xs text-amber-700 dark:text-amber-300 font-medium">${t('next_service_due')}</div>
            <div class="mt-1">${s.nextServiceDate ? U.fmtDate(s.nextServiceDate) : ''} ${s.nextServiceMileage ? ' / ' + s.nextServiceMileage + ' km' : ''}</div>
          </div>
        ` : ''}

        ${(s.photos && s.photos.length) ? `
          <div>
            <div class="text-xs text-slate-500 dark:text-slate-400 mb-2">${t('service_photos')}</div>
            <div class="grid grid-cols-3 gap-2">
              ${s.photos.map((p) => `<img src="${p}" class="rounded-lg w-full h-24 object-cover" />`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
          <button id="btn-pdf" class="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-2.5 rounded-lg flex items-center justify-center gap-1">${icon('file-text','w-4 h-4')} PDF</button>
          <button id="btn-share" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2.5 rounded-lg flex items-center justify-center gap-1">${icon('send','w-4 h-4')} ${t('send_to_customer')}</button>
          <button id="btn-print" class="bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium px-3 py-2.5 rounded-lg flex items-center justify-center gap-1">${icon('printer','w-4 h-4')} ${t('print')}</button>
        </div>
      </div>
    `;

    $('#del-service').addEventListener('click', async () => {
      if (!confirm(t('confirm_delete'))) return;
      await DB.remove('services', s.id);
      U.toast(t('deleted'));
      go('/services');
    });

    $('#btn-pdf').addEventListener('click', async () => {
      await serviceHtmlPdf(s, v, c);
    });

    $('#btn-print').addEventListener('click', () => window.print());

    $('#btn-share').addEventListener('click', () => openShareServiceDialog(s, v, c));
  }

  async function renderServiceForm(id) {
    let s = id ? serviceById(id) : {};
    if (id && !s) { go('/services'); return; }
    if (!id) {
      s = {
        date: U.localDateStr(),
      };
      const qs = new URLSearchParams(location.hash.split('?')[1] || '');
      if (qs.get('vehicle')) s.vehicleId = qs.get('vehicle');
    }

    const vehicleOptions = state.vehicles
      .slice().sort((a, b) => (a.brand || '').localeCompare(b.brand || ''))
      .map((v) => {
        const c = customerById(v.customerId);
        return `<option value="${v.id}" ${s.vehicleId === v.id ? 'selected' : ''}>${U.escape(vehicleLabel(v))} — ${U.escape(c?.name || '—')}</option>`;
      }).join('');

    const checkedItems = new Set(s.checklist || []);
    const initialVehicle = s.vehicleId ? vehicleById(s.vehicleId) : null;

    function renderServiceTasks(vehicleType, selected) {
      return renderTasksForVehicle(vehicleType || 'car', selected);
    }

    $('#view').innerHTML = `
      ${pageHeader(id ? t('edit') + ' ' + t('service') : t('new_service'))}
      <div class="max-w-3xl mx-auto p-4 pb-24 sm:pb-4">
        <form id="service-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">${t('vehicle')} <span class="text-red-500">*</span></label>
            <select id="svc-vehicle" name="vehicleId" required class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <option value="">—</option>
              ${vehicleOptions}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            ${formField('date', t('service_date'), s.date ? s.date.slice(0,10) : U.localDateStr(), { type: 'date', required: true })}
            ${formField('mileage', t('service_mileage'), s.mileage, { type: 'number' })}
          </div>

          <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900/40 rounded-xl p-4">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-semibold flex items-center gap-2">
                ${icon('sparkles','w-4 h-4 text-indigo-600')} AI Προτάσεις κατασκευαστή
              </div>
              <button type="button" id="ai-suggest-btn" class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium">
                ${icon('sparkles','w-3 h-3')} Ανάλυση οχήματος
              </button>
            </div>
            <div id="ai-suggest-result" class="empty:hidden"></div>
          </div>

          <!-- Εργασίες που ζητά ο πελάτης -->
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div class="text-sm font-semibold flex items-center gap-2">${icon('clipboard-list','w-4 h-4 text-blue-600')} Εργασίες που ζητά ο πελάτης</div>
            <div id="svc-tasks-grid">${renderServiceTasks(initialVehicle?.type, checkedItems)}</div>
            <!-- Άλλο / custom -->
            <div class="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-2">
              <div class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Άλλο</div>
              <div id="svc-custom-tasks"></div>
              <button type="button" id="svc-add-custom" class="text-sm text-blue-700 dark:text-blue-500 hover:underline flex items-center gap-1">${icon('plus','w-3 h-3')} Προσθήκη εργασίας</button>
            </div>
          </div>

          ${formTextArea('description', t('service_description'), s.description, { rows: 3, voice: true })}

          ${mechanicSelect('mechanic', s.mechanic)}

          <div class="grid grid-cols-2 gap-3">
            ${formField('nextServiceDate', t('service_next_date'), s.nextServiceDate ? s.nextServiceDate.slice(0,10) : '', { type: 'date' })}
            <div>
              ${formField('nextServiceMileage', t('service_next_in_km'), s.nextServiceMileage, { type: 'number' })}
              <div class="flex flex-wrap gap-1 mt-1.5">
                ${[3000,5000,10000,15000,20000].map((d) => `<button type="button" data-km-offset="${d}" class="next-km-btn text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-300 hover:text-blue-800 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-600 transition-colors">+${d >= 1000 ? (d/1000)+'k' : d} km</button>`).join('')}
              </div>
            </div>
          </div>

          <div class="flex gap-2 pt-2">
            <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg">${t('save')}</button>
            <button type="button" onclick="history.back()" class="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-medium py-2.5 rounded-lg">${t('cancel')}</button>
          </div>
        </form>
      </div>
    `;

    // Update task grid when vehicle changes
    $('#svc-vehicle').addEventListener('change', () => {
      const vId = $('#svc-vehicle').value;
      const veh = vehicleById(vId);
      const grid = $('#svc-tasks-grid');
      if (grid) { grid.innerHTML = renderServiceTasks(veh?.type, new Set()); refreshIcons(); }
    });

    // Next service mileage quick-select (+Xk km buttons)
    $$('.next-km-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const baseMileage = parseInt($('[name="mileage"]')?.value) || 0;
        const nextInput = $('[name="nextServiceMileage"]');
        if (nextInput) nextInput.value = baseMileage + Number(btn.dataset.kmOffset);
      });
    });

    // AI Προτάσεις button
    $('#ai-suggest-btn')?.addEventListener('click', async () => {
      const vId = $('#svc-vehicle').value;
      const veh = vehicleById(vId);
      const resultEl = $('#ai-suggest-result');
      if (!veh) { U.toast('Επίλεξε όχημα πρώτα', 'error'); return; }

      const btn = $('#ai-suggest-btn');
      btn.disabled = true;
      btn.innerHTML = `${icon('loader','w-3 h-3 animate-spin')} Ανάλυση…`;
      resultEl.innerHTML = `<div class="text-center text-slate-400 text-sm py-3 flex items-center justify-center gap-2">${icon('loader','w-4 h-4 animate-spin')} Αναζήτηση προτεινόμενων εργασιών…</div>`;
      refreshIcons();

      try {
        const resp = await fetch('/api/maintenance-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand: veh.brand, model: veh.model, year: veh.year, mileage: veh.mileage, engine: veh.engine, fuel: veh.fuel }),
        });
        const data = await resp.json();
        if (!data.tasks || !data.tasks.length) { resultEl.innerHTML = '<p class="text-sm text-slate-400 py-2">Δεν βρέθηκαν προτάσεις.</p>'; return; }

        const priorityStyle = { urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', recommended: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', suggested: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' };
        const priorityLabel = { urgent: 'Επείγον', recommended: 'Προτεινόμενο', suggested: 'Προαιρετικό' };

        resultEl.innerHTML = `
          ${data.note ? `<p class="text-xs text-slate-500 mb-3 italic">${U.escape(data.note)}</p>` : ''}
          <div class="space-y-2">
            ${data.tasks.map((task, i) => `
              <div class="flex items-start gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium">${U.escape(task.name)}</div>
                  ${task.reason ? `<div class="text-xs text-slate-400 mt-0.5">${U.escape(task.reason)}</div>` : ''}
                </div>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${priorityStyle[task.priority] || priorityStyle.suggested}">${priorityLabel[task.priority] || 'Πρόταση'}</span>
                <button type="button" data-ai-task="${U.escape(task.name)}" class="ai-add-task text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded-lg flex-shrink-0">+ Προσθήκη</button>
              </div>
            `).join('')}
          </div>
        `;

        // Fuzzy-match AI task name to a visible preset checkbox (handles Greek inflections)
        function matchAiToPreset(aiName) {
          const norm = (s) => s.toLowerCase().replace(/[^α-ωάέήίόύώa-z0-9\s]/gi, ' ').split(/\s+/).filter((w) => w.length >= 4);
          const aiWords = norm(aiName);
          if (!aiWords.length) return null;
          let bestKey = null, bestScore = 0;
          $$('#svc-tasks-grid input[data-task]').forEach((cb) => {
            const lbl = cb.closest('label')?.querySelector('span')?.textContent || '';
            const lWords = norm(lbl);
            let overlap = 0;
            for (const aw of aiWords) {
              if (lWords.some((lw) => aw === lw || aw.startsWith(lw.slice(0, 4)) || lw.startsWith(aw.slice(0, 4)))) overlap++;
            }
            if (overlap >= Math.min(2, aiWords.length) && overlap > bestScore) { bestScore = overlap; bestKey = cb.dataset.task; }
          });
          return bestKey;
        }

        // Wire add buttons — tick matching preset or add as custom
        resultEl.querySelectorAll('.ai-add-task').forEach((btn) => {
          btn.addEventListener('click', () => {
            const presetKey = matchAiToPreset(btn.dataset.aiTask);
            if (presetKey) {
              const cb = $('#svc-tasks-grid input[data-task="' + presetKey + '"]');
              if (cb && !cb.checked) {
                cb.checked = true;
                const row = cb.closest('label');
                if (row) {
                  row.classList.add('ring-2', 'ring-indigo-400');
                  setTimeout(() => row.classList.remove('ring-2', 'ring-indigo-400'), 2000);
                  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            } else {
              addSvcCustomRow(btn.dataset.aiTask);
            }
            btn.textContent = '✓';
            btn.disabled = true;
            btn.className = btn.className.replace('bg-indigo-600 hover:bg-indigo-700', 'bg-emerald-600');
          });
        });
      } catch (e) {
        resultEl.innerHTML = '<p class="text-sm text-red-400 py-2">Σφάλμα σύνδεσης με AI.</p>';
      } finally {
        btn.disabled = false;
        btn.innerHTML = `${icon('sparkles','w-3 h-3')} Ανάλυση οχήματος`;
        refreshIcons();
      }
    });

    // Custom tasks
    function addSvcCustomRow(value = '') {
      const container = $('#svc-custom-tasks');
      const div = document.createElement('div');
      div.className = 'flex gap-2 items-center svc-custom-row';
      const uid = `svc-ct-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      div.innerHTML = `
        <input id="${uid}" type="text" data-vi="1" class="svc-custom-input flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" value="${U.escape(value)}" placeholder="Περιγραφή εργασίας…" />
        ${micBtn(uid)}
        <button type="button" class="svc-remove-custom p-2 text-red-400 hover:text-red-600 flex-shrink-0">${icon('x','w-4 h-4')}</button>
      `;
      div.querySelector('.svc-remove-custom').addEventListener('click', () => div.remove());
      container.appendChild(div);
      if (!value) div.querySelector('input').focus();
      refreshIcons();
      initVoiceButtons();
    }

    // Pre-populate custom tasks from saved checklist (custom: prefix)
    (s.checklist || []).filter((k) => k.startsWith('custom:')).forEach((k) => addSvcCustomRow(k.slice(7)));

    $('#svc-add-custom').addEventListener('click', () => addSvcCustomRow());

    $('#service-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = formData(e.target);
      const standardTasks = Array.from($('#svc-tasks-grid').querySelectorAll('input[type=checkbox]:checked')).map((cb) => cb.dataset.task);
      const customTasks = Array.from($$('.svc-custom-input')).map((inp) => inp.value.trim()).filter(Boolean).map((v) => 'custom:' + v);
      data.checklist = [...standardTasks, ...customTasks];
      if (data.mileage) data.mileage = Number(data.mileage);
      if (data.nextServiceMileage) data.nextServiceMileage = Number(data.nextServiceMileage);
      if (id) data.id = id;
      // auto compute nextServiceDate if blank
      if (!data.nextServiceDate && data.date) {
        const nd = U.addMonths(data.date, state.settings.intervalMonths);
        data.nextServiceDate = nd.toISOString().slice(0, 10);
      }
      const saved = await DB.add('services', data);

      // update vehicle mileage if higher
      if (data.mileage) {
        const veh = vehicleById(data.vehicleId);
        if (veh && (!veh.mileage || Number(veh.mileage) < Number(data.mileage))) {
          veh.mileage = Number(data.mileage);
          await DB.add('vehicles', veh);
        }
      }

      // Auto-create job order from service tasks
      if (data.checklist && data.checklist.length) {
        const veh = vehicleById(data.vehicleId);
        const joData = {
          vehicleId: data.vehicleId,
          customerId: veh?.customerId || null,
          tasks: data.checklist,
          notes: data.description || '',
          status: 'pending',
          completedTasks: {},
          serviceId: saved.id,
          createdAt: new Date().toISOString(),
        };
        const savedJo = await DB.add('job_orders', joData);
        await loadAll();
        U.toast('Εντολή εργασίας δημιουργήθηκε');
        go('/job-orders/' + savedJo.id + '/work');
      } else {
        U.toast(t('saved'));
        go('/services/' + saved.id);
      }
    });
  }

  // =========================================================
  //  REMINDERS
  // =========================================================
  async function renderReminders() {
    const all = state.vehicles
      .map((v) => ({ v, ...U.reminderStatus(v, servicesForVehicle(v.id), state.settings) }))
      .filter((r) => r.status === 'upcoming' || r.status === 'overdue')
      .sort((a, b) => (a.days || 999) - (b.days || 999));
    const overdue = all.filter((r) => r.status === 'overdue');
    const upcoming = all.filter((r) => r.status === 'upcoming');

    // KTEO / emissions upcoming (show if ≤60 days or expired)
    const kteoItems = state.vehicles
      .map((v) => ({ v, st: kteoStatus(v) }))
      .filter((x) => x.st && x.st.daysLeft <= 60)
      .sort((a, b) => a.st.daysLeft - b.st.daysLeft);
    const emissionsItems = state.vehicles
      .map((v) => ({ v, st: emissionsStatus(v) }))
      .filter((x) => x.st && x.st.daysLeft <= 60)
      .sort((a, b) => a.st.daysLeft - b.st.daysLeft);

    const anyItems = all.length || kteoItems.length || emissionsItems.length;

    $('#view').innerHTML = `
      ${pageHeader(t('reminders'), { back: false })}
      <div class="max-w-5xl mx-auto p-4 pb-24 sm:pb-4">
        ${!anyItems ? emptyState('bell-off', t('no_reminders'), '', '') : ''}
        ${overdue.length ? `
          <div class="mb-6">
            <h2 class="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">${icon('alert-circle','w-4 h-4')} ${t('reminders_overdue')} (${overdue.length})</h2>
            <div class="space-y-2">${overdue.map(reminderCard).join('')}</div>
          </div>
        ` : ''}
        ${upcoming.length ? `
          <div class="mb-6">
            <h2 class="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">${icon('clock','w-4 h-4')} ${t('reminders_upcoming')} (${upcoming.length})</h2>
            <div class="space-y-2">${upcoming.map(reminderCard).join('')}</div>
          </div>
        ` : ''}
        ${kteoItems.length ? `
          <div class="mb-6">
            <h2 class="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">${icon('shield-check','w-4 h-4')} ΚΤΕΟ (${kteoItems.length})</h2>
            <div class="space-y-2">${kteoItems.map((x) => kteoReminderCard(x.v, x.st, 'kteo')).join('')}</div>
          </div>
        ` : ''}
        ${emissionsItems.length ? `
          <div class="mb-6">
            <h2 class="text-sm font-semibold text-cyan-600 dark:text-cyan-400 mb-2 flex items-center gap-1">${icon('wind','w-4 h-4')} Κάρτα Καυσαερίων (${emissionsItems.length})</h2>
            <div class="space-y-2">${emissionsItems.map((x) => kteoReminderCard(x.v, x.st, 'emissions')).join('')}</div>
          </div>
        ` : ''}
      </div>
    `;

    // Wire up service reminder buttons
    $$('[data-reminder]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const vid = btn.dataset.reminder;
        const v = vehicleById(vid);
        const c = customerById(v.customerId);
        openReminderDialog(v, c);
      });
    });

    // Wire up kteo/emissions send buttons
    $$('[data-kteo-send]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const vid = btn.dataset.kteoSend;
        const kind = btn.dataset.kteoKind;
        const v = vehicleById(vid);
        const c = customerById(v.customerId);
        openKteoReminderDialog(v, c, kind);
      });
    });
  }

  function kteoReminderCard(v, st, kind) {
    const c = customerById(v.customerId);
    const isCritical = st.status === 'critical' || st.status === 'expired';
    const label = kind === 'kteo' ? 'ΚΤΕΟ' : 'Κάρτα Καυσαερίων';
    const iconName = kind === 'kteo' ? 'shield-check' : 'wind';
    const colorCls = isCritical
      ? 'border-red-200 dark:border-red-900/50'
      : 'border-amber-200 dark:border-amber-900/50';
    const iconBg = isCritical
      ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300'
      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300';
    const dayTxt = st.daysLeft < 0 ? `Ληγμένο (${-st.daysLeft}μ.)` : st.daysLeft === 0 ? 'Λήγει σήμερα!' : `${st.daysLeft} ημέρες`;
    const dayColor = isCritical ? 'text-red-600 dark:text-red-300' : 'text-amber-600 dark:text-amber-300';
    const kteoMsg = buildKteoMsg(v, c, kind);
    return `
      <div class="bg-white dark:bg-slate-800 rounded-xl border ${colorCls} p-3">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}">
            ${icon(iconName,'w-5 h-5')}
          </div>
          <div class="flex-1 min-w-0">
            <a href="#/vehicles/${v.id}" class="font-medium truncate block">${U.escape(vehicleLabel(v))}</a>
            <div class="text-xs text-slate-500 dark:text-slate-400 truncate">${U.escape(c?.name || '—')} • ${c?.phone ? U.escape(c.phone) : ''}</div>
          </div>
          <div class="text-xs font-medium text-right ${dayColor}">
            ${dayTxt}
            <div class="text-slate-400 font-normal">${label} ${fmtMonth(st.month)}</div>
          </div>
        </div>
        ${c?.phone ? `
          <div class="grid grid-cols-3 gap-2">
            <button data-kteo-send="${v.id}" data-kteo-kind="${kind}" class="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('send','w-4 h-4')} Αποστολή</button>
            <a target="_blank" href="${U.whatsappLink(c.phone, kteoMsg)}" class="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-circle','w-4 h-4')} WhatsApp</a>
            <a href="${U.smsLink(c.phone, kteoMsg)}" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-square','w-4 h-4')} SMS</a>
          </div>
        ` : `<div class="text-xs italic text-slate-400 pt-1">Χωρίς αριθμό τηλεφώνου</div>`}
      </div>
    `;
  }

  function buildKteoMsg(v, c, kind) {
    const s = state.settings;
    const vLabel = [v.brand, v.model].filter(Boolean).join(' ') + (v.plate ? ` (${v.plate.toUpperCase()})` : '');
    const name = c?.name || 'Αγαπητέ πελάτη';
    if (kind === 'kteo') {
      return `Αγαπητέ/ή ${name},\n\nΣας ενημερώνουμε ότι πλησιάζει η ημερομηνία ΚΤΕΟ για το ${vLabel}.\n\nΣυστήνουμε έλεγχο του οχήματος πριν την επίσκεψη στο ΚΤΕΟ για να εξασφαλίσετε επιτυχή διέλευση.\n\nΚαλέστε μας για ραντεβού.\n\n${[s.workshopName, s.workshopPhone].filter(Boolean).join('\n')}`.trim();
    }
    return `Αγαπητέ/ή ${name},\n\nΣας ενημερώνουμε ότι λήγει η κάρτα καυσαερίων για το ${vLabel}.\n\nΗ κάρτα καυσαερίων πρέπει να ανανεωθεί. Επικοινωνήστε μαζί μας.\n\n${[s.workshopName, s.workshopPhone].filter(Boolean).join('\n')}`.trim();
  }

  function openKteoReminderDialog(v, c, kind) {
    const msg = buildKteoMsg(v, c, kind);
    const label = kind === 'kteo' ? 'ΚΤΕΟ' : 'Κάρτα Καυσαερίων';
    openDialog(`Υπενθύμιση ${label}`, `
      <div class="space-y-3">
        <textarea id="kteo-msg-text" rows="7" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">${U.escape(msg)}</textarea>
        ${c?.phone ? `
        <div class="grid grid-cols-3 gap-2">
          <button id="kteo-send-wa" class="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-circle','w-4 h-4')} WhatsApp</button>
          <button id="kteo-send-sms" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-square','w-4 h-4')} SMS</button>
          <button id="kteo-send-em" class="bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('mail','w-4 h-4')} Email</button>
        </div>` : `<div class="text-xs italic text-slate-400">Χωρίς αριθμό τηλεφώνου</div>`}
      </div>
    `);
    setTimeout(() => {
      $('#kteo-send-wa')?.addEventListener('click', () => { window.open(U.whatsappLink(c.phone, $('#kteo-msg-text').value), '_blank'); });
      $('#kteo-send-sms')?.addEventListener('click', () => { window.location.href = U.smsLink(c.phone, $('#kteo-msg-text').value); });
      $('#kteo-send-em')?.addEventListener('click', () => {
        if (!c?.email) { U.toast('Δεν υπάρχει email', 'error'); return; }
        window.location.href = U.mailtoLink(c.email, `Υπενθύμιση ${label}`, $('#kteo-msg-text').value);
      });
    }, 50);
  }

  function reminderCard(r) {
    const c = customerById(r.v.customerId);
    const isOverdue = r.status === 'overdue';
    return `
      <div class="bg-white dark:bg-slate-800 rounded-xl border ${isOverdue?'border-red-200 dark:border-red-900/50':'border-amber-200 dark:border-amber-900/50'} p-3">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center ${isOverdue?'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300':'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300'}">
            ${icon(vehicleIcon(r.v.type),'w-5 h-5')}
          </div>
          <div class="flex-1 min-w-0">
            <a href="#/vehicles/${r.v.id}" class="font-medium truncate block">${U.escape(vehicleLabel(r.v))}</a>
            <div class="text-xs text-slate-500 dark:text-slate-400 truncate">${U.escape(c?.name || '—')} • ${c?.phone ? U.escape(c.phone) : ''}</div>
          </div>
          <div class="text-xs font-medium text-right ${isOverdue?'text-red-600 dark:text-red-300':'text-amber-600 dark:text-amber-300'}">
            ${isOverdue ? t('overdue_by',{n:-r.days}) : t('days_left',{n:r.days})}
            <div class="text-slate-400 font-normal">${r.nextDate ? U.fmtDate(r.nextDate) : ''}</div>
          </div>
        </div>
        ${c?.phone ? `
          <div class="grid grid-cols-3 gap-2">
            <button data-reminder="${r.v.id}" class="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('send','w-4 h-4')} ${t('send_reminder')}</button>
            <a target="_blank" href="${U.whatsappLink(c.phone, t('reminder_message_default', { customer: c.name, brand: r.v.brand||'', model: r.v.model||'', plate: r.v.plate||'' }))}" class="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-circle','w-4 h-4')} WhatsApp</a>
            <a href="${U.smsLink(c.phone, t('reminder_message_default', { customer: c.name, brand: r.v.brand||'', model: r.v.model||'', plate: r.v.plate||'' }))}" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-square','w-4 h-4')} SMS</a>
          </div>
        ` : `<div class="text-xs italic text-slate-400 pt-1">${t('customer_phone')}: —</div>`}
      </div>
    `;
  }

  function openReminderDialog(v, c) {
    if (!c) {
      const msg = t('reminder_message_default', { customer: 'πελάτη', brand: v.brand||'', model: v.model||'', plate: v.plate||'' });
      openDialog(t('send_reminder'), `
        <div class="space-y-3">
          <div class="px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
            ${icon('info','w-4 h-4 flex-shrink-0 mt-0.5')}
            <span>Δεν υπάρχει συνδεδεμένος πελάτης. <a href="#/vehicles/${v.id}/edit" class="underline font-medium">Προσθέστε πελάτη</a> για αποστολή WhatsApp/SMS.</span>
          </div>
          <textarea id="msg-text" rows="5" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">${U.escape(msg)}</textarea>
          <button id="send-copy" class="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('share-2','w-4 h-4')} Κοινοποίηση / Αντιγραφή</button>
        </div>
      `);
      setTimeout(() => {
        $('#send-copy').addEventListener('click', async () => {
          await U.share(vehicleLabel(v), $('#msg-text').value);
        });
      }, 50);
      return;
    }
    const msg = t('reminder_message_default', { customer: c.name, brand: v.brand||'', model: v.model||'', plate: v.plate||'' });
    openDialog(t('send_reminder'), `
      <div class="space-y-3">
        <textarea id="msg-text" rows="5" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">${U.escape(msg)}</textarea>
        <div class="grid grid-cols-3 gap-2">
          <button id="send-wa" class="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-circle','w-4 h-4')} WhatsApp</button>
          <button id="send-sms" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-square','w-4 h-4')} SMS</button>
          <button id="send-em" class="bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('mail','w-4 h-4')} Email</button>
        </div>
      </div>
    `);
    setTimeout(() => {
      $('#send-wa').addEventListener('click', () => {
        window.open(U.whatsappLink(c.phone, $('#msg-text').value), '_blank');
      });
      $('#send-sms').addEventListener('click', () => {
        window.location.href = U.smsLink(c.phone, $('#msg-text').value);
      });
      $('#send-em').addEventListener('click', () => {
        if (!c.email) { U.toast(t('error_generic'), 'error'); return; }
        window.location.href = U.mailtoLink(c.email, t('send_reminder'), $('#msg-text').value);
      });
    }, 50);
  }

  function openShareServiceDialog(s, v, c) {
    const lines = [];
    lines.push(`${state.settings.workshopName || t('app_name')}`);
    lines.push(`${t('service')} - ${U.fmtDate(s.date)}`);
    lines.push(`${v ? vehicleLabel(v) : ''}`);
    if (s.type) lines.push(`${t('service_type')}: ${s.type}`);
    if (s.description) lines.push(`${t('service_description')}: ${s.description}`);
    if (s.nextServiceDate) lines.push(`${t('next_service_due')}: ${U.fmtDate(s.nextServiceDate)}`);
    const msg = lines.join('\n');

    openDialog(t('send_to_customer'), `
      <div class="space-y-3">
        <textarea id="msg-text" rows="8" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">${U.escape(msg)}</textarea>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          ${c?.phone ? `
            <button id="send-wa" class="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-circle','w-4 h-4')} WhatsApp</button>
            <button id="send-sms" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-square','w-4 h-4')} SMS</button>
          ` : ''}
          ${c?.email ? `<button id="send-em" class="bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('mail','w-4 h-4')} Email</button>` : ''}
          <button id="send-copy" class="bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('copy','w-4 h-4')} ${t('copy')}</button>
        </div>
      </div>
    `);
    setTimeout(() => {
      if (c?.phone) {
        $('#send-wa').addEventListener('click', () => window.open(U.whatsappLink(c.phone, $('#msg-text').value), '_blank'));
        $('#send-sms')?.addEventListener('click', () => { window.location.href = U.smsLink(c.phone, $('#msg-text').value); });
      }
      if (c?.email) $('#send-em').addEventListener('click', () => { window.location.href = U.mailtoLink(c.email, t('service'), $('#msg-text').value); });
      $('#send-copy').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText($('#msg-text').value); U.toast(t('copied')); } catch (e) {}
      });
    }, 50);
  }

  function openShareHistoryDialog(v, c, services) {
    const lines = [];
    lines.push(`${state.settings.workshopName || t('app_name')}`);
    lines.push(`${t('vehicle_history')} - ${vehicleLabel(v)}`);
    lines.push('');
    services.forEach((s) => {
      lines.push(`• ${U.fmtDate(s.date)} - ${s.mileage ? s.mileage + 'km' : ''}`);
      if (s.description) lines.push(`  ${s.description.split('\n')[0]}`);
    });
    const msg = lines.join('\n');
    openDialog(t('share') + ' ' + t('vehicle_history'), `
      <div class="space-y-3">
        <textarea id="msg-text" rows="10" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">${U.escape(msg)}</textarea>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          ${c?.phone ? `
            <button id="send-wa" class="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-circle','w-4 h-4')} WhatsApp</button>
            <button id="send-sms" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-square','w-4 h-4')} SMS</button>
          ` : ''}
          <button id="send-copy" class="bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('copy','w-4 h-4')} ${t('copy')}</button>
        </div>
      </div>
    `);
    setTimeout(() => {
      if (c?.phone) {
        $('#send-wa').addEventListener('click', () => window.open(U.whatsappLink(c.phone, $('#msg-text').value), '_blank'));
        $('#send-sms')?.addEventListener('click', () => { window.location.href = U.smsLink(c.phone, $('#msg-text').value); });
      }
      $('#send-copy').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText($('#msg-text').value); U.toast(t('copied')); } catch (e) {}
      });
    }, 50);
  }

  // =========================================================
  //  AI SCAN
  // =========================================================
  async function renderAIScan() {
    // photos[0]=εξώφυλλο, photos[1]=στοιχεία οχήματος, photos[2]=ονομαστικά, photos[3]=odometer
    const photos = [null, null, null, null];

    function photoSlot(idx, label, borderColor, bgColor, btnColor, btnHover) {
      return `
        <div class="border-2 border-dashed ${borderColor} rounded-xl p-2 flex flex-col items-center gap-1.5 min-h-[130px] justify-center ${bgColor}">
          <div id="prev${idx}" class="hidden w-full"><img id="img${idx}" class="rounded-lg w-full object-cover max-h-20" /></div>
          <div class="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight">${label}</div>
          <label id="lbl${idx}" class="${btnColor} ${btnHover} text-white px-2.5 py-1.5 rounded-lg cursor-pointer inline-flex items-center gap-1 text-xs font-medium">
            ${icon('camera','w-3.5 h-3.5')} Φωτό
            <input type="file" id="file${idx}" accept="image/*" capture="environment" class="hidden" />
          </label>
        </div>`;
    }

    $('#view').innerHTML = `
      ${pageHeader(t('ai_scan_title'))}
      <div class="max-w-2xl mx-auto p-4 pb-24 sm:pb-4 space-y-4">

        <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900/50 rounded-xl p-3 text-sm text-purple-800 dark:text-purple-200">
          ${icon('info','w-4 h-4 inline mr-1')} Τράβηξε <strong>3 φωτογραφίες</strong> της άδειας κυκλοφορίας — εξώφυλλο, σελίδα στοιχείων οχήματος και σελίδα ονομαστικών στοιχείων.
        </div>

        <!-- 3 registration page photos -->
        <div id="photo-sections" class="space-y-4">
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <div class="flex items-center gap-2 text-sm font-semibold">
              ${icon('book-open','w-4 h-4 text-purple-500')}
              <span>Άδεια κυκλοφορίας — 3 σελίδες</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              ${photoSlot(0,'Εξώφυλλο (πινακίδα)','border-purple-300 dark:border-purple-700','bg-purple-50/50 dark:bg-purple-900/10','bg-purple-500','hover:bg-purple-600')}
              ${photoSlot(1,'Ονομαστικά στοιχεία','border-indigo-200 dark:border-indigo-800','bg-indigo-50/30 dark:bg-indigo-900/10','bg-indigo-500','hover:bg-indigo-600')}
              ${photoSlot(2,'Στοιχεία οχήματος','border-purple-200 dark:border-purple-800','','bg-purple-400','hover:bg-purple-500')}
            </div>
            <p class="text-xs text-slate-400 dark:text-slate-500 text-center">Μπορείς να τραβήξεις μόνο όσες σελίδες χρειάζεσαι</p>
          </div>

          <!-- Odometer photo (optional) -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <div class="flex items-center gap-2 text-sm font-semibold">
              ${icon('gauge','w-4 h-4 text-amber-500')}
              <span>${t('ai_scan_odometer')}</span>
              <span class="text-xs font-normal text-slate-400">(${t('optional')})</span>
            </div>
            <div class="border-2 border-dashed border-amber-200 dark:border-amber-800/50 rounded-xl p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center bg-amber-50/40 dark:bg-amber-900/10">
              <div id="prev3" class="hidden w-full"><img id="img3" class="rounded-lg w-full object-cover max-h-20 mx-auto" style="max-width:180px" /></div>
              <div class="text-xs text-slate-500 dark:text-slate-400 text-center">${t('ai_scan_odometer_tip')}</div>
              <label id="lbl3" class="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium">
                ${icon('camera','w-3.5 h-3.5')} ${t('take_photo')}
                <input type="file" id="file3" accept="image/*" capture="environment" class="hidden" />
              </label>
            </div>
          </div>

          <!-- Analyze button — visible after at least 1 license photo -->
          <button id="btn-analyze" class="hidden w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 text-base">
            ${icon('sparkles','w-5 h-5')} ${t('ai_scan_analyze')}
          </button>
        </div>

        <div id="scan-result" class="hidden"></div>
      </div>
    `;
    refreshIcons();

    function updateAnalyzeBtn() {
      const hasLicense = photos[0] || photos[1] || photos[2];
      $('#btn-analyze').classList.toggle('hidden', !hasLicense);
    }

    const retakeCls = 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-lg cursor-pointer inline-flex items-center gap-1 text-xs font-medium';

    async function handleFile(idx, e) {
      const file = e.target.files[0];
      if (!file) return;
      const dataUrl = await U.readFileAsDataURL(file);
      const compressed = await U.compressImage(dataUrl, 1800, 0.88);
      photos[idx] = compressed;
      $(`#img${idx}`).src = compressed;
      $(`#prev${idx}`).classList.remove('hidden');
      $(`#lbl${idx}`).className = retakeCls;
      $(`#lbl${idx}`).innerHTML = `${icon('refresh-cw','w-3.5 h-3.5')} Ξανά<input type="file" id="file${idx}" accept="image/*" capture="environment" class="hidden" />`;
      $(`#file${idx}`).addEventListener('change', (ev) => handleFile(idx, ev));
      refreshIcons();
      updateAnalyzeBtn();
    }

    for (let i = 0; i <= 3; i++) {
      $(`#file${i}`).addEventListener('change', (e) => handleFile(i, e));
    }

    // Show photo section again — called from retake buttons in results
    function showPhotoSection() {
      $('#scan-result').classList.add('hidden');
      $('#photo-sections').classList.remove('hidden');
      $('#view').scrollTo({ top: 0, behavior: 'smooth' });
    }
    window._scanRetake = showPhotoSection;

    $('#btn-analyze').addEventListener('click', async () => {
      const regPhotos = [photos[0], photos[1], photos[2]].filter(Boolean);
      if (!regPhotos.length) return;

      const btn = $('#btn-analyze');
      btn.disabled = true;
      btn.innerHTML = `<span class="inline-block animate-spin mr-2">${icon('loader-2','w-5 h-5 inline')}</span>${t('ai_scan_processing')}`;
      refreshIcons();

      const data = await U.aiExtractRegistration(regPhotos, photos[3] || null);

      btn.disabled = false;
      btn.innerHTML = `${icon('sparkles','w-5 h-5')} ${t('ai_scan_analyze')}`;
      refreshIcons();

      // Hide photo section, show result
      $('#photo-sections').classList.add('hidden');
      const result = $('#scan-result');
      result.classList.remove('hidden');

      if (!data) {
        result.innerHTML = `
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 space-y-3">
            <p class="text-sm text-red-600 dark:text-red-400">${t('error_generic')}</p>
            <button onclick="window._scanRetake()" class="w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
              ${icon('camera','w-4 h-4')} Ξανά φωτογράφηση
            </button>
          </div>`;
        refreshIcons();
        return;
      }

      const ownerHtml = data.ownerName ? `
        <div class="col-span-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 flex items-center gap-2">
          ${icon('user','w-4 h-4 text-indigo-500 flex-shrink-0')}
          <div>
            <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">${t('ai_scan_owner_label')}</div>
            <div class="text-sm font-bold text-indigo-900 dark:text-indigo-100">${U.escape(data.ownerName)}</div>
          </div>
        </div>` : '';

      const mileageHtml = data.mileage ? `${kv(t('ai_scan_mileage_found'), Number(data.mileage).toLocaleString() + ' km')}` : '';

      const retakeBtn = `
        <button onclick="window._scanRetake()" class="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-sm">
          ${icon('camera','w-4 h-4')} ${t('ai_scan_retake')}
        </button>`;

      const ownerQuestionHtml = data.ownerName ? `
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 space-y-3">
          <p class="text-sm font-medium text-blue-900 dark:text-blue-100">${t('ai_scan_owner_question')}</p>
          <p class="text-xs text-blue-700 dark:text-blue-300 font-medium">${U.escape(data.ownerName)}</p>
          <div class="flex gap-2">
            <button id="apply-with-owner" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5">
              ${icon('user-check','w-4 h-4')} ${t('ai_scan_owner_same')}
            </button>
            <button id="apply-vehicle-only" class="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5">
              ${icon('user-x','w-4 h-4')} ${t('ai_scan_owner_diff')}
            </button>
          </div>
        </div>
        <div class="flex gap-2">${retakeBtn}</div>` : `
        <div class="flex gap-2">
          <button id="apply-scan" class="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2.5 rounded-lg">${t('ai_scan_apply')}</button>
          ${retakeBtn}
        </div>`;

      // Mutable copy so edits persist between re-renders
      let scanData = { ...data };

      // Plate mismatch check. Consume-once, read here (not inside renderResult, which reruns
      // on every edit) so a stale "not found" search from an earlier, abandoned flow can't
      // leak into a later, unrelated scan and trigger a false mismatch warning.
      const expectedPlate = sessionStorage.getItem('scan_expected_plate') || '';
      sessionStorage.removeItem('scan_expected_plate');

      function applyAndGo(includeOwner) {
        const payload = { ...scanData, regPhoto: photos[0] };
        sessionStorage.setItem('ai_scan_result', JSON.stringify(payload));
        if (includeOwner && scanData.ownerName) {
          sessionStorage.setItem('ai_scan_customer_name', scanData.ownerName);
        } else {
          sessionStorage.removeItem('ai_scan_customer_name');
        }
        go('/vehicles/new');
      }

      function inp(name, value, type = 'text', cls = '') {
        const v = value != null ? U.escape(String(value)) : '';
        return `<input name="${name}" type="${type}" value="${v}" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm ${cls}" />`;
      }
      function sel(name, options, current) {
        return `<select name="${name}" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
          ${options.map(([v,l]) => `<option value="${v}"${current===v?' selected':''}>${l}</option>`).join('')}
        </select>`;
      }

      function renderResult() {
        const d = scanData;

        const scannedNorm = normPlate(d.plate || '');
        const plateMismatch = expectedPlate && scannedNorm && scannedNorm !== expectedPlate;

        const ownerBlock = d.ownerName ? `
          <div class="col-span-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 flex items-center gap-2">
            ${icon('user','w-4 h-4 text-indigo-500 flex-shrink-0')}
            <div>
              <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">${t('ai_scan_owner_label')}</div>
              <div class="text-sm font-bold text-indigo-900 dark:text-indigo-100">${U.escape(d.ownerName)}</div>
            </div>
          </div>` : '';

        result.innerHTML = `
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold flex items-center gap-2">${icon('car','w-4 h-4 text-blue-600')} Αποτελέσματα σάρωσης</h3>
              <button id="btn-edit-scan" class="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                ${icon('pencil','w-3.5 h-3.5')} Επεξεργασία
              </button>
            </div>
            ${plateMismatch ? `
              <div class="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                ${icon('alert-triangle','w-5 h-5 text-red-500 flex-shrink-0 mt-0.5')}
                <div>
                  <div class="text-sm font-semibold text-red-700 dark:text-red-400">Ασυμφωνία πινακίδας</div>
                  <div class="text-xs text-red-600 dark:text-red-300 mt-0.5">Αναζήτησες <b>${U.escape(expectedPlate)}</b> αλλά η άδεια έχει <b>${U.escape(scannedNorm || '—')}</b>. Επαλήθευσε ότι φωτογράφισες τη σωστή άδεια.</div>
                </div>
              </div>` : ''}
            <div class="grid grid-cols-2 gap-3 text-sm">
              ${ownerBlock}
              ${kv('Αριθμός Κυκλοφορίας', d.plate)}
              ${kv('Αριθμός Πλαισίου (VIN)', d.vin, true)}
              ${kv(t('vehicle_brand'), d.brand)}
              ${kv(t('vehicle_model'), d.model)}
              ${kv(t('vehicle_year'), d.year)}
              ${kv('Κυβισμός', d.engine ? d.engine + ' cc' : '')}
              ${kv('Καύσιμο', d.fuel ? t('fuel_' + d.fuel) : '')}
              ${kv('Χρώμα', d.color)}
              ${d.mileage ? kv('Χιλιόμετρα', Number(d.mileage).toLocaleString() + ' km') : ''}
            </div>
            ${d.ownerName ? `
              <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 space-y-3">
                <p class="text-sm font-medium text-blue-900 dark:text-blue-100">${t('ai_scan_owner_question')}</p>
                <p class="text-xs text-blue-700 dark:text-blue-300 font-medium">${U.escape(d.ownerName)}</p>
                <div class="flex gap-2">
                  <button id="apply-with-owner" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5">
                    ${icon('user-check','w-4 h-4')} ${t('ai_scan_owner_same')}
                  </button>
                  <button id="apply-vehicle-only" class="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5">
                    ${icon('user-x','w-4 h-4')} ${t('ai_scan_owner_diff')}
                  </button>
                </div>
              </div>` : `
              <div class="flex gap-2">
                <button id="apply-scan" class="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2.5 rounded-lg">${t('ai_scan_apply')}</button>
              </div>`}
            <button onclick="window._scanRetake()" class="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-medium py-2 rounded-lg flex items-center justify-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              ${icon('camera','w-4 h-4')} ${t('ai_scan_retake')}
            </button>
          </div>`;
        refreshIcons();
        $('#btn-edit-scan')?.addEventListener('click', renderEditForm);
        $('#apply-with-owner')?.addEventListener('click', () => applyAndGo(true));
        $('#apply-vehicle-only')?.addEventListener('click', () => applyAndGo(false));
        $('#apply-scan')?.addEventListener('click', () => applyAndGo(false));
      }

      function renderEditForm() {
        const d = scanData;
        const fuelOpts = [['','—'],['gasoline','Βενζίνη'],['diesel','Diesel'],['lpg','Υγραέριο'],['hybrid','Υβριδικό'],['electric','Ηλεκτρικό']];
        const typeOpts = [['car','Αυτοκίνητο'],['moto','Μοτοσυκλέτα'],['truck','Φορτηγό'],['boat','Σκάφος']];

        result.innerHTML = `
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
            <h3 class="font-semibold flex items-center gap-2">${icon('pencil','w-4 h-4 text-blue-600')} Επεξεργασία στοιχείων</h3>
            <form id="scan-edit-form" class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">Αριθμός Κυκλοφορίας</label>
                  ${inp('plate', d.plate, 'text', 'font-bold tracking-widest')}
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">Τύπος οχήματος</label>
                  ${sel('type', typeOpts, d.type || 'car')}
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-500">Αριθμός Πλαισίου — VIN (17 χαρ.)</label>
                ${inp('vin', d.vin, 'text', 'font-mono tracking-wider uppercase')}
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">Μάρκα</label>
                  ${inp('brand', d.brand)}
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">Μοντέλο</label>
                  ${inp('model', d.model)}
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">Έτος</label>
                  ${inp('year', d.year, 'number')}
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">Κυβισμός (cc)</label>
                  ${inp('engine', d.engine, 'number')}
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">Καύσιμο</label>
                  ${sel('fuel', fuelOpts, d.fuel || '')}
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">Χρώμα</label>
                  ${inp('color', d.color)}
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-500">Κάτοχος (Όνομα Επώνυμο)</label>
                ${inp('ownerName', d.ownerName)}
              </div>
              <div class="flex gap-2 pt-1">
                <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5">
                  ${icon('check','w-4 h-4')} Αποθήκευση
                </button>
                <button type="button" id="cancel-edit" class="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-medium py-2.5 rounded-lg">
                  Άκυρο
                </button>
              </div>
            </form>
          </div>`;
        refreshIcons();

        $('#cancel-edit').addEventListener('click', renderResult);
        $('#scan-edit-form').addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          scanData = {
            ...scanData,
            plate:     (fd.get('plate') || '').toUpperCase().trim() || null,
            vin:       (fd.get('vin') || '').toUpperCase().trim() || null,
            brand:     fd.get('brand') || null,
            model:     fd.get('model') || null,
            year:      fd.get('year') ? parseInt(fd.get('year')) : null,
            engine:    fd.get('engine') ? parseInt(fd.get('engine')) : null,
            fuel:      fd.get('fuel') || null,
            color:     fd.get('color') || null,
            type:      fd.get('type') || 'car',
            ownerName: fd.get('ownerName') || null,
          };
          renderResult();
        });
      }

      renderResult();
    });
  }

  // =========================================================
  //  JOB ORDERS
  // =========================================================
  async function renderJobOrders() {
    const pending = state.jobOrders
      .filter((j) => j.status !== 'completed')
      .sort((a, b) => new Date(a.desiredDelivery || '9999') - new Date(b.desiredDelivery || '9999'));
    const completed = state.jobOrders
      .filter((j) => j.status === 'completed')
      .sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt))
      .slice(0, 15);

    $('#view').innerHTML = `
      ${pageHeader(t('job_orders'), {
        back: false,
        actions: `<a href="#/job-orders/new" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">${icon('plus','w-4 h-4')} ${t('add')}</a>`
      })}
      <div class="max-w-3xl mx-auto p-4 pb-24 sm:pb-4 space-y-4">
        ${!pending.length && !completed.length ? emptyState('clipboard-check', t('no_job_orders'), t('new_job_order'), '#/job-orders/new') : ''}
        ${pending.length ? `
          <div>
            <h2 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">${t('jo_active')}</h2>
            <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
              ${pending.map(joRow).join('')}
            </div>
          </div>
        ` : ''}
        ${completed.length ? `
          <div>
            <h2 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">${t('jo_completed_recent')}</h2>
            <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
              ${completed.map(joRow).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function joRow(jo) {
    const v = vehicleById(jo.vehicleId);
    const c = v ? customerById(v.customerId) : null;
    const taskCount = (jo.tasks || []).length;
    const doneCount = Object.values(jo.completedTasks || {}).filter(Boolean).length;
    const isLate = jo.status === 'in_progress' && jo.startedAt && jo.estimatedHours &&
      (Date.now() > new Date(jo.startedAt).getTime() + jo.estimatedHours * 3600000);
    const dotColor = jo.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
      : jo.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300'
      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300';
    return `
      <a href="#/job-orders/${jo.id}" class="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
        <div class="w-10 h-10 rounded-lg ${dotColor} flex items-center justify-center flex-shrink-0">
          ${icon('clipboard-check','w-5 h-5')}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">${U.escape(vehicleLabel(v))}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400 truncate">${U.escape(c?.name || '—')} · ${doneCount}/${taskCount} ${t('jo_tasks')}</div>
          ${jo.desiredDelivery ? `<div class="text-xs ${isLate ? 'text-red-500 font-medium' : 'text-slate-400'}">${icon('clock','w-3 h-3 inline mr-0.5')}${U.fmtDatetime(jo.desiredDelivery)}${isLate ? ' ⚠️' : ''}</div>` : ''}
        </div>
        ${joStatusBadge(jo.status)}
      </a>
    `;
  }

  async function renderJobOrderForm(id) {
    const jo = id ? jobOrderById(id) : {};
    if (id && !jo) { go('/job-orders'); return; }

    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    const prefVehicle = qs.get('vehicle');
    const prefService = qs.get('service');
    if (!id && prefVehicle && !jo.vehicleId) jo.vehicleId = prefVehicle;

    // Pre-populate tasks from linked service checklist
    if (!id && prefService && !(jo.tasks && jo.tasks.length)) {
      const linkedService = serviceById(prefService);
      if (linkedService && linkedService.checklist) jo.tasks = [...linkedService.checklist];
    }

    const vehicleOptions = state.vehicles
      .slice().sort((a, b) => (a.brand || '').localeCompare(b.brand || ''))
      .map((vv) => `<option value="${vv.id}" ${jo.vehicleId === vv.id ? 'selected' : ''}>${U.escape(vehicleLabel(vv))}</option>`).join('');

    const selectedTasks = new Set(jo.tasks || []);
    const customTasks = (jo.tasks || []).filter((k) => k.startsWith('custom:')).map((k) => k.slice(7));

    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(17, 0, 0, 0);
    const defaultDelivery = tomorrow.toISOString().slice(0, 16);

    $('#view').innerHTML = `
      ${pageHeader(id ? t('edit') + ' ' + t('job_order') : t('new_job_order'))}
      <div class="max-w-2xl mx-auto p-4 pb-28 sm:pb-8 space-y-5">

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h2 class="font-semibold flex items-center gap-2">${icon('car','w-4 h-4 text-blue-600')} ${t('vehicle')}</h2>
          <select id="jo-vehicle" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <option value="">— ${t('select_vehicle')} —</option>
            ${vehicleOptions}
          </select>
          <div class="flex gap-2">
            <a href="#/scan" class="flex-1 border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('scan-line','w-4 h-4')} ${t('qa_scan_doc')}</a>
            <a href="#/vehicles/new" class="flex-1 border border-blue-400 dark:border-blue-800 text-blue-700 dark:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('plus','w-4 h-4')} ${t('new_vehicle')}</a>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h2 class="font-semibold flex items-center gap-2">${icon('check-square','w-4 h-4 text-emerald-500')} ${t('jo_tasks')}</h2>
          <div id="tasks-grid">
            ${jo.vehicleId
              ? renderTasksForVehicle(vehicleById(jo.vehicleId)?.type, selectedTasks)
              : `<div class="flex flex-col items-center gap-2 py-6 text-slate-400">
                   ${icon('car','w-8 h-8')}
                   <p class="text-sm text-center">${t('tasks_select_vehicle_first')}</p>
                 </div>`
            }
          </div>
          <div class="border-t border-slate-100 dark:border-slate-700 pt-3">
            <label class="block text-sm font-medium mb-2">${t('task_custom')} <span class="text-xs text-slate-400">(${t('optional')})</span></label>
            <div id="custom-tasks-container">
              ${customTasks.map((ct) => `
                <div class="flex gap-2 mb-2 custom-task-row">
                  <input type="text" class="custom-task-input flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" value="${U.escape(ct)}" placeholder="${t('task_custom_placeholder')}" />
                  <button type="button" class="remove-custom p-2 text-red-400 hover:text-red-600">${icon('x','w-4 h-4')}</button>
                </div>
              `).join('')}
            </div>
            <button type="button" id="add-custom-task" class="text-sm text-blue-700 dark:text-blue-500 hover:underline flex items-center gap-1">${icon('plus','w-3 h-3')} ${t('jo_add_custom')}</button>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h2 class="font-semibold flex items-center gap-2">${icon('calendar','w-4 h-4 text-indigo-500')} ${t('jo_schedule')}</h2>
          <div>
            <label class="block text-sm font-medium mb-1">${t('jo_desired_delivery')}</label>
            <input type="datetime-local" id="jo-delivery" value="${jo.desiredDelivery ? jo.desiredDelivery.slice(0,16) : defaultDelivery}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">${t('jo_est_hours')}</label>
            <input type="number" id="jo-hours" min="0.5" max="24" step="0.5" value="${jo.estimatedHours || 2}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          ${mechanicSelect('jo-mechanic', jo.mechanic)}
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h2 class="font-semibold flex items-center gap-2 mb-3">${icon('message-square','w-4 h-4 text-slate-500')} ${t('notes')}</h2>
          <div class="flex gap-2 items-start">
            <textarea id="jo-notes" rows="2" placeholder="${t('jo_notes_placeholder')}" data-vi="1" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">${U.escape(jo.notes || '')}</textarea>
            ${micBtn('jo-notes')}
          </div>
        </div>

        <div class="flex gap-2">
          <button id="save-jo" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg">${t('save')}</button>
          <button type="button" onclick="history.back()" class="flex-1 bg-slate-200 dark:bg-slate-700 font-medium py-2.5 rounded-lg">${t('cancel')}</button>
        </div>
      </div>
    `;

    function addCustomRow(value) {
      const container = $('#custom-tasks-container');
      const div = document.createElement('div');
      div.className = 'flex gap-2 mb-2 custom-task-row';
      const uid = `ct-${Date.now()}`;
      div.innerHTML = `
        <input id="${uid}" type="text" data-vi="1" class="custom-task-input flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" value="${U.escape(value || '')}" placeholder="${t('task_custom_placeholder')}" />
        ${micBtn(uid)}
        <button type="button" class="remove-custom p-2 text-red-400 hover:text-red-600">${icon('x','w-4 h-4')}</button>
      `;
      div.querySelector('.remove-custom').addEventListener('click', () => div.remove());
      container.appendChild(div);
      if (!value) div.querySelector('input').focus();
      refreshIcons();
    }

    $$('.remove-custom').forEach((btn) => btn.addEventListener('click', () => btn.closest('.custom-task-row').remove()));
    $('#add-custom-task').addEventListener('click', () => addCustomRow(''));

    $('#jo-vehicle').addEventListener('change', () => {
      const vId = $('#jo-vehicle').value;
      const v = vehicleById(vId);
      const grid = $('#tasks-grid');
      if (v) {
        grid.innerHTML = renderTasksForVehicle(v.type, new Set());
        refreshIcons();
      } else {
        grid.innerHTML = `<div class="flex flex-col items-center gap-2 py-6 text-slate-400">
          ${icon('car','w-8 h-8')}
          <p class="text-sm text-center">${t('tasks_select_vehicle_first')}</p>
        </div>`;
        refreshIcons();
      }
    });

    $('#save-jo').addEventListener('click', async () => {
      const vehicleId = $('#jo-vehicle').value;
      if (!vehicleId) { U.toast(t('jo_select_vehicle'), 'error'); return; }

      const checkedTasks = $$('#tasks-grid input[type=checkbox]:checked').map((cb) => cb.dataset.task);
      const customInputs = $$('.custom-task-input').map((inp) => inp.value.trim()).filter(Boolean);
      const allTasks = [...checkedTasks, ...customInputs.map((c) => 'custom:' + c)];
      if (!allTasks.length) { U.toast(t('jo_select_tasks'), 'error'); return; }

      const v = vehicleById(vehicleId);
      const data = {
        vehicleId,
        customerId: v?.customerId || null,
        tasks: allTasks,
        desiredDelivery: $('#jo-delivery').value || null,
        estimatedHours: parseFloat($('#jo-hours').value) || 2,
        mechanic: ($('[name="jo-mechanic"]')?.value || '').trim() || null,
        notes: $('#jo-notes').value.trim(),
        status: jo.status || 'pending',
        completedTasks: jo.completedTasks || {},
        startedAt: jo.startedAt || null,
        completedAt: jo.completedAt || null,
      };
      if (id) data.id = id;

      const saved = await DB.add('job_orders', data);
      U.toast(t('saved'));
      go('/job-orders/' + saved.id);
    });
  }

  async function renderJobOrderDetail(id) {
    const jo = jobOrderById(id);
    if (!jo) { go('/job-orders'); return; }
    const v = vehicleById(jo.vehicleId);
    const c = v ? customerById(v.customerId) : null;
    const taskCount = (jo.tasks || []).length;
    const doneCount = Object.values(jo.completedTasks || {}).filter(Boolean).length;
    const progress = taskCount ? Math.round((doneCount / taskCount) * 100) : 0;

    $('#view').innerHTML = `
      ${pageHeader(t('job_order'), {
        actions: `
          ${jo.status !== 'completed' ? `<a href="#/job-orders/${id}/edit" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">${icon('edit-2','w-5 h-5')}</a>` : ''}
          <button id="del-jo" class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600">${icon('trash-2','w-5 h-5')}</button>
        `
      })}
      <div class="max-w-3xl mx-auto p-4 pb-28 sm:pb-8 space-y-4">

        <div class="flex items-center justify-between">
          ${joStatusBadge(jo.status)}
          <div class="text-xs text-slate-400">#${id.slice(-6)} · ${U.fmtDate(jo.createdAt)}</div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div class="grid grid-cols-2 gap-3 text-sm">
            ${kv(t('vehicle'), v ? `<a class="text-blue-700 dark:text-blue-500" href="#/vehicles/${v.id}">${U.escape(vehicleLabel(v))}</a>` : '—', true)}
            ${kv(t('vehicle_plate'), v?.plate)}
            ${kv(t('customer'), c ? `<a class="text-blue-700 dark:text-blue-500" href="#/customers/${c.id}">${U.escape(c.name)}</a>` : '—')}
            ${kv(t('customer_phone'), c?.phone ? `<a href="tel:${U.escape(c.phone)}" class="text-blue-700 dark:text-blue-500">${U.escape(c.phone)}</a>` : '—')}
            ${jo.mechanic ? kv(t('service_mechanic'), jo.mechanic) : ''}
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h2 class="font-semibold mb-3 text-sm">${t('jo_schedule')}</h2>
          <div class="grid grid-cols-2 gap-3 text-sm">
            ${kv(t('jo_desired_delivery'), jo.desiredDelivery ? U.fmtDatetime(jo.desiredDelivery) : '—')}
            ${kv(t('jo_est_hours'), jo.estimatedHours ? jo.estimatedHours + ' ώρες' : '—')}
            ${jo.startedAt ? kv(t('jo_started_at'), U.fmtDatetime(jo.startedAt)) : ''}
            ${jo.completedAt ? kv(t('jo_completed_at'), U.fmtDatetime(jo.completedAt)) : ''}
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div class="flex items-center justify-between mb-2">
            <h2 class="font-semibold text-sm">${t('jo_tasks')}</h2>
            <span class="text-xs text-slate-500">${doneCount}/${taskCount}</span>
          </div>
          <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-3">
            <div class="bg-blue-600 h-1.5 rounded-full" style="width:${progress}%"></div>
          </div>
          <div class="space-y-1.5">
            ${(jo.tasks || []).map((key) => `
              <div class="flex items-center gap-2 text-sm ${jo.completedTasks?.[key] ? 'text-slate-400' : ''}">
                ${icon(jo.completedTasks?.[key] ? 'check-circle' : 'circle','w-4 h-4 ' + (jo.completedTasks?.[key] ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'))}
                <span ${jo.completedTasks?.[key] ? 'class="line-through"' : ''}>${taskLabel(key)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        ${jo.notes ? `
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h2 class="font-semibold text-sm mb-2">${t('notes')}</h2>
            <p class="text-sm text-slate-600 dark:text-slate-300">${U.escape(jo.notes)}</p>
          </div>
        ` : ''}

        <div class="space-y-2 pt-1">
          ${jo.status === 'pending' ? `
            <button id="start-work" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2">${icon('play','w-5 h-5')} ${t('jo_start_work')}</button>
          ` : ''}
          ${jo.status === 'in_progress' ? `
            <a href="#/job-orders/${id}/work" class="block w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-xl text-center flex items-center justify-center gap-2">${icon('tool','w-5 h-5')} ${t('jo_continue_work')}</a>
          ` : ''}
          ${jo.status === 'completed' ? `
            <button id="export-pdf" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2">${icon('file-text','w-5 h-5')} ${t('jo_export_pdf')}</button>
          ` : ''}
          ${c?.phone ? `
            <a href="tel:${U.escape(c.phone)}" class="block w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium py-2.5 rounded-xl text-center flex items-center justify-center gap-2 text-sm">${icon('phone-call','w-4 h-4')} ${t('jo_call_customer')}</a>
          ` : ''}
        </div>
      </div>
    `;

    $('#del-jo').addEventListener('click', async () => {
      if (!confirm(t('confirm_delete'))) return;
      await DB.remove('job_orders', id);
      U.toast(t('deleted'));
      go('/job-orders');
    });

    const startBtn = $('#start-work');
    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        jo.status = 'in_progress';
        jo.startedAt = new Date().toISOString();
        await DB.add('job_orders', jo);
        U.toast(t('jo_work_started'));
        go('/job-orders/' + id + '/work');
      });
    }

    const pdfBtn = $('#export-pdf');
    if (pdfBtn) pdfBtn.addEventListener('click', () => jobOrderPdf(jo));
  }

  async function renderJobOrderWork(id) {
    await loadAll();
    let jo = jobOrderById(id);
    if (!jo) { go('/job-orders'); return; }
    const v = vehicleById(jo.vehicleId);
    const c = v ? customerById(v.customerId) : null;

    function buildHTML() {
      const taskCount = (jo.tasks || []).length;
      const doneCount = Object.values(jo.completedTasks || {}).filter(Boolean).length;
      const uncompletedCount = Object.keys(jo.uncompletedTasks || {}).length;
      const allDone = taskCount > 0 && (doneCount + uncompletedCount) === taskCount;
      const progress = taskCount ? Math.round((doneCount / taskCount) * 100) : 0;
      return `
        ${pageHeader(t('jo_work_view'), { back: true })}
        <div class="max-w-2xl mx-auto p-4 pb-28 sm:pb-8 space-y-4">

          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 rounded-xl p-3 flex items-center gap-3">
            ${icon('car','w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0')}
            <div class="min-w-0">
              <div class="font-medium text-sm truncate">${U.escape(vehicleLabel(v))}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">${U.escape(c?.name || '—')}${c?.phone ? ' · ' + U.escape(c.phone) : ''}</div>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between text-sm mb-1">
              <span class="font-medium">${t('jo_progress')}</span>
              <span id="progress-counter" class="text-slate-500">${doneCount}/${taskCount}</span>
            </div>
            <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div id="progress-bar" class="bg-emerald-500 h-2 rounded-full transition-all" style="width:${progress}%"></div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden" id="tasks-container">
            ${(jo.tasks || []).map((key, idx) => `<div class="border-b last:border-b-0 border-slate-100 dark:border-slate-700">
              <div class="flex items-center gap-3 p-3">
                <input type="checkbox" id="cb-${idx}" data-key="${key}" ${jo.completedTasks?.[key] ? 'checked' : ''} class="task-cb w-5 h-5 rounded accent-emerald-500 flex-shrink-0 cursor-pointer" />
                <label for="cb-${idx}" class="flex-1 text-sm cursor-pointer ${jo.completedTasks?.[key] ? 'line-through text-slate-400' : jo.uncompletedTasks?.[key] ? 'line-through text-red-400' : ''}">${taskLabel(key)}</label>
                ${jo.uncompletedTasks?.[key] ? `<span class="text-xs text-red-400 font-medium">⚠ Δεν εκτελέστηκε</span>` : `<button class="unable-btn text-xs border border-red-200 dark:border-red-900 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg flex-shrink-0 ${jo.completedTasks?.[key] ? 'hidden' : ''}" data-idx="${idx}" data-key="${key}">✕ Αδυναμία</button>`}
              </div>
              ${jo.uncompletedTasks?.[key] ? `<div class="px-3 pb-2 text-xs text-red-400 italic">${U.escape(jo.uncompletedTasks[key])}</div>` : `<div class="unable-note-area hidden px-3 pb-3 pt-0" id="unable-${idx}"><input type="text" placeholder="Αιτία αδυναμίας (προαιρετικό)…" class="unable-note-input w-full px-3 py-2 text-sm rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-slate-800" data-key="${key}" /></div>`}
            </div>`).join('')}
          </div>

          <!-- ===== Parts & Cost Panel ===== -->
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2 class="font-semibold text-sm flex items-center gap-2">${icon('package','w-4 h-4 text-slate-400')} Ανταλλακτικά & Κόστος</h2>
              <label class="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" id="show-cost-report" ${jo.showCostOnReport !== false ? 'checked' : ''} class="w-3.5 h-3.5 accent-blue-600" />
                <span class="text-xs text-slate-500 dark:text-slate-400">Εμφάνιση στην αναφορά</span>
              </label>
            </div>
            <div class="p-4 space-y-3">
              <div id="parts-list" class="space-y-2">
                ${(jo.workParts || []).length === 0
                  ? '<p class="text-xs text-slate-400 text-center py-1">Δεν έχουν προστεθεί ανταλλακτικά ακόμα</p>'
                  : (jo.workParts || []).map((p, i) => renderPartRow(p, i)).join('')}
              </div>
              <button id="add-part-btn" class="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-2.5 text-sm text-slate-500 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-1.5 transition-colors">
                ${icon('plus-circle','w-4 h-4')} Προσθήκη ανταλλακτικού
              </button>
              <div class="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <label class="text-sm font-medium whitespace-nowrap flex-shrink-0">Κόστος εργασίας</label>
                <div class="relative flex-1">
                  <input type="number" id="labor-cost-input" value="${jo.laborCost || ''}" placeholder="0.00" min="0" step="0.01"
                    class="w-full pl-3 pr-8 py-2 text-sm text-right rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">€</span>
                </div>
              </div>
              <div class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl px-4 py-3 flex items-center justify-between">
                <span class="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Συνολικό κόστος εργασίας</span>
                <span id="total-cost-val" class="text-xl font-bold text-emerald-700 dark:text-emerald-400">€${calcTotalCost(jo)}</span>
              </div>
            </div>
          </div>

          <button id="complete-jo" ${allDone ? '' : 'disabled'} class="${allDone ? 'bg-emerald-500 hover:bg-emerald-600 cursor-pointer text-white' : 'bg-slate-200 dark:bg-slate-700 cursor-not-allowed opacity-60 text-slate-500'} font-medium py-3 rounded-xl w-full flex items-center justify-center gap-2">
            ${icon('check-circle','w-5 h-5')} ${t('jo_complete')}
          </button>
          ${!allDone ? `<p class="text-center text-xs text-slate-400">${t('jo_complete_all_first')}</p>` : ''}
        </div>
      `;
    }

    function updateProgress() {
      const taskCount = (jo.tasks || []).length;
      const doneCount = Object.values(jo.completedTasks || {}).filter(Boolean).length;
      const uncompletedCount = Object.keys(jo.uncompletedTasks || {}).length;
      const progress = taskCount ? Math.round(((doneCount + uncompletedCount) / taskCount) * 100) : 0;
      const allDone = taskCount > 0 && (doneCount + uncompletedCount) === taskCount;
      const counter = $('#progress-counter');
      const bar = $('#progress-bar');
      const btn = $('#complete-jo');
      if (counter) counter.textContent = `${doneCount}/${taskCount}`;
      if (bar) bar.style.width = progress + '%';
      if (btn) {
        btn.disabled = !allDone;
        if (allDone) {
          btn.className = btn.className
            .replace('bg-slate-200','bg-emerald-500')
            .replace('dark:bg-slate-700','hover:bg-emerald-600')
            .replace('cursor-not-allowed','cursor-pointer')
            .replace('opacity-60','')
            .replace('text-slate-500','text-white');
          btn.onclick = completeJob;
          const hint = btn.nextElementSibling;
          if (hint && hint.tagName === 'P') hint.remove();
        }
      }
    }

    async function completeJob() {
      jo.status = 'completed';
      jo.completedAt = new Date().toISOString();
      await DB.add('job_orders', jo);
      await loadAll();
      jo = jobOrderById(id);
      U.toast(t('jo_completed_msg'));
      showCompletionDialog(jo);
    }

    function showCompletionDialog(jo) {
      const v = vehicleById(jo.vehicleId);
      const c = v ? customerById(v.customerId) : null;
      // Support both new contactMethods[] and legacy preferredContact string
      const rawMethods = c?.contactMethods;
      const methods = rawMethods
        ? (Array.isArray(rawMethods) ? rawMethods : JSON.parse(rawMethods || '[]'))
        : (c?.preferredContact ? [c.preferredContact] : ['whatsapp', 'sms']);
      const ws = state.settings;

      const completedLabels = (jo.tasks || [])
        .filter((k) => jo.completedTasks?.[k])
        .map((k) => '✅ ' + (k.startsWith('custom:') ? k.slice(7) : t('task_' + k)))
        .join('\n');

      const phone = (c?.phone || '').replace(/\D/g, '');
      const waPhone = phone.startsWith('0') ? '30' + phone.slice(1) : phone.startsWith('30') ? phone : '30' + phone;

      const msg = [
        `Αγαπητέ/ή ${c?.name || 'πελάτη'},`,
        ``,
        `Το όχημά σας ${[v?.brand, v?.model].filter(Boolean).join(' ')}${v?.plate ? ' (' + v.plate.toUpperCase() + ')' : ''} είναι έτοιμο για παραλαβή! 🔧`,
        ``,
        completedLabels ? `Εργασίες που εκτελέστηκαν:\n${completedLabels}` : '',
        ``,
        `Είμαστε στη διάθεσή σας για οποιαδήποτε απορία.`,
        ``,
        [ws.workshopName, ws.workshopPhone].filter(Boolean).join('\n'),
      ].filter((l) => l !== undefined).join('\n').trim();

      const encodedMsg = encodeURIComponent(msg);
      const waLink = phone ? `https://wa.me/${waPhone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;
      const viberLink = phone ? `viber://chat?number=%2B${waPhone}&text=${encodedMsg}` : null;

      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4';
      overlay.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
              ${icon('check-circle','w-6 h-6')}
            </div>
            <div>
              <div class="font-bold">Εργασίες ολοκληρώθηκαν!</div>
              <div class="text-xs text-slate-500">Ενημερώστε τον πελάτη ή εκτυπώστε αναφορά</div>
            </div>
          </div>

          <!-- Message preview -->
          <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <div class="text-xs text-slate-400 mb-1.5 font-medium">Αυτοματοποιημένο μήνυμα</div>
            <textarea id="completion-msg" rows="6" class="w-full text-sm bg-transparent resize-none focus:outline-none text-slate-700 dark:text-slate-200 leading-relaxed">${U.escape(msg)}</textarea>
          </div>

          <!-- Action buttons -->
          ${(() => {
            const contactButtons = {
              whatsapp: `<a href="${waLink}" target="_blank" class="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.529 5.843L0 24l6.306-1.505A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.655-.493-5.193-1.357l-.371-.22-3.747.895.93-3.65-.24-.385A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                WhatsApp
              </a>`,
              sms: phone ? `<a href="${U.smsLink(c?.phone, decodeURIComponent(encodedMsg))}" class="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
                ${icon('message-square','w-5 h-5')} SMS
              </a>` : '',
            };
            let btns = methods.map((k) => contactButtons[k] || '').filter(Boolean);
            // A customer's only saved preference might be a channel we no longer support
            // (e.g. legacy 'viber'). Don't leave them with zero contact buttons — fall back
            // to WhatsApp, which works for any phone number with no extra setup.
            if (!btns.length) btns = [contactButtons.whatsapp];
            const cols = btns.length === 1 ? 'grid-cols-1' : btns.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
            return `<div class="grid ${cols} gap-2">${btns.join('')}</div>`;
          })()}
          <div class="grid grid-cols-2 gap-2">
            <button id="dlg-pdf" class="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
              ${icon('file-text','w-4 h-4')} PDF Αναφορά
            </button>
            <button id="dlg-close" class="flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-medium py-2.5 rounded-xl text-sm transition-colors">
              ${icon('x','w-4 h-4')} Κλείσιμο
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      refreshIcons();

      overlay.querySelector('#dlg-pdf').addEventListener('click', async () => {
        overlay.remove();
        await jobOrderPdf(jo);
        go('/job-orders/' + id);
      });
      overlay.querySelector('#dlg-close').addEventListener('click', () => {
        overlay.remove();
        go('/job-orders/' + id);
      });
    }

    const PART_PRESETS = [
      { cat: 'Λιπαντικά',  items: ['Λάδι κινητήρα', 'Λάδι κιβωτίου', 'Λάδι διαφορικού', 'Υγρό φρένων', 'Υγρό ψυγείου', 'Υγρό υαλοκαθαριστήρων'] },
      { cat: 'Φίλτρα',     items: ['Φίλτρο λαδιού', 'Φίλτρο αέρα', 'Φίλτρο καυσίμου', 'Φίλτρο καμπίνας'] },
      { cat: 'Φρένα',      items: ['Τακάκια εμπρός', 'Τακάκια πίσω', 'Δίσκοι εμπρός', 'Δίσκοι πίσω', 'Τύμπανα'] },
      { cat: 'Ανάφλεξη',  items: ['Μπουζί', 'Πλατίνες', 'Μπεκ', 'Καλώδια μπουζί', 'Μονάδα ανάφλεξης'] },
      { cat: 'Κινητήρας', items: ['Ιμάντας χρονισμού', 'Ιμάντας βοηθητικός', 'Τεντωτήρας', 'Αντλία νερού', 'Ψυγείο νερού'] },
      { cat: 'Λοιπά',      items: ['Μπαταρία', 'Λάμπα εμπρός', 'Λάμπα πίσω', 'Τεντωτήρας ιμάντα', 'Ψυγείο A/C'] },
    ];

    function renderPartRow(p, i) {
      const total = ((Number(p.qty) || 0) * (Number(p.price) || 0)).toFixed(2);
      return `
        <div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 part-row" data-idx="${i}">
          <span class="flex-1 text-sm truncate font-medium text-slate-700 dark:text-slate-200">${U.escape(p.name)}</span>
          <input type="number" value="${p.qty || 1}" min="0.01" step="0.01"
            class="part-qty w-16 text-center text-sm px-1 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            data-idx="${i}" placeholder="Ποσ." />
          <input type="number" value="${p.price || ''}" min="0" step="0.01"
            class="part-price w-20 text-right text-sm px-1 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            data-idx="${i}" placeholder="€" />
          <span class="part-line-total text-xs font-semibold text-emerald-700 dark:text-emerald-400 w-16 text-right">€${total}</span>
          <button class="part-del flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors" data-idx="${i}">${icon('trash-2','w-4 h-4')}</button>
        </div>`;
    }

    function calcTotalCost(j) {
      const parts = (j.workParts || []).reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.price) || 0), 0);
      return (parts + (Number(j.laborCost) || 0)).toFixed(2);
    }

    function updateTotal() {
      const el = document.getElementById('total-cost-val');
      if (el) el.textContent = '€' + calcTotalCost(jo);
    }

    async function savePartsAndRefresh() {
      jo = await DB.add('job_orders', jo);
      state.jobOrders = await DB.getAll('job_orders');
      jo = jobOrderById(id);
      const list = document.getElementById('parts-list');
      if (list) {
        list.innerHTML = (jo.workParts || []).length === 0
          ? '<p class="text-xs text-slate-400 text-center py-1">Δεν έχουν προστεθεί ανταλλακτικά ακόμα</p>'
          : (jo.workParts || []).map((p, i) => renderPartRow(p, i)).join('');
        refreshIcons();
      }
      updateTotal();
      wirePartsHandlers();
    }

    function wirePartsHandlers() {
      $$('.part-qty').forEach((inp) => {
        inp.addEventListener('change', () => {
          const i = Number(inp.dataset.idx);
          if (!jo.workParts?.[i]) return;
          jo.workParts[i].qty = Number(inp.value) || 0;
          const row = inp.closest('.part-row');
          const lineEl = row?.querySelector('.part-line-total');
          if (lineEl) lineEl.textContent = '€' + ((jo.workParts[i].qty) * (Number(jo.workParts[i].price) || 0)).toFixed(2);
          updateTotal();
          DB.add('job_orders', jo);
        });
      });
      $$('.part-price').forEach((inp) => {
        inp.addEventListener('change', () => {
          const i = Number(inp.dataset.idx);
          if (!jo.workParts?.[i]) return;
          jo.workParts[i].price = Number(inp.value) || 0;
          const row = inp.closest('.part-row');
          const lineEl = row?.querySelector('.part-line-total');
          if (lineEl) lineEl.textContent = '€' + ((Number(jo.workParts[i].qty) || 0) * jo.workParts[i].price).toFixed(2);
          updateTotal();
          DB.add('job_orders', jo);
        });
      });
      $$('.part-del').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const i = Number(btn.dataset.idx);
          if (jo.workParts) jo.workParts.splice(i, 1);
          await savePartsAndRefresh();
        });
      });
    }

    function showPartPicker() {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4';
      overlay.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 max-h-[80vh] flex flex-col">
          <div class="flex items-center justify-between flex-shrink-0">
            <h3 class="font-bold text-base">Επιλογή ανταλλακτικού</h3>
            <button id="pp-close" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">${icon('x','w-5 h-5')}</button>
          </div>
          <div class="overflow-y-auto flex-1 space-y-3 pr-1">
            ${PART_PRESETS.map((cat) => `
              <div>
                <div class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">${cat.cat}</div>
                <div class="grid grid-cols-2 gap-1.5">
                  ${cat.items.map((item) => `
                    <button class="pp-preset text-left text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700
                      hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                      data-name="${U.escape(item)}">${U.escape(item)}</button>
                  `).join('')}
                </div>
              </div>
            `).join('')}
            <div>
              <div class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Άλλο (προσαρμοσμένο)</div>
              <div class="flex gap-2">
                <input id="pp-custom" type="text" placeholder="Όνομα ανταλλακτικού…"
                  class="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button id="pp-custom-add" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex-shrink-0">Προσθήκη</button>
              </div>
            </div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      refreshIcons();

      overlay.querySelector('#pp-close').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

      overlay.querySelectorAll('.pp-preset').forEach((btn) => {
        btn.addEventListener('click', async () => {
          overlay.remove();
          if (!jo.workParts) jo.workParts = [];
          jo.workParts.push({ name: btn.dataset.name, qty: 1, price: 0 });
          await savePartsAndRefresh();
        });
      });

      const customInp = overlay.querySelector('#pp-custom');
      const addCustom = async () => {
        const name = customInp.value.trim();
        if (!name) { customInp.focus(); return; }
        overlay.remove();
        if (!jo.workParts) jo.workParts = [];
        jo.workParts.push({ name, qty: 1, price: 0 });
        await savePartsAndRefresh();
      };
      overlay.querySelector('#pp-custom-add').addEventListener('click', addCustom);
      customInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') addCustom(); });
    }

    $('#view').innerHTML = buildHTML();
    refreshIcons();

    // Task checkbox events
    $$('.task-cb').forEach((cb) => {
      cb.addEventListener('change', async () => {
        if (!jo.completedTasks) jo.completedTasks = {};
        jo.completedTasks[cb.dataset.key] = cb.checked;
        jo = await DB.add('job_orders', jo);
        state.jobOrders = await DB.getAll('job_orders');
        jo = jobOrderById(id);
        // Surgical DOM update
        const lbl = cb.nextElementSibling;
        if (lbl) {
          lbl.classList.toggle('line-through', cb.checked);
          lbl.classList.toggle('text-slate-400', cb.checked);
        }
        updateProgress();
      });
    });

    // Unable buttons
    $$('.unable-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const area = $(`#unable-${btn.dataset.idx}`);
        if (area) {
          area.classList.toggle('hidden');
          const inp = area.querySelector('.unable-note-input');
          if (!area.classList.contains('hidden') && inp) {
            inp.focus();
            inp.addEventListener('change', async () => {
              if (!jo.uncompletedTasks) jo.uncompletedTasks = {};
              jo.uncompletedTasks[btn.dataset.key] = inp.value || '—';
              jo = await DB.add('job_orders', jo);
              state.jobOrders = await DB.getAll('job_orders');
              jo = jobOrderById(id);
              updateProgress();
            });
          }
        }
      });
    });

    // Complete button
    const completeBtn = $('#complete-jo');
    if (completeBtn && !completeBtn.disabled) completeBtn.addEventListener('click', completeJob);

    // Parts panel
    $('#add-part-btn')?.addEventListener('click', showPartPicker);
    wirePartsHandlers();

    $('#show-cost-report')?.addEventListener('change', async (e) => {
      jo.showCostOnReport = e.target.checked;
      jo = await DB.add('job_orders', jo);
      state.jobOrders = await DB.getAll('job_orders');
      jo = jobOrderById(id);
    });

    $('#labor-cost-input')?.addEventListener('change', async (e) => {
      jo.laborCost = Number(e.target.value) || 0;
      jo = await DB.add('job_orders', jo);
      state.jobOrders = await DB.getAll('job_orders');
      jo = jobOrderById(id);
      updateTotal();
    });
  }

  async function renderSchedule() {
    const active = state.jobOrders
      .filter((j) => j.status !== 'completed')
      .sort((a, b) => new Date(a.desiredDelivery || '9999') - new Date(b.desiredDelivery || '9999'));

    // Build stacked schedule: each job starts when the previous one ends
    const workDayStart = new Date();
    workDayStart.setHours(8, 0, 0, 0);
    let cursor = Math.max(Date.now(), workDayStart.getTime());

    const scheduled = active.map((jo) => {
      const v = vehicleById(jo.vehicleId);
      const c = v ? customerById(v.customerId) : null;
      const hours = jo.estimatedHours || 1;

      let plannedStart, plannedEnd;
      if (jo.status === 'in_progress' && jo.startedAt) {
        plannedStart = new Date(jo.startedAt);
        plannedEnd = new Date(plannedStart.getTime() + hours * 3600000);
        cursor = Math.max(cursor, plannedEnd.getTime());
      } else {
        plannedStart = new Date(cursor);
        plannedEnd = new Date(cursor + hours * 3600000);
        cursor = plannedEnd.getTime();
      }

      const desired = jo.desiredDelivery ? new Date(jo.desiredDelivery) : null;
      const isLate = desired && plannedEnd > desired;
      const isRunningOver = jo.status === 'in_progress' && jo.startedAt &&
        Date.now() > new Date(jo.startedAt).getTime() + hours * 3600000;

      return { jo, v, c, plannedStart, plannedEnd, desired, isLate, isRunningOver };
    });

    const delayed = scheduled.filter((s) => s.isLate || s.isRunningOver);

    function localDate(d) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    // Group by local date
    const groups = {};
    const today = localDate(new Date());
    scheduled.forEach((s) => {
      const key = localDate(s.plannedStart);
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    function fmtTime(d) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function scheduleCard(s) {
      const borderColor = s.isLate || s.isRunningOver ? 'border-red-300 dark:border-red-900/60' : 'border-slate-200 dark:border-slate-700';
      const bgColor = s.isLate || s.isRunningOver ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-slate-800';
      return `
        <a href="#/job-orders/${s.jo.id}" class="block ${bgColor} border ${borderColor} rounded-xl p-3">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="font-medium text-sm truncate">${U.escape(vehicleLabel(s.v))}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">${U.escape(s.c?.name || '—')}</div>
              <div class="text-xs text-slate-400 mt-1">${fmtTime(s.plannedStart)} → ${fmtTime(s.plannedEnd)} · ${s.jo.estimatedHours || 1}h</div>
              ${s.desired ? `<div class="text-xs ${s.isLate ? 'text-red-500 font-medium' : 'text-slate-400'} mt-0.5">${icon('clock','w-3 h-3 inline mr-0.5')}${t('jo_desired_delivery')}: ${U.fmtDatetime(s.desired)}${s.isLate ? ' ⚠️' : ''}</div>` : ''}
            </div>
            <div class="flex flex-col items-end gap-1 flex-shrink-0">
              ${joStatusBadge(s.jo.status)}
              ${s.c?.phone ? `<a href="tel:${U.escape(s.c.phone)}" onclick="event.stopPropagation()" class="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">${icon('phone','w-3 h-3')} ${t('jo_call_customer')}</a>` : ''}
            </div>
          </div>
        </a>
      `;
    }

    $('#view').innerHTML = `
      ${pageHeader(t('schedule_title'), { back: false, actions: `<a href="#/job-orders/new" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">${icon('plus','w-4 h-4')} ${t('add')}</a>` })}
      <div class="max-w-3xl mx-auto p-4 pb-24 sm:pb-4 space-y-4">

        ${!active.length ? emptyState('calendar-clock', t('schedule_no_orders'), t('new_job_order'), '#/job-orders/new') : ''}

        ${delayed.length ? `
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-900/60 rounded-xl p-4">
            <div class="flex items-center gap-2 font-semibold text-red-700 dark:text-red-300 mb-3">
              ${icon('alert-triangle','w-5 h-5')} ${t('schedule_delayed')}
            </div>
            <div class="space-y-2">
              ${delayed.map((s) => s.c?.phone ? `
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-sm font-medium">${U.escape(vehicleLabel(s.v))}</div>
                    <div class="text-xs text-slate-500">${U.escape(s.c?.name || '—')}</div>
                  </div>
                  <a href="tel:${U.escape(s.c.phone)}" class="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1">
                    ${icon('phone-call','w-3 h-3')} ${U.escape(s.c.phone)}
                  </a>
                </div>
              ` : '').join('')}
            </div>
          </div>
        ` : ''}

        ${Object.entries(groups).map(([dateKey, items]) => `
          <div>
            <h2 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              ${dateKey === today ? t('schedule_today') : U.fmtDate(dateKey)}
            </h2>
            <div class="space-y-2">
              ${items.map(scheduleCard).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ---- AI parts fetch & render ----
  async function fetchPartsAI(vehicle, taskName) {
    const resp = await fetch('/api/parts-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle: vehicleLabel(vehicle),
        brand: vehicle?.brand || '',
        model: vehicle?.model || '',
        year: vehicle?.year || '',
        engine: vehicle?.engine || '',
        fuel: vehicle?.fuel || '',
        task: taskName,
      }),
    });
    if (!resp.ok) throw new Error('Parts AI request failed: ' + resp.status);
    return resp.json();
  }

  function renderPartsAIResult(data, v) {
    const parts = data.parts || [];
    const veh = v || {};

    function renderPartCard(p, idx) {
      const bestBrandPn = p.brands?.find((b) => b.partNumber)?.partNumber || null;
      const priceResultId = `price-result-${Date.now()}-${idx}`;
      return `
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div class="font-medium text-sm">${U.escape(p.name)}</div>
            ${p.oemRef ? `<span class="text-[10px] font-mono bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">OEM ${U.escape(p.oemRef)}</span>` : ''}
          </div>
          ${p.specs ? `<div class="text-xs text-slate-600 dark:text-slate-300 font-medium">${U.escape(p.specs)}</div>` : ''}
          ${p.brands?.length ? `
            <div class="flex flex-wrap gap-1.5">
              ${p.brands.map((b) => `
                <span class="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5">
                  <span class="font-medium text-emerald-700 dark:text-emerald-400">${U.escape(b.name)}</span>${b.partNumber ? `<span class="text-slate-400 ml-1 font-mono">${U.escape(b.partNumber)}</span>` : ''}
                </span>
              `).join('')}
            </div>
          ` : ''}
          ${p.note ? `<div class="text-xs text-amber-700 dark:text-amber-400 italic">${U.escape(p.note)}</div>` : ''}

          <!-- Price search button -->
          <button class="price-search-btn w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-2 rounded-lg"
            data-query="${U.escape(p.searchQuery || p.name)}"
            data-oem="${U.escape(p.oemRef || '')}"
            data-brand-pn="${U.escape(bestBrandPn || '')}"
            data-target="${priceResultId}">
            ${icon('search','w-3 h-3')} Αναζήτηση καλύτερης τιμής
          </button>
          <div id="${priceResultId}" class="hidden"></div>
        </div>
      `;
    }

    return `
      <div class="space-y-3 pt-1" data-parts-panel>
        <div class="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
          ${icon('sparkles','w-3 h-3')} ${t('parts_ai_title')}
          ${veh.brand ? `<span class="ml-auto text-[11px] text-slate-400 font-normal">${U.escape(veh.brand)} ${U.escape(veh.model || '')} ${veh.year || ''}</span>` : ''}
        </div>
        ${data.note ? `<p class="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-700/30 rounded-lg px-2 py-1.5">${U.escape(data.note)}</p>` : ''}
        ${parts.length
          ? `<div class="space-y-2">${parts.map((p, i) => renderPartCard(p, i)).join('')}</div>`
          : `<p class="text-xs text-slate-400 text-center py-2">${t('parts_ai_error')}</p>`
        }
        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-2">
          <p class="text-xs text-amber-700 dark:text-amber-400">${t('parts_ai_disclaimer')}</p>
        </div>
      </div>
    `;
  }

  function renderPriceResults(data, partName) {
    const results = data.results || [];
    const fallback = data.fallbackLinks || [];

    if (!results.length) {
      // No prices parsed — show direct links
      return `
        <div class="mt-1 space-y-1">
          <p class="text-[11px] text-slate-400 mb-1">Δεν βρέθηκαν τιμές — άνοιγμα στο κατάστημα:</p>
          <div class="flex flex-wrap gap-1.5">
            ${fallback.map((l) => `
              <a target="_blank" rel="noopener" href="${l.url}"
                 class="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 px-2 py-1 rounded-lg flex items-center gap-1">
                ${icon(l.icon,'w-3 h-3')} ${U.escape(l.store)}
              </a>
            `).join('')}
          </div>
        </div>`;
    }

    const cheapest = results[0];
    const colorMap = { orange: 'text-blue-700 dark:text-blue-500', blue: 'text-blue-600 dark:text-blue-400', green: 'text-green-600 dark:text-green-400' };

    return `
      <div class="mt-2 space-y-1.5">
        <!-- Cheapest highlight -->
        <div class="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 rounded-lg px-3 py-2">
          ${icon('tag','w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0')}
          <div class="flex-1 min-w-0">
            <div class="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">Καλύτερη τιμή</div>
            <div class="text-sm font-bold text-emerald-800 dark:text-emerald-200">${cheapest.price.toFixed(2)} ${cheapest.currency} <span class="text-xs font-normal text-emerald-600 dark:text-emerald-400">— ${U.escape(cheapest.store)}</span></div>
            ${cheapest.name && cheapest.name !== partName ? `<div class="text-[10px] text-slate-500 truncate">${U.escape(cheapest.name)}</div>` : ''}
          </div>
          <a target="_blank" rel="noopener" href="${cheapest.url}"
             class="flex-shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg">
            Αγορά
          </a>
        </div>
        <!-- Other results -->
        ${results.slice(1, 4).map((r) => `
          <div class="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-1.5">
            ${icon(r.icon || 'package','w-3 h-3 flex-shrink-0 ' + (colorMap[r.color] || 'text-slate-400'))}
            <div class="flex-1 min-w-0">
              <span class="text-xs font-medium ${colorMap[r.color] || 'text-slate-600'}">${U.escape(r.store)}</span>
              ${!r.inStock ? `<span class="text-[10px] text-red-500 ml-1">εκτός αποθέματος</span>` : ''}
            </div>
            <span class="text-sm font-bold text-slate-700 dark:text-slate-200">${r.price.toFixed(2)} €</span>
            <a target="_blank" rel="noopener" href="${r.url}"
               class="flex-shrink-0 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded-lg">
              Άνοιγμα
            </a>
          </div>
        `).join('')}
      </div>`;
  }

  async function fetchPartPrices(query, oemRef, brandPn, vehicle) {
    const resp = await fetch('/api/parts-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        oemRef: oemRef || brandPn || '',
        brand: vehicle?.brand || '',
        model: vehicle?.model || '',
        year: vehicle?.year || '',
      }),
    });
    if (!resp.ok) throw new Error('Price search failed');
    return resp.json();
  }

  // ---- Service HTML PDF (same style as job order PDF) ----
  async function serviceHtmlPdf(svc, v, c) {
    if (!window.jspdf?.jsPDF || !window.html2canvas) {
      U.toast(t('error_generic'), 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const s = state.settings;
    const isEl = (localStorage.getItem('lang') || 'el') === 'el';

    const modelPart = v ? `${v.brand || ''}_${v.model || ''}`.trim().replace(/[\s/\\]+/g, '_') : 'vehicle';
    const datePart = (svc.date || '').slice(0, 10).replace(/-/g, '-');
    const filename = ['service', modelPart, datePart].filter(Boolean).join('_') + '.pdf';

    // Parts table rows
    const partsTotal = (svc.parts || []).reduce((sum, p) => sum + (Number(p.qty)||0)*(Number(p.price)||0), 0);
    const pdfLaborRate = svc.laborRate != null ? (Number(svc.laborRate) || 0) : (Number(s.laborRate) || 0);
    const laborTotal = (Number(svc.laborHours)||0) * pdfLaborRate;
    const grandTotal = partsTotal + laborTotal;

    const partsRows = (svc.parts && svc.parts.length) ? svc.parts.map((p, i) => {
      const tot = (Number(p.qty)||0)*(Number(p.price)||0);
      return `<div style="display:grid;grid-template-columns:1.5fr 0.6fr 0.6fr 0.7fr 0.7fr;gap:4px;padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;">
        <div>${U.escape(p.name||'')}</div>
        <div style="color:#64748b;">${U.escape(p.code||'')}</div>
        <div style="text-align:center;">${p.qty||0}</div>
        <div style="text-align:right;">${U.fmtMoney(p.price)}</div>
        <div style="text-align:right;font-weight:600;">${U.fmtMoney(tot)}</div>
      </div>`;
    }).join('') : '';

    const checklistRows = (svc.checklist && svc.checklist.length) ? svc.checklist.map((key) =>
      `<div style="display:flex;align-items:center;gap:7px;padding:4px 8px;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:14px;color:#10b981;">✓</span>
        <span style="font-size:11.5px;">${U.escape(key.startsWith('custom:') ? key.slice(7) : t('task_' + key))}</span>
      </div>`
    ).join('') : '';

    // Next service
    const nextSvcKm = svc.nextServiceMileage || (v?.mileage ? Number(v.mileage) + Number(s.intervalKm||10000) : null);
    const nextSvcDate = svc.nextServiceDate
      ? new Date(svc.nextServiceDate)
      : U.addMonths(svc.date || new Date(), Number(s.intervalMonths||12));

    const html = `
      <div style="font-family:'Segoe UI',Arial,Helvetica,'DejaVu Sans',sans-serif;color:#1e293b;background:white;width:794px;padding:36px 40px;box-sizing:border-box;">

        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div>
            <div style="font-size:20px;font-weight:800;color:#f97316;">${U.escape(s.workshopName || 'GearLog')}</div>
            ${s.workshopAddress ? `<div style="font-size:10.5px;color:#64748b;margin-top:2px;">${U.escape(s.workshopAddress)}</div>` : ''}
          </div>
          <div style="text-align:right;">
            ${s.workshopPhone ? `<div style="font-size:12px;font-weight:600;">${U.escape(s.workshopPhone)}</div>` : ''}
            ${s.workshopEmail ? `<div style="font-size:10.5px;color:#64748b;">${U.escape(s.workshopEmail)}</div>` : ''}
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">${U.fmtDate(new Date())}</div>
          </div>
        </div>

        <div style="border-top:3px solid #f97316;margin-bottom:18px;"></div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div style="font-size:16px;font-weight:700;letter-spacing:0.5px;">${isEl ? 'ΔΕΛΤΙΟ SERVICE' : 'SERVICE RECORD'}</div>
          <div style="text-align:right;">
            <div style="font-size:10px;color:#94a3b8;">${U.fmtDate(svc.date)}</div>
            ${svc.mechanic ? `<div style="font-size:10px;color:#94a3b8;">${isEl ? 'Μηχανικός' : 'Mechanic'}: ${U.escape(svc.mechanic)}</div>` : ''}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
          <div style="background:#f8fafc;border-radius:8px;padding:12px;">
            <div style="font-size:9.5px;font-weight:700;color:#f97316;letter-spacing:1px;margin-bottom:8px;">${isEl ? 'ΟΧΗΜΑ' : 'VEHICLE'}</div>
            ${v ? `
              <div style="font-size:13.5px;font-weight:700;">${U.escape(v.brand||'')} ${U.escape(v.model||'')}</div>
              ${v.year ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${v.year}</div>` : ''}
              ${v.plate ? `<div style="font-size:11px;color:#475569;margin-top:2px;">${isEl?'Πινακίδα':'Plate'}: <b>${U.escape(v.plate)}</b></div>` : ''}
              ${v.vin ? `<div style="font-size:9.5px;color:#94a3b8;margin-top:2px;">VIN: ${U.escape(v.vin)}</div>` : ''}
              ${svc.mileage ? `<div style="font-size:12px;font-weight:700;color:#f97316;margin-top:5px;">${Number(svc.mileage).toLocaleString('el-GR')} km</div>` : ''}
            ` : '<div style="font-size:12px;color:#94a3b8;">—</div>'}
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:12px;">
            <div style="font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:1px;margin-bottom:8px;">${isEl ? 'ΠΕΛΑΤΗΣ' : 'CUSTOMER'}</div>
            ${c ? `
              <div style="font-size:13.5px;font-weight:700;">${U.escape(c.name)}</div>
              ${c.phone ? `<div style="font-size:11px;color:#64748b;margin-top:4px;">${isEl?'Τηλ':'Tel'}: ${U.escape(c.phone)}</div>` : ''}
              ${c.email ? `<div style="font-size:9.5px;color:#94a3b8;margin-top:2px;">${U.escape(c.email)}</div>` : ''}
            ` : '<div style="font-size:12px;color:#94a3b8;">—</div>'}
          </div>
        </div>

        ${checklistRows ? `
        <div style="margin-bottom:20px;">
          <div style="font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:1px;padding-bottom:5px;border-bottom:2px solid #e2e8f0;margin-bottom:4px;">${isEl ? 'ΕΡΓΑΣΙΕΣ' : 'TASKS'}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;">${checklistRows}</div>
        </div>` : ''}

        ${svc.description ? `
        <div style="margin-bottom:20px;">
          <div style="font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:1px;padding-bottom:5px;border-bottom:2px solid #e2e8f0;margin-bottom:8px;">${isEl ? 'ΠΕΡΙΓΡΑΦΗ' : 'DESCRIPTION'}</div>
          <div style="font-size:11.5px;color:#374151;line-height:1.6;">${U.escape(svc.description).replace(/\n/g,'<br>')}</div>
        </div>` : ''}

        ${partsRows ? `
        <div style="margin-bottom:16px;">
          <div style="font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:1px;padding-bottom:5px;border-bottom:2px solid #e2e8f0;margin-bottom:4px;">${isEl ? 'ΑΝΤΑΛΛΑΚΤΙΚΑ' : 'PARTS'}</div>
          <div style="display:grid;grid-template-columns:1.5fr 0.6fr 0.6fr 0.7fr 0.7fr;gap:4px;padding:5px 8px;background:#f8fafc;font-size:10px;font-weight:700;color:#64748b;">
            <div>${isEl?'Είδος':'Part'}</div><div>${isEl?'Κωδικός':'Code'}</div><div style="text-align:center;">${isEl?'Ποσ.':'Qty'}</div><div style="text-align:right;">${isEl?'Τιμή':'Price'}</div><div style="text-align:right;">${isEl?'Σύνολο':'Total'}</div>
          </div>
          ${partsRows}
        </div>` : ''}

        ${grandTotal > 0 ? `
        <div style="display:flex;flex-direction:column;align-items:flex-end;margin-bottom:20px;gap:4px;">
          ${partsTotal > 0 ? `<div style="font-size:11px;color:#64748b;">${isEl?'Ανταλλακτικά':'Parts'}: ${U.fmtMoney(partsTotal)}</div>` : ''}
          ${laborTotal > 0 ? `<div style="font-size:11px;color:#64748b;">${isEl?'Εργατικά':'Labour'} (${svc.laborHours||0}h): ${U.fmtMoney(laborTotal)}</div>` : ''}
          <div style="font-size:15px;font-weight:800;color:#1e293b;border-top:2px solid #e2e8f0;padding-top:6px;margin-top:2px;">${isEl?'ΣΥΝΟΛΟ':'TOTAL'}: ${U.fmtMoney(grandTotal)}</div>
        </div>` : ''}

        <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
          <div style="font-size:9.5px;font-weight:700;color:#92400e;letter-spacing:1px;margin-bottom:8px;">${isEl ? 'ΕΠΟΜΕΝΟ SERVICE' : 'NEXT SERVICE'}</div>
          <div style="display:flex;gap:24px;">
            ${nextSvcKm ? `<div style="font-size:11.5px;"><span style="color:#64748b;">${isEl?'Χιλιόμετρα':'Mileage'}:</span> <b style="color:#1e293b;">${Number(nextSvcKm).toLocaleString('el-GR')} km</b></div>` : ''}
            <div style="font-size:11.5px;"><span style="color:#64748b;">${isEl?'Ημερομηνία':'Date'}:</span> <b style="color:#1e293b;">${U.fmtDate(nextSvcDate)}</b></div>
          </div>
        </div>

        ${svc.notes ? `
        <div style="margin-bottom:20px;">
          <div style="font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:1px;padding-bottom:5px;border-bottom:2px solid #e2e8f0;margin-bottom:8px;">${isEl ? 'ΣΗΜΕΙΩΣΕΙΣ' : 'NOTES'}</div>
          <div style="font-size:11.5px;color:#374151;line-height:1.6;background:#fffbeb;border-left:3px solid #f59e0b;padding:10px 12px;border-radius:4px;">${U.escape(svc.notes).replace(/\n/g,'<br>')}</div>
        </div>` : ''}

        <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:9px;color:#94a3b8;">${U.escape(s.workshopName || 'GearLog')}</div>
          <div style="font-size:9px;color:#94a3b8;">${U.fmtDate(new Date())}</div>
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-9999;';
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);

    try {
      const el = wrapper.firstElementChild;
      const canvas = await window.html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.93);
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const imgH = (canvas.height / canvas.width) * pageW;

      let pos = 0;
      doc.addImage(imgData, 'JPEG', 0, pos, pageW, imgH);
      let remaining = imgH - pageH;
      while (remaining > 0) {
        pos -= pageH;
        doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, pos, pageW, imgH);
        remaining -= pageH;
      }

      doc.save(filename);
    } catch (e) {
      console.error('Service PDF error:', e);
      U.toast(t('error_generic'), 'error');
    } finally {
      document.body.removeChild(wrapper);
    }
  }

  // ---- Job Order PDF export ----
  async function jobOrderPdf(jo) {
    if (!window.jspdf?.jsPDF || !window.html2canvas) {
      U.toast(t('error_generic'), 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const v = vehicleById(jo.vehicleId);
    const c = v ? customerById(v.customerId) : null;
    const s = state.settings;
    const isEl = (localStorage.getItem('lang') || 'el') === 'el';

    // Filename: service_Brand_Model_mileagekm_DD-MM-YYYY.pdf
    const modelPart = v ? `${v.brand || ''}_${v.model || ''}`.trim().replace(/[\s/\\]+/g, '_') : 'vehicle';
    const mileagePart = v?.mileage ? `${Number(v.mileage).toLocaleString('el-GR')}km` : '';
    const datePart = U.fmtDate(jo.completedAt || jo.createdAt).replace(/\//g, '-');
    const filename = ['service', modelPart, mileagePart, datePart].filter(Boolean).join('_') + '.pdf';

    // Next service calculation
    const baseDate = jo.completedAt ? new Date(jo.completedAt) : new Date();
    const nextSvcDate = U.addMonths(baseDate, Number(s.intervalMonths || 12));
    const nextSvcKm = v?.mileage ? (Number(v.mileage) + Number(s.intervalKm || 10000)) : null;

    const taskRows = (jo.tasks || []).map((key) => {
      const done = jo.completedTasks?.[key];
      const unable = jo.uncompletedTasks?.[key];
      const label = key.startsWith('custom:') ? key.slice(7) : t('task_' + key);
      const statusIcon = done ? '✓' : unable ? '⚠' : '○';
      const statusColor = done ? '#10b981' : unable ? '#ef4444' : '#cbd5e1';
      return `<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 8px;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:15px;color:${statusColor};flex-shrink:0;">${statusIcon}</span>
        <div style="font-size:11.5px;">
          <div${unable ? ' style="color:#ef4444;"' : ''}>${U.escape(label)}</div>
          ${unable ? `<div style="font-size:10px;color:#ef4444;font-style:italic;">Δεν εκτελέστηκε${unable !== '—' ? ': ' + U.escape(unable) : ''}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    const statusLabel = jo.status === 'completed' ? (isEl ? 'Ολοκληρωμένη' : 'Completed')
      : jo.status === 'in_progress' ? (isEl ? 'Σε εξέλιξη' : 'In Progress')
      : (isEl ? 'Εκκρεμεί' : 'Pending');
    const statusStyle = jo.status === 'completed' ? 'background:#d1fae5;color:#065f46'
      : jo.status === 'in_progress' ? 'background:#dbeafe;color:#1e40af'
      : 'background:#fef3c7;color:#92400e';

    const html = `
      <div style="font-family:'Segoe UI',Arial,Helvetica,'DejaVu Sans',sans-serif;color:#1e293b;background:white;width:794px;padding:36px 40px 36px 40px;box-sizing:border-box;">

        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div>
            <div style="font-size:20px;font-weight:800;color:#f97316;">${U.escape(s.workshopName || 'GearLog')}</div>
            ${s.workshopAddress ? `<div style="font-size:10.5px;color:#64748b;margin-top:2px;">${U.escape(s.workshopAddress)}</div>` : ''}
          </div>
          <div style="text-align:right;">
            ${s.workshopPhone ? `<div style="font-size:12px;font-weight:600;">${U.escape(s.workshopPhone)}</div>` : ''}
            ${s.workshopEmail ? `<div style="font-size:10.5px;color:#64748b;">${U.escape(s.workshopEmail)}</div>` : ''}
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">${U.fmtDate(new Date())}</div>
          </div>
        </div>

        <div style="border-top:3px solid #f97316;margin-bottom:18px;"></div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div style="font-size:16px;font-weight:700;letter-spacing:0.5px;">${isEl ? 'ΕΝΤΟΛΗ ΕΡΓΑΣΙΑΣ' : 'JOB ORDER'}</div>
          <div style="text-align:right;">
            <div style="font-size:10px;color:#94a3b8;">#${jo.id.slice(-6)}</div>
            <div style="font-size:10px;color:#94a3b8;">${U.fmtDate(jo.createdAt)}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
          <div style="background:#f8fafc;border-radius:8px;padding:12px;">
            <div style="font-size:9.5px;font-weight:700;color:#f97316;letter-spacing:1px;margin-bottom:8px;">${isEl ? 'ΟΧΗΜΑ' : 'VEHICLE'}</div>
            ${v ? `
              <div style="font-size:13.5px;font-weight:700;">${U.escape(v.brand || '')} ${U.escape(v.model || '')}</div>
              ${v.year ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${v.year}</div>` : ''}
              ${v.plate ? `<div style="font-size:11px;color:#475569;margin-top:2px;">${isEl ? 'Πινακίδα' : 'Plate'}: <b>${U.escape(v.plate)}</b></div>` : ''}
              ${v.vin ? `<div style="font-size:9.5px;color:#94a3b8;margin-top:2px;">VIN: ${U.escape(v.vin)}</div>` : ''}
              ${v.mileage ? `<div style="font-size:12px;font-weight:700;color:#f97316;margin-top:5px;">${Number(v.mileage).toLocaleString('el-GR')} km</div>` : ''}
            ` : '<div style="font-size:12px;color:#94a3b8;">—</div>'}
          </div>

          <div style="background:#f8fafc;border-radius:8px;padding:12px;">
            <div style="font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:1px;margin-bottom:8px;">${isEl ? 'ΠΕΛΑΤΗΣ' : 'CUSTOMER'}</div>
            ${c ? `
              <div style="font-size:13.5px;font-weight:700;">${U.escape(c.name)}</div>
              ${c.phone ? `<div style="font-size:11px;color:#64748b;margin-top:4px;">${isEl ? 'Τηλ' : 'Tel'}: ${U.escape(c.phone)}</div>` : ''}
              ${c.email ? `<div style="font-size:9.5px;color:#94a3b8;margin-top:2px;">${U.escape(c.email)}</div>` : ''}
            ` : '<div style="font-size:12px;color:#94a3b8;">—</div>'}
          </div>

          <div style="background:#f8fafc;border-radius:8px;padding:12px;">
            <div style="font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:1px;margin-bottom:8px;">${isEl ? 'ΧΡΟΝΟΔΙΑΓΡΑΜΜΑ' : 'SCHEDULE'}</div>
            ${jo.mechanic ? `<div style="font-size:10.5px;color:#475569;margin-bottom:3px;"><b>${isEl ? 'Μηχανικός' : 'Mechanic'}:</b> ${U.escape(jo.mechanic)}</div>` : ''}
            ${jo.desiredDelivery ? `<div style="font-size:10.5px;color:#475569;margin-bottom:3px;"><b>${isEl ? 'Παράδοση' : 'Delivery'}:</b> ${U.fmtDatetime(jo.desiredDelivery)}</div>` : ''}
            ${jo.estimatedHours ? `<div style="font-size:10.5px;color:#475569;margin-bottom:3px;"><b>${isEl ? 'Εκτ. ώρες' : 'Est. hours'}:</b> ${jo.estimatedHours}h</div>` : ''}
            ${jo.startedAt ? `<div style="font-size:10.5px;color:#475569;margin-bottom:3px;"><b>${isEl ? 'Έναρξη' : 'Start'}:</b> ${U.fmtDatetime(jo.startedAt)}</div>` : ''}
            ${jo.completedAt ? `<div style="font-size:10.5px;color:#059669;margin-bottom:3px;"><b>${isEl ? 'Ολοκλήρωση' : 'Completed'}:</b> ${U.fmtDatetime(jo.completedAt)}</div>` : ''}
          </div>

          <div style="background:#f8fafc;border-radius:8px;padding:12px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;">
            <div style="font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:1px;margin-bottom:10px;">${isEl ? 'ΚΑΤΑΣΤΑΣΗ' : 'STATUS'}</div>
            <div style="padding:5px 14px;border-radius:20px;font-size:11.5px;font-weight:700;${statusStyle};">${statusLabel}</div>
          </div>
        </div>

        <div style="margin-bottom:${jo.notes ? '20px' : '0'};">
          <div style="font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:1px;padding-bottom:5px;border-bottom:2px solid #e2e8f0;margin-bottom:4px;">${isEl ? 'ΕΡΓΑΣΙΕΣ' : 'TASKS'}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;">
            ${taskRows || `<div style="color:#94a3b8;font-size:11px;padding:8px;">—</div>`}
          </div>
        </div>

        ${jo.notes ? `
        <div style="margin-bottom:20px;">
          <div style="font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:1px;padding-bottom:5px;border-bottom:2px solid #e2e8f0;margin-bottom:8px;">${isEl ? 'ΣΗΜΕΙΩΣΕΙΣ' : 'NOTES'}</div>
          <div style="font-size:11.5px;color:#374151;line-height:1.6;background:#fffbeb;border-left:3px solid #f59e0b;padding:10px 12px;border-radius:4px;">${U.escape(jo.notes).replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}

        ${jo.showCostOnReport !== false && ((jo.workParts || []).length > 0 || jo.laborCost) ? `
        <div style="margin-bottom:20px;">
          <div style="font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:1px;padding-bottom:5px;border-bottom:2px solid #e2e8f0;margin-bottom:8px;">ΑΝΤΑΛΛΑΚΤΙΚΑ &amp; ΚΟΣΤΟΣ</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="text-align:left;padding:5px 8px;color:#64748b;font-weight:600;">Ανταλλακτικό</th>
                <th style="text-align:center;padding:5px 8px;color:#64748b;font-weight:600;width:60px;">Ποσ.</th>
                <th style="text-align:right;padding:5px 8px;color:#64748b;font-weight:600;width:70px;">Τιμή</th>
                <th style="text-align:right;padding:5px 8px;color:#64748b;font-weight:600;width:70px;">Σύνολο</th>
              </tr>
            </thead>
            <tbody>
              ${(jo.workParts || []).map((p) => {
                const lt = ((Number(p.qty)||0)*(Number(p.price)||0)).toFixed(2);
                return `<tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:5px 8px;">${U.escape(p.name)}</td>
                  <td style="text-align:center;padding:5px 8px;">${Number(p.qty)||0}</td>
                  <td style="text-align:right;padding:5px 8px;">€${Number(p.price||0).toFixed(2)}</td>
                  <td style="text-align:right;padding:5px 8px;font-weight:600;">€${lt}</td>
                </tr>`;
              }).join('')}
              ${jo.laborCost ? `<tr style="border-bottom:1px solid #f1f5f9;background:#f8fafc;">
                <td colspan="3" style="padding:5px 8px;font-style:italic;color:#475569;">Κόστος εργασίας</td>
                <td style="text-align:right;padding:5px 8px;font-weight:600;">€${Number(jo.laborCost).toFixed(2)}</td>
              </tr>` : ''}
            </tbody>
          </table>
          <div style="display:flex;justify-content:flex-end;margin-top:8px;">
            <div style="background:#d1fae5;border:1.5px solid #6ee7b7;border-radius:8px;padding:8px 16px;text-align:right;">
              <div style="font-size:9.5px;color:#065f46;font-weight:700;letter-spacing:0.5px;margin-bottom:2px;">ΣΥΝΟΛΙΚΟ ΚΟΣΤΟΣ</div>
              <div style="font-size:16px;font-weight:800;color:#065f46;">€${(
                (jo.workParts||[]).reduce((s,p)=>s+(Number(p.qty)||0)*(Number(p.price)||0),0)+(Number(jo.laborCost)||0)
              ).toFixed(2)}</div>
            </div>
          </div>
        </div>
        ` : ''}

        <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
          <div style="font-size:9.5px;font-weight:700;color:#92400e;letter-spacing:1px;margin-bottom:8px;">${isEl ? 'ΕΠΟΜΕΝΟ SERVICE' : 'NEXT SERVICE'}</div>
          <div style="display:flex;gap:24px;">
            ${nextSvcKm ? `<div style="font-size:11.5px;"><span style="color:#64748b;">Χιλιόμετρα:</span> <b style="color:#1e293b;">${Number(nextSvcKm).toLocaleString('el-GR')} km</b></div>` : ''}
            <div style="font-size:11.5px;"><span style="color:#64748b;">Ημερομηνία:</span> <b style="color:#1e293b;">${U.fmtDate(nextSvcDate)}</b></div>
          </div>
        </div>

        <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:9px;color:#94a3b8;">${U.escape(s.workshopName || 'GearLog')}</div>
          <div style="font-size:9px;color:#94a3b8;">${U.fmtDate(new Date())}</div>
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-9999;';
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);

    try {
      const el = wrapper.firstElementChild;
      const canvas = await window.html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.93);
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const imgH = (canvas.height / canvas.width) * pageW;

      let pos = 0;
      doc.addImage(imgData, 'JPEG', 0, pos, pageW, imgH);
      let remaining = imgH - pageH;
      while (remaining > 0) {
        pos -= pageH;
        doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, pos, pageW, imgH);
        remaining -= pageH;
      }

      doc.save(filename);
    } catch (e) {
      console.error('PDF error:', e);
      U.toast(t('error_generic'), 'error');
    } finally {
      document.body.removeChild(wrapper);
    }
  }

  // =========================================================
  //  BUSINESS ADVISOR
  // =========================================================
  async function renderAdvisor() {
    const s = state.settings;
    const totalCustomers = state.customers.length;
    const totalVehicles = state.vehicles.length;
    const totalServices = state.services.length;
    const totalJOs = (state.jobOrders || []).length;
    const completedJOs = (state.jobOrders || []).filter((j) => j.status === 'completed').length;
    const pendingJOs = totalJOs - completedJOs;

    // Revenue from services (parts + labor)
    let totalRevenue = 0;
    for (const sv of state.services) totalRevenue += svcRevenue(sv);

    // Avg services per vehicle
    const avgSvcPerVehicle = totalVehicles ? (totalServices / totalVehicles).toFixed(1) : 0;

    // Services in last 30 days
    const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30);
    const recent30 = state.services.filter((sv) => new Date(sv.date) >= cutoff30).length;

    // Vehicles with no service yet
    const vehicleIdsWithService = new Set(state.services.map((sv) => sv.vehicleId));
    const noServiceVehicles = state.vehicles.filter((v) => !vehicleIdsWithService.has(v.id)).length;

    const stats = {
      πελάτες: totalCustomers,
      οχήματα: totalVehicles,
      service_εγγραφές: totalServices,
      εντολές_εργασίας: totalJOs,
      ολοκληρωμένες_εντολές: completedJOs,
      εκκρεμείς_εντολές: pendingJOs,
      εισοδήματα_ευρώ: Math.round(totalRevenue),
      μέσο_service_ανά_όχημα: avgSvcPerVehicle,
      service_τελευταίων_30ημερών: recent30,
      οχήματα_χωρίς_service: noServiceVehicles,
      εργαλεία_ανά_ώρα_ευρώ: s.laborRate || 35,
      διάστημα_service_km: s.intervalKm || 10000,
      διάστημα_service_μήνες: s.intervalMonths || 12,
    };

    const vehicleTypes = (s.workshopVehicleTypes || 'car')
      .split(',')
      .map((v) => v === 'car' ? 'Αυτοκίνητα' : v === 'moto' ? 'Μοτοσυκλέτες' : v === 'truck' ? 'Φορτηγά' : 'Σκάφη')
      .join(', ');

    $('#view').innerHTML = `
      ${pageHeader('Σύμβουλος Επιχείρησης')}
      <div class="max-w-2xl mx-auto p-4 pb-24 sm:pb-4 space-y-4">

        <!-- Intro card -->
        <div class="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              ${icon('brain-circuit','w-7 h-7')}
            </div>
            <div>
              <div class="font-bold text-lg">Έξυπνος Σύμβουλος</div>
              <div class="text-violet-200 text-sm">Ανάλυση δεδομένων & προτάσεις ανάπτυξης</div>
            </div>
          </div>
          <p class="text-sm text-violet-100 leading-relaxed">Ο Έξυπνος Σύμβουλος αναλύει τα δεδομένα του συνεργείου σου και συγκρίνει με αντίστοιχα συνεργεία στην Ελλάδα για να σου δώσει εξατομικευμένες συμβουλές ανάπτυξης.</p>
        </div>

        <!-- Stats snapshot -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h2 class="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">Στιγμιότυπο επιχείρησης</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            ${[
              ['users','Πελάτες', totalCustomers, 'text-blue-600', 'bg-blue-100 dark:bg-blue-900/30'],
              ['car','Οχήματα', totalVehicles, 'text-indigo-600', 'bg-indigo-100 dark:bg-indigo-900/30'],
              ['wrench','Service', totalServices, 'text-emerald-600', 'bg-emerald-100 dark:bg-emerald-900/30'],
              ['clipboard-check','Εντολές', totalJOs, 'text-amber-600', 'bg-amber-100 dark:bg-amber-900/30'],
              ['euro','Έσοδα', '€' + U.fmtNum(totalRevenue), 'text-violet-600', 'bg-violet-100 dark:bg-violet-900/30'],
              ['activity','Service/30μ.', recent30, 'text-rose-600', 'bg-rose-100 dark:bg-rose-900/30'],
            ].map(([icn,lbl,val,tc,bg]) => `
              <div class="flex items-center gap-2.5 p-3 rounded-xl ${bg}">
                <div class="${tc} flex-shrink-0">${icon(icn,'w-4 h-4')}</div>
                <div>
                  <div class="text-base font-bold ${tc}">${val}</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400">${lbl}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Vehicle types -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">Τύποι οχημάτων</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${U.escape(vehicleTypes)}</div>
          </div>
          <a href="#/settings" class="text-xs text-blue-600 hover:underline flex items-center gap-1">${icon('settings','w-3.5 h-3.5')} Αλλαγή</a>
        </div>

        <!-- CTA button -->
        <button id="btn-get-advice" class="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base transition-colors shadow-lg shadow-violet-600/20">
          ${icon('sparkles','w-5 h-5')} Ανάλυση & Συμβουλές
        </button>

        <!-- Result area -->
        <div id="advisor-result" class="hidden space-y-3"></div>

      </div>
    `;
    refreshIcons();

    $('#btn-get-advice').addEventListener('click', async () => {
      const btn = $('#btn-get-advice');
      btn.disabled = true;
      btn.innerHTML = `${icon('loader','w-5 h-5 animate-spin')} Ανάλυση δεδομένων…`;
      refreshIcons();

      try {
        const resp = await fetch('/api/advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stats, vehicleTypes }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.advice) throw new Error(data.error || 'Σφάλμα');

        const priorityBadge = (p) => {
          if (p === 'high') return `<span class="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">Υψηλή προτεραιότητα</span>`;
          if (p === 'medium') return `<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">Μέτρια προτεραιότητα</span>`;
          return `<span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">Χαμηλή προτεραιότητα</span>`;
        };

        const scoreColor = data.score >= 7 ? 'text-emerald-600' : data.score >= 5 ? 'text-amber-600' : 'text-red-600';
        const scoreBg = data.score >= 7 ? 'bg-emerald-100 dark:bg-emerald-900/30' : data.score >= 5 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30';

        const result = $('#advisor-result');
        result.innerHTML = `
          ${data.summary ? `
          <div class="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4 flex items-start gap-3">
            <div class="w-12 h-12 ${scoreBg} rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg ${scoreColor}">${data.score}/10</div>
            <div>
              <div class="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-1 uppercase tracking-wide">Αξιολόγηση</div>
              <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">${U.escape(data.summary)}</p>
            </div>
          </div>` : ''}
          ${(data.advice || []).map((a, i) => `
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-sm font-bold flex-shrink-0">${i + 1}</div>
                  <div class="font-semibold text-sm">${U.escape(a.title)}</div>
                </div>
                ${priorityBadge(a.priority)}
              </div>
              <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-9">${U.escape(a.description)}</p>
              ${a.impact ? `
                <div class="pl-9 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                  ${icon('trending-up','w-3.5 h-3.5')} ${U.escape(a.impact)}
                </div>` : ''}
            </div>
          `).join('')}
        `;
        result.classList.remove('hidden');
        result.scrollIntoView({ behavior: 'smooth', block: 'start' });
        refreshIcons();
      } catch (e) {
        U.toast(e.message || 'Σφάλμα σύνδεσης', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `${icon('sparkles','w-5 h-5')} Νέα Ανάλυση`;
        refreshIcons();
      }
    });
  }

  // =========================================================
  //  APPOINTMENTS
  // =========================================================
  async function renderAppointments() {
    // Only appointments need refreshing here: router() already ran a full loadAll() before
    // reaching this route, and the other call sites (save/delete) only mutated appointments.
    state.appointments = await DB.getAll('appointments');

    const todayStr = U.localDateStr();
    const tomorrowStr = U.localDateStr(Date.now() + 86400000);
    const apps = state.appointments || [];

    const upcoming = apps
      .filter((a) => !['completed', 'cancelled'].includes(a.status) && a.date >= todayStr)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    const past = apps
      .filter((a) => ['completed', 'cancelled'].includes(a.status) || a.date < todayStr)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    const grouped = {};
    upcoming.forEach((a) => {
      if (!grouped[a.date]) grouped[a.date] = [];
      grouped[a.date].push(a);
    });

    const TYPE_LABELS = {
      service: 'Service', check: 'Διαγνωστικό', tires: 'Ελαστικά',
      pickup: 'Παραλαβή', delivery: 'Παράδοση', other: 'Άλλο',
    };
    const STATUS_STYLE = {
      scheduled: 'text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300',
      confirmed: 'text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-300',
      completed: 'text-slate-500 bg-slate-100 dark:bg-slate-700',
      cancelled: 'text-red-500 bg-red-50 dark:bg-red-900/20',
    };
    const STATUS_LABELS = { scheduled: 'Προγραμματισμένο', confirmed: 'Επιβεβαιωμένο', completed: 'Ολοκληρώθηκε', cancelled: 'Ακυρώθηκε' };

    function apptCard(a) {
      const c = customerById(a.customerId);
      const v = a.vehicleId ? vehicleById(a.vehicleId) : null;
      const sc = STATUS_STYLE[a.status] || STATUS_STYLE.scheduled;
      return `
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm" data-appt="${a.id}">
          <div class="flex items-start gap-3">
            <div class="bg-blue-600 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 text-center min-w-[52px] flex-shrink-0 tabular-nums">
              ${a.time || '--:--'}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm truncate">${U.escape(c?.name || 'Άγνωστος πελάτης')}</div>
              ${v ? `<div class="text-xs text-slate-500 dark:text-slate-400 truncate">${U.escape(vehicleLabel(v))}</div>` : ''}
              <div class="flex flex-wrap items-center gap-1.5 mt-1">
                <span class="text-xs px-1.5 py-0.5 rounded font-medium ${sc}">${STATUS_LABELS[a.status] || ''}</span>
                <span class="text-xs text-slate-400">${TYPE_LABELS[a.type] || a.type || ''}</span>
                ${a.notes ? `<span class="text-xs text-slate-400 truncate max-w-[120px]">${U.escape(a.notes)}</span>` : ''}
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              ${c?.phone ? `<button class="appt-sms p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" data-id="${a.id}" title="SMS">${icon('message-square','w-4 h-4')}</button>` : ''}
              <button class="appt-edit p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" data-id="${a.id}">${icon('edit-2','w-4 h-4')}</button>
              <button class="appt-del p-1.5 text-slate-400 hover:text-red-500 transition-colors" data-id="${a.id}">${icon('trash-2','w-4 h-4')}</button>
            </div>
          </div>
        </div>`;
    }

    function groupedHtml() {
      if (!upcoming.length) return `<div class="text-center text-slate-400 text-sm py-12 flex flex-col items-center gap-2">${icon('calendar','w-10 h-10 opacity-30')}<p>Δεν υπάρχουν επερχόμενα ραντεβού</p><p class="text-xs">Πατήστε «Νέο Ραντεβού» για να προσθέσετε</p></div>`;
      return Object.entries(grouped).map(([date, appts]) => {
        const d = new Date(date + 'T00:00:00');
        const label = date === todayStr ? 'Σήμερα' : date === tomorrowStr ? 'Αύριο'
          : d.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' });
        const isToday = date === todayStr;
        return `
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-bold uppercase tracking-wide ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}">${label}</span>
              <span class="${isToday ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'} text-xs rounded-full px-2 py-0.5 font-semibold">${appts.length}</span>
            </div>
            <div class="space-y-2">${appts.map(apptCard).join('')}</div>
          </div>`;
      }).join('');
    }

    $('#view').innerHTML = `
      ${pageHeader('Ραντεβού')}
      <div class="max-w-2xl mx-auto p-4 pb-24 sm:pb-8 space-y-4">
        <div class="flex items-center justify-between">
          <div class="text-sm text-slate-500">${upcoming.length > 0 ? `${upcoming.length} επερχόμενο${upcoming.length === 1 ? '' : 'α'}` : 'Καμία εγγραφή'}</div>
          <button id="new-appt-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-colors shadow-sm">
            ${icon('plus','w-4 h-4')} Νέο Ραντεβού
          </button>
        </div>

        ${groupedHtml()}

        ${past.length ? `
          <details class="mt-2">
            <summary class="text-sm font-medium text-slate-500 dark:text-slate-400 cursor-pointer py-2 flex items-center gap-2">
              ${icon('history','w-4 h-4')} Ιστορικό (${past.length})
            </summary>
            <div class="space-y-2 mt-3">
              ${past.slice(0, 30).map(apptCard).join('')}
            </div>
          </details>
        ` : ''}
      </div>
    `;
    refreshIcons();

    $('#new-appt-btn')?.addEventListener('click', () => showApptForm());

    $$('.appt-sms').forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = appointmentById(btn.dataset.id);
        if (!a) return;
        const c = customerById(a.customerId);
        if (!c?.phone) return;
        const ws = state.settings;
        const d = new Date(a.date + 'T00:00:00').toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' });
        const msg = `Υπενθύμιση ραντεβού: ${d} στις ${a.time}${ws.workshopName ? ' στο ' + ws.workshopName : ''}.${ws.workshopPhone ? '\nΤηλ: ' + ws.workshopPhone : ''}`;
        showSmsCompose(c.phone, c.name, msg);
      });
    });

    $$('.appt-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = appointmentById(btn.dataset.id);
        if (a) showApptForm(a);
      });
    });

    $$('.appt-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Διαγραφή ραντεβού;')) return;
        await DB.remove('appointments', btn.dataset.id);
        state.appointments = await DB.getAll('appointments');
        renderAppointments();
      });
    });

    function showSmsCompose(phone, name, defaultMsg) {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4';
      overlay.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold">SMS — ${U.escape(name)}</h3>
            <button id="sms-close" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">${icon('x','w-5 h-5')}</button>
          </div>
          <div class="text-xs text-slate-400">${U.escape(phone)}</div>
          <textarea id="sms-text" rows="4" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none">${U.escape(defaultMsg)}</textarea>
          <button id="sms-send" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
            ${icon('message-square','w-4 h-4')} Αποστολή SMS
          </button>
        </div>`;
      document.body.appendChild(overlay);
      refreshIcons();
      overlay.querySelector('#sms-close').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
      overlay.querySelector('#sms-send').addEventListener('click', () => {
        const msg = overlay.querySelector('#sms-text').value;
        overlay.remove();
        window.location.href = U.smsLink(phone, msg);
      });
    }

    function showApptForm(appt = null) {
      const isEdit = !!appt;
      const a = appt || { status: 'scheduled', type: 'service', date: U.localDateStr(), time: '09:00' };

      const customerOpts = state.customers
        .slice().sort((x, y) => x.name.localeCompare(y.name, 'el'))
        .map((c) => `<option value="${c.id}" ${a.customerId === c.id ? 'selected' : ''}>${U.escape(c.name)}</option>`)
        .join('');

      const vehOpts = (a.customerId ? state.vehicles.filter((v) => v.customerId === a.customerId) : [])
        .map((v) => `<option value="${v.id}" ${a.vehicleId === v.id ? 'selected' : ''}>${U.escape(vehicleLabel(v))}</option>`)
        .join('');

      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4';
      overlay.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh]">
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <h3 class="font-bold text-lg">${isEdit ? 'Επεξεργασία' : 'Νέο'} Ραντεβού</h3>
            <button id="af-close" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">${icon('x','w-5 h-5')}</button>
          </div>
          <div class="overflow-y-auto flex-1 p-5 space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1">Πελάτης <span class="text-red-500">*</span></label>
              <select id="af-customer" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Επιλέξτε πελάτη —</option>
                ${customerOpts}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Όχημα</label>
              <select id="af-vehicle" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Χωρίς συγκεκριμένο όχημα —</option>
                ${vehOpts}
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-1">Ημερομηνία <span class="text-red-500">*</span></label>
                <input type="date" id="af-date" value="${a.date || ''}" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Ώρα <span class="text-red-500">*</span></label>
                <input type="time" id="af-time" value="${a.time || ''}" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Τύπος εργασίας</label>
              <select id="af-type" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="service" ${a.type==='service'?'selected':''}>Service</option>
                <option value="check" ${a.type==='check'?'selected':''}>Έλεγχος / Διαγνωστικό</option>
                <option value="tires" ${a.type==='tires'?'selected':''}>Ελαστικά</option>
                <option value="pickup" ${a.type==='pickup'?'selected':''}>Παραλαβή οχήματος</option>
                <option value="delivery" ${a.type==='delivery'?'selected':''}>Παράδοση οχήματος</option>
                <option value="other" ${a.type==='other'?'selected':''}>Άλλο</option>
              </select>
            </div>
            ${isEdit ? `
            <div>
              <label class="block text-sm font-medium mb-1">Κατάσταση</label>
              <select id="af-status" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="scheduled" ${a.status==='scheduled'?'selected':''}>Προγραμματισμένο</option>
                <option value="confirmed" ${a.status==='confirmed'?'selected':''}>Επιβεβαιωμένο</option>
                <option value="completed" ${a.status==='completed'?'selected':''}>Ολοκληρώθηκε</option>
                <option value="cancelled" ${a.status==='cancelled'?'selected':''}>Ακυρώθηκε</option>
              </select>
            </div>
            ` : ''}
            <div>
              <label class="block text-sm font-medium mb-1">Σημειώσεις</label>
              <textarea id="af-notes" rows="2" placeholder="π.χ. Αλλαγή λαδιών και φίλτρου…" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none">${U.escape(a.notes || '')}</textarea>
            </div>
          </div>
          <div class="flex gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            <button id="af-save" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">Αποθήκευση</button>
            <button id="af-cancel" class="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium py-2.5 rounded-xl text-sm transition-colors">Ακύρωση</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      refreshIcons();

      const custSel = overlay.querySelector('#af-customer');
      const vehSel = overlay.querySelector('#af-vehicle');

      custSel.addEventListener('change', () => {
        const cid = custSel.value;
        const vehs = cid ? state.vehicles.filter((v) => v.customerId === cid) : [];
        vehSel.innerHTML = '<option value="">— Χωρίς συγκεκριμένο όχημα —</option>' +
          vehs.map((v) => `<option value="${v.id}">${U.escape(vehicleLabel(v))}</option>`).join('');
      });

      const closeOv = () => overlay.remove();
      overlay.querySelector('#af-close').addEventListener('click', closeOv);
      overlay.querySelector('#af-cancel').addEventListener('click', closeOv);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOv(); });

      overlay.querySelector('#af-save').addEventListener('click', async () => {
        const date = overlay.querySelector('#af-date').value;
        const time = overlay.querySelector('#af-time').value;
        const customerId = custSel.value;
        if (!date || !time || !customerId) {
          U.toast('Συμπληρώστε πελάτη, ημερομηνία και ώρα.', 'error');
          return;
        }
        const saved = {
          ...(isEdit ? { id: a.id, createdAt: a.createdAt } : {}),
          customerId,
          vehicleId: vehSel.value || null,
          date,
          time,
          type: overlay.querySelector('#af-type').value,
          status: isEdit ? overlay.querySelector('#af-status').value : 'scheduled',
          notes: overlay.querySelector('#af-notes').value.trim(),
        };
        await DB.add('appointments', saved);
        state.appointments = await DB.getAll('appointments');
        overlay.remove();
        renderAppointments();
        U.toast(isEdit ? 'Ραντεβού ενημερώθηκε' : 'Ραντεβού αποθηκεύτηκε');
      });
    }
  }

  // =========================================================
  //  STATISTICS & ANALYTICS
  // =========================================================
  async function renderStats() {
    const s = state.settings;
    const sym = { EUR: '€', USD: '$', GBP: '£' }[s.currency || 'EUR'] || '€';
    const fmt = (n) => U.fmtNum(n);

    const now = new Date();
    const thisYearStart = new Date(now.getFullYear(), 0, 1);

    // Build last 12 months array
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString('el-GR', { month: 'short' }) + (d.getFullYear() !== now.getFullYear() ? ' \'' + String(d.getFullYear()).slice(2) : ''),
        year: d.getFullYear(),
        month: d.getMonth(),
        revenue: 0,
        count: 0,
      });
    }

    state.services.forEach((sv) => {
      if (!sv.date) return;
      const d = new Date(sv.date);
      const entry = months.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
      if (entry) { entry.revenue += svcRevenue(sv); entry.count++; }
    });

    const totalRevenue12 = months.reduce((s, m) => s + m.revenue, 0);
    const activeMths = months.filter((m) => m.count > 0);
    const avgMonthRev = activeMths.length ? totalRevenue12 / activeMths.length : 0;
    const bestMonth = months.reduce((a, b) => (a.revenue > b.revenue ? a : b), months[0]);
    const thisMonthRev = months[months.length - 1].revenue;
    const thisYearRev = state.services.filter((sv) => sv.date && new Date(sv.date) >= thisYearStart).reduce((sum, sv) => sum + svcRevenue(sv), 0);

    // Service type breakdown
    const typeCounts = {};
    const typeRevenue = {};
    state.services.forEach((sv) => {
      const tp = sv.type || 'Άλλο';
      typeCounts[tp] = (typeCounts[tp] || 0) + 1;
      typeRevenue[tp] = (typeRevenue[tp] || 0) + svcRevenue(sv);
    });
    const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxTypeCount = topTypes[0]?.[1] || 1;

    // Mechanic performance
    const mechStats = {};
    state.services.forEach((sv) => {
      const m = sv.mechanic || '—';
      if (!mechStats[m]) mechStats[m] = { count: 0, revenue: 0 };
      mechStats[m].count++;
      mechStats[m].revenue += svcRevenue(sv);
    });
    const topMechanics = Object.entries(mechStats).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);

    // Customer stats
    const newCustYear = state.customers.filter((c) => c.createdAt && new Date(c.createdAt) >= thisYearStart).length;
    const statsVehicleIdsWithService = new Set(state.services.map((sv) => sv.vehicleId));
    const activeCust = state.customers.filter((c) => {
      const cvs = vehiclesForCustomer(c.id);
      return cvs.some((v) => statsVehicleIdsWithService.has(v.id));
    }).length;

    $('#view').innerHTML = `
      ${pageHeader('Στατιστικά & Αναλύσεις', { back: false })}
      <div class="max-w-5xl mx-auto p-4 pb-24 sm:pb-4 space-y-5">

        <!-- KPI row -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${[
            ['trending-up', 'Έσοδα 12 μηνών', sym + fmt(totalRevenue12), 'text-emerald-600', 'bg-emerald-100 dark:bg-emerald-900/30'],
            ['calendar', 'Τρέχων μήνας', sym + fmt(thisMonthRev), 'text-blue-600', 'bg-blue-100 dark:bg-blue-900/30'],
            ['bar-chart-2', 'Μέσος μήνας', sym + fmt(avgMonthRev), 'text-violet-600', 'bg-violet-100 dark:bg-violet-900/30'],
            ['star', 'Καλύτερος μήνας', sym + fmt(bestMonth ? bestMonth.revenue : 0), 'text-amber-600', 'bg-amber-100 dark:bg-amber-900/30'],
          ].map(([icn, lbl, val, tc, bg]) => `
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
              <div class="w-9 h-9 ${bg} ${tc} rounded-xl flex items-center justify-center mb-2">${icon(icn,'w-4 h-4')}</div>
              <div class="text-lg font-bold">${val}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">${lbl}</div>
            </div>
          `).join('')}
        </div>

        <!-- Monthly revenue chart -->
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <h2 class="font-semibold text-sm mb-4">Μηνιαία Έσοδα — τελευταίοι 12 μήνες</h2>
          <canvas id="revenue-chart" height="160"></canvas>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <!-- Top service types -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <h2 class="font-semibold text-sm mb-3">Τύποι Service</h2>
            ${topTypes.length ? `<div class="space-y-2.5">
              ${topTypes.map(([tp, cnt]) => `
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span class="font-medium truncate max-w-[65%]">${U.escape(tp)}</span>
                    <span class="text-slate-400 flex-shrink-0">${cnt}x · ${sym}${fmt(typeRevenue[tp] || 0)}</span>
                  </div>
                  <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                    <div class="bg-blue-500 h-1.5 rounded-full" style="width:${Math.round((cnt/maxTypeCount)*100)}%"></div>
                  </div>
                </div>`).join('')}
            </div>` : `<p class="text-sm text-slate-400 text-center py-6">Δεν υπάρχουν δεδομένα</p>`}
          </div>

          <!-- Mechanic performance -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <h2 class="font-semibold text-sm mb-3">Μηχανικοί</h2>
            ${topMechanics.length ? `<div class="space-y-3">
              ${topMechanics.map(([name, stat]) => `
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                    ${U.escape((name === '—' ? '?' : name).slice(0,2).toUpperCase())}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium truncate">${U.escape(name)}</div>
                    <div class="text-xs text-slate-400">${stat.count} service · ${sym}${fmt(stat.revenue)}</div>
                  </div>
                </div>`).join('')}
            </div>` : `<p class="text-sm text-slate-400 text-center py-6">Δεν υπάρχουν δεδομένα</p>`}
          </div>

        </div>

        <!-- Customer overview -->
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <h2 class="font-semibold text-sm mb-3">Ανάλυση Πελατών</h2>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${[
              ['Σύνολο πελατών', state.customers.length],
              ['Ενεργοί (με service)', activeCust],
              ['Νέοι φέτος', newCustYear],
              ['Σύνολο οχημάτων', state.vehicles.length],
            ].map(([lbl, val]) => `
              <div class="text-center p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                <div class="text-2xl font-bold">${val}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${lbl}</div>
              </div>`).join('')}
          </div>
        </div>

        <!-- CTA to marketing -->
        <a href="#/marketing" class="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-2xl text-center flex items-center justify-center gap-2 transition-colors">
          ${icon('megaphone','w-5 h-5')} Αποστολή μηνυμάτων σε πελάτες
        </a>

      </div>
    `;
    refreshIcons();

    requestAnimationFrame(() => {
      const canvas = document.getElementById('revenue-chart');
      if (!canvas || !window.Chart) return;
      const isDark = document.documentElement.classList.contains('dark');
      const gridColor = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.2)';
      const labelColor = isDark ? '#94a3b8' : '#64748b';
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: months.map((m) => m.label),
          datasets: [{
            data: months.map((m) => Math.round(m.revenue)),
            backgroundColor: months.map((_, i) => i === months.length - 1 ? 'rgba(99,102,241,0.85)' : 'rgba(59,130,246,0.65)'),
            borderRadius: 5,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => sym + U.fmtNum(ctx.raw) } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: labelColor, font: { size: 10 } } },
            y: {
              grid: { color: gridColor },
              ticks: { color: labelColor, font: { size: 10 }, callback: (v) => sym + U.fmtNum(v) },
              beginAtZero: true,
            },
          },
        },
      });
    });
  }

  // =========================================================
  //  MARKETING & BULK MESSAGING
  // =========================================================
  async function renderMarketing() {
    const s = state.settings;

    const now = new Date();
    const cutoff90 = new Date(now); cutoff90.setDate(cutoff90.getDate() - 90);

    const customerData = state.customers.map((c) => {
      const cvehicles = vehiclesForCustomer(c.id);
      const cSvcs = state.services.filter((sv) => cvehicles.some((v) => v.id === sv.vehicleId));
      const lastSvcDate = cSvcs.length ? new Date(Math.max(...cSvcs.map((sv) => new Date(sv.date)))) : null;
      const overdueVs = cvehicles.filter((v) => {
        const r = U.reminderStatus(v, servicesForVehicle(v.id), s);
        return r.status === 'overdue' || r.status === 'upcoming';
      });
      return {
        c,
        vehicles: cvehicles,
        lastSvcDate,
        isInactive: !lastSvcDate || lastSvcDate < cutoff90,
        needsService: overdueVs.length > 0,
      };
    });

    const TEMPLATES = [
      {
        id: 'pickup_ready',
        label: 'Παραλαβή οχήματος',
        icon: 'check-circle',
        color: 'text-emerald-600',
        bg: 'bg-emerald-100 dark:bg-emerald-900/20',
        text(c, v) {
          return [
            `Αγαπητέ/ή ${c.name},`,
            ``,
            `Το όχημά σας${v ? ' ' + [v.brand, v.model].filter(Boolean).join(' ') + (v.plate ? ' (' + v.plate.toUpperCase() + ')' : '') : ''} είναι έτοιμο για παραλαβή! 🔧`,
            ``,
            `Είμαστε στη διάθεσή σας για οποιαδήποτε απορία.`,
            ``,
            [s.workshopName, s.workshopPhone].filter(Boolean).join('\n'),
          ].join('\n').trim();
        },
      },
      {
        id: 'service_reminder',
        label: 'Υπενθύμιση service',
        icon: 'bell',
        color: 'text-amber-600',
        bg: 'bg-amber-100 dark:bg-amber-900/20',
        text(c, v) {
          return [
            `Αγαπητέ/ή ${c.name},`,
            ``,
            `Σας υπενθυμίζουμε ότι${v ? ' το ' + [v.brand, v.model].filter(Boolean).join(' ') + (v.plate ? ' (' + v.plate.toUpperCase() + ')' : '') : ' το όχημά σας'} χρειάζεται service! 🛠️`,
            ``,
            `Επικοινωνήστε μαζί μας για ραντεβού.`,
            ``,
            [s.workshopName, s.workshopPhone].filter(Boolean).join('\n'),
          ].join('\n').trim();
        },
      },
      {
        id: 'promo',
        label: 'Προωθητική προσφορά',
        icon: 'tag',
        color: 'text-blue-600',
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        text(c, v) {
          return [
            `Αγαπητέ/ή ${c.name},`,
            ``,
            `Σας ενημερώνουμε για την τρέχουσα προσφορά μας! 🎉`,
            ``,
            `[ΓΡΑΨΤΕ ΤΗΝ ΠΡΟΣΦΟΡΑ ΣΑΣ ΕΔΩ]`,
            ``,
            `Επικοινωνήστε μαζί μας για περισσότερες πληροφορίες.`,
            ``,
            [s.workshopName, s.workshopPhone].filter(Boolean).join('\n'),
          ].join('\n').trim();
        },
      },
      {
        id: 'seasonal',
        label: 'Εποχιακός έλεγχος',
        icon: 'sun',
        color: 'text-orange-600',
        bg: 'bg-orange-100 dark:bg-orange-900/20',
        text(c, v) {
          return [
            `Αγαπητέ/ή ${c.name},`,
            ``,
            `Η εποχή αλλάζει! Φροντίστε${v ? ' το ' + [v.brand, v.model].filter(Boolean).join(' ') : ' το όχημά σας'} έγκαιρα:`,
            `• Έλεγχος αντιψυκτικού`,
            `• Ελαστικά εποχής`,
            `• Μπαταρία & φώτα`,
            ``,
            `Καλέστε μας για ραντεβού.`,
            ``,
            [s.workshopName, s.workshopPhone].filter(Boolean).join('\n'),
          ].join('\n').trim();
        },
      },
      {
        id: 'kteo_reminder',
        label: 'Υπενθύμιση ΚΤΕΟ',
        icon: 'shield-check',
        color: 'text-blue-600',
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        text(c, v) {
          return [
            `Αγαπητέ/ή ${c.name},`,
            ``,
            `Σας ενημερώνουμε ότι πλησιάζει η ημερομηνία ΚΤΕΟ${v ? ' για το ' + [v.brand, v.model].filter(Boolean).join(' ') + (v.plate ? ' (' + v.plate.toUpperCase() + ')' : '') : ' του οχήματός σας'}.`,
            ``,
            `Συστήνουμε έλεγχο πριν την επίσκεψη στο ΚΤΕΟ για επιτυχή διέλευση.`,
            ``,
            `Καλέστε μας για ραντεβού.`,
            ``,
            [s.workshopName, s.workshopPhone].filter(Boolean).join('\n'),
          ].join('\n').trim();
        },
      },
      {
        id: 'emissions_reminder',
        label: 'Κάρτα Καυσαερίων',
        icon: 'wind',
        color: 'text-cyan-600',
        bg: 'bg-cyan-100 dark:bg-cyan-900/20',
        text(c, v) {
          return [
            `Αγαπητέ/ή ${c.name},`,
            ``,
            `Σας ενημερώνουμε ότι λήγει η κάρτα καυσαερίων${v ? ' για το ' + [v.brand, v.model].filter(Boolean).join(' ') + (v.plate ? ' (' + v.plate.toUpperCase() + ')' : '') : ' του οχήματός σας'}.`,
            ``,
            `Η κάρτα καυσαερίων ανανεώνεται ετησίως. Επικοινωνήστε μαζί μας.`,
            ``,
            [s.workshopName, s.workshopPhone].filter(Boolean).join('\n'),
          ].join('\n').trim();
        },
      },
    ];

    const kteoNear = customerData.filter((cd) => cd.vehicles.some((v) => { const st = kteoStatus(v); return st && st.daysLeft <= 60; }));
    const emissionsNear = customerData.filter((cd) => cd.vehicles.some((v) => { const st = emissionsStatus(v); return st && st.daysLeft <= 60; }));

    const FILTERS = [
      { id: 'all',          label: 'Όλοι',                   count: customerData.length },
      { id: 'needs_service',label: 'Χρειάζονται service',    count: customerData.filter((cd) => cd.needsService).length },
      { id: 'inactive',     label: 'Ανενεργοί (3+ μήνες)',   count: customerData.filter((cd) => cd.isInactive && cd.vehicles.length > 0).length },
      { id: 'kteo_near',    label: 'ΚΤΕΟ λήγει',             count: kteoNear.length },
      { id: 'emissions_near', label: 'Καυσαέρια λήγουν',     count: emissionsNear.length },
    ];

    let activeFilter = 'all';
    let activeTpl = TEMPLATES[1];
    const selectedIds = new Set();

    function getFiltered() {
      return customerData.filter((cd) => {
        if (activeFilter === 'needs_service') return cd.needsService;
        if (activeFilter === 'inactive') return cd.isInactive && cd.vehicles.length > 0;
        if (activeFilter === 'kteo_near') return cd.vehicles.some((v) => { const st = kteoStatus(v); return st && st.daysLeft <= 60; });
        if (activeFilter === 'emissions_near') return cd.vehicles.some((v) => { const st = emissionsStatus(v); return st && st.daysLeft <= 60; });
        return true;
      });
    }

    function tplDefaultText(tpl) {
      return tpl.text({ name: '{όνομα}' }, null);
    }

    function buildMsg(cd) {
      const editor = document.getElementById('mkt-msg-editor');
      const raw = editor?.value?.trim() ? editor.value : activeTpl.text(cd.c, cd.vehicles[0] || null);
      const v = cd.vehicles[0];
      const vehicleStr = v ? [v.brand, v.model].filter(Boolean).join(' ') + (v.plate ? ' (' + v.plate.toUpperCase() + ')' : '') : 'το όχημά σας';
      return raw
        .replace(/\{όνομα\}/g, cd.c.name || 'πελάτη')
        .replace(/\{όχημα\}/g, vehicleStr);
    }

    $('#view').innerHTML = `
      ${pageHeader('Marketing & Ενημερώσεις', { back: false })}
      <div class="max-w-3xl mx-auto p-4 pb-28 sm:pb-8 space-y-4">

        <div class="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-5 text-white">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">${icon('megaphone','w-6 h-6')}</div>
            <div>
              <div class="font-bold">Μαζική Αποστολή Μηνυμάτων</div>
              <div class="text-blue-200 text-sm">${state.customers.length} πελάτες στο αρχείο</div>
            </div>
          </div>
          <p class="text-sm text-blue-100 leading-relaxed">Επιλέξτε πελάτες, πρότυπο μηνύματος και στείλτε με WhatsApp ή αντιγράψτε για μαζική αποστολή.</p>
        </div>

        <!-- Template selector -->
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <h2 class="font-semibold text-sm mb-3">Πρότυπο Μηνύματος</h2>
          <div class="grid grid-cols-2 gap-2" id="tpl-grid">
            ${TEMPLATES.map((tpl) => `
              <button data-tpl="${tpl.id}" class="tpl-btn flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${tpl.id === activeTpl.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}">
                <div class="${tpl.bg} ${tpl.color} w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">${icon(tpl.icon,'w-4 h-4')}</div>
                <span class="text-xs font-medium">${U.escape(tpl.label)}</span>
              </button>`).join('')}
          </div>
        </div>

        <!-- Message editor -->
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <div class="flex items-center justify-between mb-2">
            <h2 class="font-semibold text-sm flex items-center gap-1.5">${icon('edit-3','w-4 h-4 text-slate-400')} Κείμενο μηνύματος</h2>
            <button id="msg-reset" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">${icon('rotate-ccw','w-3 h-3')} Επαναφορά</button>
          </div>
          <textarea id="mkt-msg-editor" rows="7"
            class="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y leading-relaxed font-mono"
            placeholder="Γράψτε το μήνυμά σας εδώ…"></textarea>
          <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Χρησιμοποιήστε <code class="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">{όνομα}</code> και
            <code class="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">{όχημα}</code> — αντικαθίστανται αυτόματα για κάθε πελάτη.
          </p>
        </div>

        <!-- Customer list -->
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">

          <!-- Filter tabs -->
          <div class="flex overflow-x-auto border-b border-slate-200 dark:border-slate-700" id="mkt-filter-tabs">
            ${FILTERS.map((f) => `
              <button data-filter="${f.id}" class="mkt-tab flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors ${f.id === activeFilter ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/40 dark:bg-indigo-900/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}">
                ${U.escape(f.label)} <span class="opacity-60 text-xs">(${f.count})</span>
              </button>`).join('')}
          </div>

          <div id="mkt-customer-list" class="divide-y divide-slate-100 dark:divide-slate-700 max-h-[45vh] overflow-y-auto"></div>

          <!-- Bottom action bar -->
          <div class="p-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <label class="flex items-center gap-2 text-sm cursor-pointer flex-shrink-0">
              <input type="checkbox" id="mkt-select-all" class="w-4 h-4 rounded accent-indigo-600" />
              <span class="text-slate-600 dark:text-slate-400 text-xs">Όλοι (<span id="mkt-sel-count">0</span>)</span>
            </label>
            <button id="mkt-send-btn" disabled class="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
              <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.529 5.843L0 24l6.306-1.505A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.655-.493-5.193-1.357l-.371-.22-3.747.895.93-3.65-.24-.385A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              <span id="mkt-send-label">Αποστολή</span>
            </button>
          </div>
        </div>

      </div>
    `;
    refreshIcons();

    function renderList() {
      const filtered = getFiltered();
      const list = $('#mkt-customer-list');
      if (!filtered.length) {
        list.innerHTML = `<div class="text-center py-10 text-sm text-slate-400">Δεν υπάρχουν πελάτες σε αυτή την κατηγορία</div>`;
        updateBar();
        return;
      }
      list.innerHTML = filtered.map((cd) => {
        const v = cd.vehicles[0];
        return `
          <label class="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer">
            <input type="checkbox" data-cid="${cd.c.id}" class="mkt-chk w-4 h-4 rounded accent-indigo-600 flex-shrink-0" ${selectedIds.has(cd.c.id) ? 'checked' : ''} />
            <div class="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-semibold text-sm flex-shrink-0">
              ${U.escape((cd.c.name || '?').slice(0,1).toUpperCase())}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">${U.escape(cd.c.name)}</div>
              <div class="text-xs text-slate-400 truncate">${cd.c.phone ? U.escape(cd.c.phone) : '—'}${v ? ' · ' + U.escape([v.brand, v.model].filter(Boolean).join(' ')) : ''}</div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              ${cd.needsService ? `<span class="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">service</span>` : ''}
              ${!cd.c.phone ? `<span class="text-xs text-red-400">χωρίς τηλ.</span>` : ''}
            </div>
          </label>`;
      }).join('');
      $$('.mkt-chk').forEach((chk) => {
        chk.addEventListener('change', () => {
          if (chk.checked) selectedIds.add(chk.dataset.cid);
          else selectedIds.delete(chk.dataset.cid);
          updateBar();
        });
      });
      updateBar();
    }

    function updateBar() {
      const n = selectedIds.size;
      const el = $('#mkt-sel-count');
      if (el) el.textContent = n;
      const lbl = $('#mkt-send-label');
      if (lbl) lbl.textContent = n > 0 ? `Αποστολή (${n})` : 'Αποστολή';
      const btn = $('#mkt-send-btn');
      if (btn) btn.disabled = n === 0;
      const allChk = $('#mkt-select-all');
      if (allChk) {
        const filtered = getFiltered();
        allChk.checked = filtered.length > 0 && filtered.every((cd) => selectedIds.has(cd.c.id));
        allChk.indeterminate = !allChk.checked && n > 0;
      }
    }

    // Fill editor with initial template
    const editor = document.getElementById('mkt-msg-editor');
    if (editor) editor.value = tplDefaultText(activeTpl);

    // Reset button
    document.getElementById('msg-reset')?.addEventListener('click', () => {
      if (editor) editor.value = tplDefaultText(activeTpl);
    });

    renderList();

    $$('.mkt-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        activeFilter = tab.dataset.filter;
        selectedIds.clear();
        $$('.mkt-tab').forEach((t) => {
          const on = t.dataset.filter === activeFilter;
          t.className = `mkt-tab flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors ${on ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/40 dark:bg-indigo-900/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`;
        });
        renderList();
      });
    });

    $$('.tpl-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTpl = TEMPLATES.find((t) => t.id === btn.dataset.tpl) || TEMPLATES[0];
        $$('.tpl-btn').forEach((b) => {
          const on = b.dataset.tpl === activeTpl.id;
          b.className = `tpl-btn flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${on ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`;
        });
        const ed = document.getElementById('mkt-msg-editor');
        if (ed) ed.value = tplDefaultText(activeTpl);
      });
    });

    $('#mkt-select-all').addEventListener('change', (e) => {
      const filtered = getFiltered();
      if (e.target.checked) filtered.forEach((cd) => selectedIds.add(cd.c.id));
      else selectedIds.clear();
      renderList();
    });

    $('#mkt-send-btn').addEventListener('click', () => {
      const toSend = customerData.filter((cd) => selectedIds.has(cd.c.id) && cd.c.phone);
      const noPhone = customerData.filter((cd) => selectedIds.has(cd.c.id) && !cd.c.phone);

      if (!toSend.length) { U.toast('Οι επιλεγμένοι πελάτες δεν έχουν τηλέφωνο', 'error'); return; }

      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4';
      overlay.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
          <div class="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
            <div>
              <div class="font-bold">Αποστολή μηνυμάτων</div>
              <div class="text-xs text-slate-500">${toSend.length} πελάτες με τηλέφωνο${noPhone.length ? ' · ' + noPhone.length + ' χωρίς' : ''} · ${U.escape(activeTpl.label)}</div>
            </div>
            <button id="bulk-dlg-close" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0">${icon('x','w-5 h-5')}</button>
          </div>
          <div class="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-700">
            ${toSend.map((cd) => {
              const phone = (cd.c.phone || '').replace(/\D/g, '');
              const waPhone = phone.startsWith('0') ? '30' + phone.slice(1) : phone.startsWith('30') ? phone : '30' + phone;
              const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(buildMsg(cd))}`;
              return `
                <div class="p-3 flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    ${U.escape((cd.c.name || '?').slice(0,1).toUpperCase())}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm truncate">${U.escape(cd.c.name)}</div>
                    <div class="text-xs text-slate-400">${U.escape(cd.c.phone || '')}</div>
                  </div>
                  <a href="${waLink}" target="_blank" class="flex-shrink-0 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
                    WhatsApp
                  </a>
                </div>`;
            }).join('')}
            ${noPhone.map((cd) => `
              <div class="p-3 flex items-center gap-3 opacity-50">
                <div class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  ${U.escape((cd.c.name || '?').slice(0,1).toUpperCase())}
                </div>
                <div class="flex-1 min-w-0 text-sm">${U.escape(cd.c.name)}</div>
                <span class="text-xs text-red-400">χωρίς τηλέφωνο</span>
              </div>`).join('')}
          </div>
          <div class="p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
            <button id="bulk-copy-all" class="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-medium py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
              ${icon('copy','w-4 h-4')} Αντιγραφή όλων των μηνυμάτων
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      refreshIcons();

      overlay.querySelector('#bulk-dlg-close').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
      overlay.querySelector('#bulk-copy-all').addEventListener('click', () => {
        const all = toSend.map((cd) => `=== ${cd.c.name} (${cd.c.phone || '—'}) ===\n${buildMsg(cd)}`).join('\n\n---\n\n');
        U.share(all, 'Μηνύματα Marketing');
      });
    });
  }

  // =========================================================
  //  LICENSE / SUBSCRIPTION CHECK
  // =========================================================
  function showActivationScreen() {
    const el = document.createElement('div');
    el.id = 'activation-screen';
    el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0f172a;display:flex;align-items:center;justify-content:center;padding:1.5rem;';
    el.innerHTML = `
      <div style="background:#1e293b;border-radius:1rem;padding:2rem;width:100%;max-width:360px;text-align:center;border:1px solid #334155;">
        <img src="icon-192.png" style="width:72px;height:72px;border-radius:1rem;margin:0 auto 1rem;" />
        <div style="color:white;font-size:1.25rem;font-weight:700;margin-bottom:0.5rem">Καλώς ήρθατε στο GearLog</div>
        <div style="color:#94a3b8;font-size:0.8125rem;margin-bottom:1.5rem;line-height:1.6">Εισάγετε τον κωδικό ενεργοποίησης που σας έδωσε ο πάροχος για να ξεκινήσετε.</div>
        <input id="act-code" type="text" placeholder="π.χ. GL-A3B7-X9K2"
          style="width:100%;box-sizing:border-box;background:#0f172a;border:1.5px solid #475569;border-radius:0.5rem;color:white;padding:0.75rem 1rem;font-size:1rem;font-family:monospace;text-transform:uppercase;letter-spacing:0.05em;text-align:center;outline:none;margin-bottom:0.5rem;"
          oninput="this.value=this.value.toUpperCase()" />
        <div id="act-err" style="color:#f87171;font-size:0.8125rem;min-height:1.2rem;margin-bottom:0.75rem;"></div>
        <button id="act-submit" style="width:100%;background:#1d4ed8;color:white;padding:0.75rem;border-radius:0.5rem;border:none;font-size:0.9375rem;font-weight:600;cursor:pointer;margin-bottom:0.625rem;">
          Ενεργοποίηση
        </button>
        <button id="act-demo" style="width:100%;background:transparent;color:#94a3b8;border:1px solid #334155;padding:0.625rem;border-radius:0.5rem;font-size:0.8125rem;cursor:pointer;">
          Δοκιμάστε το Demo
        </button>
      </div>
    `;
    document.body.appendChild(el);

    const codeInput = el.querySelector('#act-code');
    const errEl = el.querySelector('#act-err');
    const submitBtn = el.querySelector('#act-submit');
    const demoBtn = el.querySelector('#act-demo');

    async function tryActivate() {
      const code = (codeInput.value || '').trim().toUpperCase();
      if (!code) { errEl.textContent = 'Εισάγετε τον κωδικό ενεργοποίησης.'; return; }
      submitBtn.disabled = true;
      submitBtn.textContent = '…';
      errEl.textContent = '';
      try {
        const resp = await fetch(`/api/license-check?workshopId=${encodeURIComponent(code)}`);
        const data = await resp.json();
        if (!data.registered) {
          errEl.textContent = 'Ο κωδικός δεν βρέθηκε. Ελέγξτε και δοκιμάστε ξανά.';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Ενεργοποίηση';
          return;
        }
        if (data.active === false) {
          errEl.textContent = 'Ο λογαριασμός αυτός έχει ανασταλεί. Επικοινωνήστε με τον πάροχο.';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Ενεργοποίηση';
          return;
        }
        await DB.setSetting('workshopId', code);
        state.settings.workshopId = code;
        if (data.superadmin) {
          await DB.setSetting('workshopMode', 'admin');
          localStorage.setItem(LIC_CACHE_KEY, JSON.stringify({ ts: Date.now(), active: true, data: { active: true, registered: true } }));
          el.remove();
          updateSANavLink(true);
          location.hash = '#/superadmin';
        } else {
          await DB.setSetting('workshopMode', 'licensed');
          localStorage.setItem(LIC_CACHE_KEY, JSON.stringify({ ts: Date.now(), active: true, data }));
          el.remove();
          applyLicenseStatus(data);
        }
      } catch (_) {
        errEl.textContent = 'Σφάλμα σύνδεσης. Ελέγξτε το internet σας.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ενεργοποίηση';
      }
    }

    submitBtn.addEventListener('click', tryActivate);
    codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryActivate(); });
    demoBtn.addEventListener('click', async () => {
      // Defense in depth: this screen shouldn't be reachable while already licensed (the
      // /activate route redirects away), but guard the destructive action itself too.
      if (state.settings.workshopId && state.settings.workshopMode !== 'demo') {
        if (!confirm('Έχετε ήδη ενεργοποιημένο λογαριασμό. Η εκκίνηση demo θα αντικαταστήσει την πρόσβαση στα δεδομένα σας. Συνέχεια;')) return;
      }
      demoBtn.disabled = true;
      demoBtn.textContent = 'Φόρτωση demo…';
      const localId = 'ws_demo_' + Date.now().toString(36);
      await DB.setSetting('workshopId', localId);
      await DB.setSetting('workshopMode', 'demo');
      state.settings.workshopId = localId;
      state.settings.workshopMode = 'demo';
      await seedDemoData();
      await loadAll();
      el.remove();
      showDemoBanner();
      router();
    });
  }

  function showDemoBanner() {
    if (document.getElementById('demo-banner')) return;
    const el = document.createElement('div');
    el.id = 'demo-banner';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9990;background:#1e3a5f;border-bottom:2px solid #3b82f6;padding:0.5rem 1rem;display:flex;align-items:center;gap:0.75rem;';
    el.innerHTML = `
      <span style="font-size:1rem;flex-shrink:0">🔍</span>
      <span style="flex:1;font-size:0.8rem;color:#93c5fd;">Λειτουργία Demo — 3 δωρεάν καταχωρήσεις. <a href="#/contact" style="color:#60a5fa;text-decoration:underline;font-weight:600;">Ενεργοποίηση</a> για απεριόριστη χρήση.</span>
    `;
    document.body.appendChild(el);
  }

  async function seedDemoData() {
    const t0 = new Date();
    function ago(days) {
      const d = new Date(t0);
      d.setDate(d.getDate() - days);
      return d.toISOString().slice(0, 10);
    }

    await DB.setSetting('workshopName', 'Συνεργείο Παπαδόπουλος');
    await DB.setSetting('workshopPhone', '210 1234567');
    await DB.setSetting('workshopAddress', 'Λεωφ. Κηφισίας 45, Αθήνα');
    await DB.setSetting('laborRate', 40);
    await DB.setSetting('intervalKm', 10000);
    await DB.setSetting('intervalMonths', 12);
    await DB.setSetting('workshopVehicleTypes', 'car,moto');
    await DB.setSetting('workshopMechanics', JSON.stringify(['Νίκος', 'Κώστας']));

    const customers = [
      { id: 'demo-c1', name: 'Γεώργιος Παπαδόπουλος', phone: '6901234567', email: 'g.papadopoulos@email.gr' },
      { id: 'demo-c2', name: 'Μαρία Αντωνίου', phone: '6912345678', email: 'm.antoniou@email.gr' },
      { id: 'demo-c3', name: 'Νικόλαος Κωνσταντίνου', phone: '6923456789' },
      { id: 'demo-c4', name: 'Ελένη Σταθοπούλου', phone: '6934567890', email: 'e.stathopoulou@email.gr' },
      { id: 'demo-c5', name: 'Κωνσταντίνος Δημητρίου', phone: '6945678901' },
    ];

    const vehicles = [
      { id: 'demo-v1', customerId: 'demo-c1', brand: 'Toyota', model: 'Yaris', year: '2019', plate: 'ΑΑΑ-1234', fuel: 'petrol', type: 'car', engine: '1000', color: 'Λευκό', mileage: 52000 },
      { id: 'demo-v2', customerId: 'demo-c1', brand: 'Volkswagen', model: 'Golf', year: '2017', plate: 'ΒΒΒ-2345', fuel: 'diesel', type: 'car', engine: '1600', color: 'Γκρι', mileage: 98000 },
      { id: 'demo-v3', customerId: 'demo-c2', brand: 'Hyundai', model: 'Tucson', year: '2021', plate: 'ΓΓΓ-3456', fuel: 'petrol', type: 'car', engine: '1600', color: 'Ασημί', mileage: 35000 },
      { id: 'demo-v4', customerId: 'demo-c3', brand: 'Skoda', model: 'Octavia', year: '2019', plate: 'ΔΔΔ-4567', fuel: 'petrol', type: 'car', engine: '1400', color: 'Ασημί', mileage: 55000 },
      { id: 'demo-v5', customerId: 'demo-c4', brand: 'Renault', model: 'Clio', year: '2018', plate: 'ΕΕΕ-5678', fuel: 'petrol', type: 'car', engine: '900', color: 'Κόκκινο', mileage: 67000 },
      { id: 'demo-v6', customerId: 'demo-c5', brand: 'Ford', model: 'Focus', year: '2016', plate: 'ΖΖΖ-6789', fuel: 'diesel', type: 'car', engine: '1600', color: 'Μπλε', mileage: 115000 },
      { id: 'demo-v7', customerId: 'demo-c4', brand: 'Honda', model: 'CB500F', year: '2020', plate: 'ΗΗΗ-7890', fuel: 'petrol', type: 'moto', engine: '471', color: 'Κόκκινο', mileage: 18000 },
    ];

    const services = [
      { id: 'demo-s1',  vehicleId: 'demo-v1', date: ago(320), mileage: 42000, type: 'Αλλαγή λαδιού', description: 'Αλλαγή λαδιού 5W-30 & φίλτρου λαδιού. Τακτικός έλεγχος υγρών.', cost: 85,  mechanic: 'Νίκος',  nextServiceDate: ago(45),   nextServiceMileage: 52000 },
      { id: 'demo-s2',  vehicleId: 'demo-v1', date: ago(200), mileage: 46500, type: 'Service 46.000 km', description: 'Λάδι 5W-30, φίλτρα αέρα / καυσίμου / cabin, μπουζί NGK.', cost: 215, mechanic: 'Νίκος',  nextServiceDate: ago(-145), nextServiceMileage: 56500 },
      { id: 'demo-s3',  vehicleId: 'demo-v1', date: ago(40),  mileage: 51200, type: 'Αλλαγή λαδιού', description: 'Λάδι 0W-20 FS, φίλτρο λαδιού, αντιψυκτικό TOP-UP.', cost: 95,  mechanic: 'Κώστας', nextServiceDate: ago(-325), nextServiceMileage: 61200 },
      { id: 'demo-s4',  vehicleId: 'demo-v2', date: ago(280), mileage: 88000, type: 'Αλλαγή λαδιού', description: 'Λάδι 5W-40 diesel & φίλτρο λαδιού. Έλεγχος τακακιών.', cost: 95,  mechanic: 'Κώστας', nextServiceDate: ago(75),   nextServiceMileage: 98000 },
      { id: 'demo-s5',  vehicleId: 'demo-v2', date: ago(115), mileage: 93500, type: 'Φρένα', description: 'Τακάκια εμπρός/πίσω Brembo, δίσκοι εμπρός, υγρό φρένων Dot4.', cost: 380, mechanic: 'Νίκος',  nextServiceDate: ago(-250), nextServiceMileage: 103500 },
      { id: 'demo-s6',  vehicleId: 'demo-v2', date: ago(18),  mileage: 97200, type: 'Full Service', description: 'Λάδι 5W-40, φίλτρα αέρα/καυσίμου/cabin/λαδιού, ζώνη poly-V.', cost: 290, mechanic: 'Νίκος',  nextServiceDate: ago(-347), nextServiceMileage: 107200 },
      { id: 'demo-s7',  vehicleId: 'demo-v3', date: ago(175), mileage: 28000, type: 'Αλλαγή λαδιού', description: 'Λάδι 5W-30 FS & φίλτρο. Έλεγχος φωτεινής σήμανσης.', cost: 90,  mechanic: 'Κώστας', nextServiceDate: ago(10),   nextServiceMileage: 38000 },
      { id: 'demo-s8',  vehicleId: 'demo-v3', date: ago(55),  mileage: 33000, type: 'Service', description: 'Φίλτρο αέρα, cabin filter, πλακέτες εμπρός, αέρας ελαστικών.', cost: 145, mechanic: 'Νίκος',  nextServiceDate: ago(-295), nextServiceMileage: 43000 },
      { id: 'demo-s9',  vehicleId: 'demo-v4', date: ago(245), mileage: 45000, type: 'Αλλαγή λαδιού', description: 'Λάδι 5W-30 Longlife FS, φίλτρο λαδιού, έλεγχος υγρών & φωτεινών.', cost: 95,  mechanic: 'Νίκος',  nextServiceDate: ago(20),   nextServiceMileage: 55000 },
      { id: 'demo-s10', vehicleId: 'demo-v4', date: ago(55),  mileage: 53500, type: 'Full Service', description: 'Λάδι 5W-30 FS, φίλτρα αέρα/cabin/καυσίμου/λαδιού, μπουζί NGK, έλεγχος ανάρτησης.', cost: 280, mechanic: 'Νίκος',  nextServiceDate: ago(-310), nextServiceMileage: 63500 },
      { id: 'demo-s11', vehicleId: 'demo-v5', date: ago(295), mileage: 59000, type: 'Αλλαγή λαδιού', description: 'Λάδι 5W-40 & φίλτρο λαδιού Renault OE.', cost: 80,  mechanic: 'Κώστας', nextServiceDate: ago(70),   nextServiceMileage: 69000 },
      { id: 'demo-s12', vehicleId: 'demo-v5', date: ago(135), mileage: 63000, type: 'Χρονισμός', description: 'Ιμάντας χρονισμού, τεντωτήρας, τροχαλία, αντλία νερού Continental.', cost: 520, mechanic: 'Νίκος',  nextServiceDate: ago(-230), nextServiceMileage: 93000 },
      { id: 'demo-s13', vehicleId: 'demo-v5', date: ago(10),  mileage: 67000, type: 'Αλλαγή λαδιού', description: 'Λάδι 5W-40, φίλτρο λαδιού, cabin filter, αντιψυκτικό.', cost: 105, mechanic: 'Κώστας', nextServiceDate: ago(-355), nextServiceMileage: 77000 },
      { id: 'demo-s14', vehicleId: 'demo-v6', date: ago(265), mileage: 108000, type: 'Full Service', description: 'Λάδι 5W-30 C3, φίλτρα αέρα/καυσίμου/λαδιού, ζώνη Bosch.', cost: 200, mechanic: 'Κώστας', nextServiceDate: ago(100),  nextServiceMileage: 118000 },
      { id: 'demo-s15', vehicleId: 'demo-v6', date: ago(45),  mileage: 113000, type: 'Αλλαγή λαδιού', description: 'Λάδι 5W-30 C3 & φίλτρο λαδιού Mahle.', cost: 98,  mechanic: 'Νίκος',  nextServiceDate: ago(-320), nextServiceMileage: 123000 },
      { id: 'demo-s16', vehicleId: 'demo-v7', date: ago(200), mileage: 14000, type: 'Service μοτοσυκλέτας', description: 'Λάδι 10W-40, φίλτρο λαδιού, αλυσίδα/γράνα, βαλβίδες.', cost: 125, mechanic: 'Νίκος',  nextServiceDate: ago(-165), nextServiceMileage: 20000 },
      { id: 'demo-s17', vehicleId: 'demo-v7', date: ago(50),  mileage: 17500, type: 'Service μοτοσυκλέτας', description: 'Λάδι, φίλτρο αέρα, μπουζί NGK Iridium, ρύθμιση αλυσίδας.', cost: 95,  mechanic: 'Κώστας', nextServiceDate: ago(-315), nextServiceMileage: 24000 },
    ];

    const jobOrders = [
      { id: 'demo-j1', vehicleId: 'demo-v1', status: 'in_progress', date: ago(2),  tasks: ['oil_change','oil_filter','air_filter','cabin_filter'], description: 'Τακτικό service 52.000 km', estimatedCost: 160, mechanic: 'Νίκος' },
      { id: 'demo-j2', vehicleId: 'demo-v4', status: 'pending',     date: ago(1),  tasks: ['brake_pads_front','brake_discs_front','brake_fluid'],    description: 'Τριγμός φρένων εμπρός — αντικατάσταση τακακιών & δίσκων Skoda', estimatedCost: 240, mechanic: 'Κώστας' },
      { id: 'demo-j3', vehicleId: 'demo-v6', status: 'completed',   date: ago(9), completedDate: ago(7), tasks: ['oil_change','oil_filter','fuel_filter','air_filter'], description: 'Full service diesel', estimatedCost: 200, actualCost: 200, mechanic: 'Νίκος' },
    ];

    for (const c of customers) await DB.add('customers', c);
    for (const v of vehicles)   await DB.add('vehicles', v);
    for (const s of services)   await DB.add('services', s);
    for (const j of jobOrders)  await DB.add('job_orders', j);
  }

  function updateSANavLink(show) {
    const link = document.getElementById('sa-nav-link');
    if (!link) return;
    link.classList.toggle('hidden', !show);
    link.classList.toggle('flex', show);
    if (show && window.lucide) lucide.createIcons();
  }

  function renderContact() {
    $('#view').innerHTML = `
      <div class="min-h-screen flex items-center justify-center px-4 py-12 pb-28 sm:pb-12">
        <div class="w-full max-w-sm space-y-6">

          <div class="text-center">
            <div class="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              ${icon('phone-call','w-8 h-8 text-white')}
            </div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Ενεργοποίηση GearLog</h1>
            <p class="text-slate-500 dark:text-slate-400 text-sm mt-2">Επικοινωνήστε μαζί μας για να ξεκινήσετε τη συνδρομή σας και να λάβετε τον κωδικό ενεργοποίησης.</p>
          </div>

          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 shadow-sm overflow-hidden">
            <div class="p-4 flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                ${icon('user','w-5 h-5')}
              </div>
              <div>
                <div class="text-xs text-slate-400 dark:text-slate-500">Πάροχος</div>
                <div class="font-semibold text-slate-900 dark:text-white text-sm">Αλέξανδρος Χατζηθεοδώρου</div>
              </div>
            </div>
            <a href="mailto:al.chatzitheodorou@gmail.com" class="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                ${icon('mail','w-5 h-5')}
              </div>
              <div>
                <div class="text-xs text-slate-400 dark:text-slate-500">Email</div>
                <div class="font-medium text-blue-600 dark:text-blue-400 text-sm">al.chatzitheodorou@gmail.com</div>
              </div>
              ${icon('chevron-right','w-4 h-4 text-slate-400 ml-auto')}
            </a>
            <a href="tel:+306982940193" class="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div class="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 text-green-600 dark:text-green-400">
                ${icon('phone','w-5 h-5')}
              </div>
              <div>
                <div class="text-xs text-slate-400 dark:text-slate-500">Κινητό</div>
                <div class="font-medium text-green-600 dark:text-green-400 text-sm">698 294 0193</div>
              </div>
              ${icon('chevron-right','w-4 h-4 text-slate-400 ml-auto')}
            </a>
          </div>

          <a href="https://wa.me/306982940193?text=${encodeURIComponent('Γεια σας, ενδιαφέρομαι για την ενεργοποίηση του GearLog.')}" target="_blank"
            class="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Μήνυμα WhatsApp
          </a>

          <p class="text-center text-xs text-slate-400 dark:text-slate-500">
            Μόλις λάβετε τον κωδικό ενεργοποίησης, <a href="#/activate" class="text-blue-500 underline font-medium">επιστρέψτε εδώ</a> για να τον εισάγετε.
          </p>
        </div>
      </div>
    `;
    refreshIcons();
  }

  const LIC_CACHE_KEY = 'lic_last_check';
  const LIC_GRACE_MS = 3 * 24 * 3600000; // 3 days

  async function checkLicenseStatus() {
    await loadAll();
    const workshopId = state.settings.workshopId;

    // Show SA nav link only for super admin
    updateSANavLink(state.settings.workshopMode === 'admin');

    // New installation — show activation screen
    if (!workshopId) {
      showActivationScreen();
      return;
    }

    // Demo mode — show persistent banner reminder, seed data on first visit
    if (state.settings.workshopMode === 'demo') {
      if (state.customers.length === 0) {
        await seedDemoData();
        await loadAll();
      }
      showDemoBanner();
      return;
    }

    try {
      const resp = await fetch(`/api/license-check?workshopId=${encodeURIComponent(workshopId)}`);
      const data = await resp.json();

      // Persist the result only when it comes from the server
      if (data.registered !== false && data.configured !== false) {
        localStorage.setItem(LIC_CACHE_KEY, JSON.stringify({ ts: Date.now(), active: data.active, data }));
      }

      // If server says inactive, lock immediately and wipe the "grace" cache
      if (data.active === false) {
        localStorage.setItem(LIC_CACHE_KEY, JSON.stringify({ ts: Date.now(), active: false, data }));
      }

      applyLicenseStatus(data);
    } catch (_) {
      // Offline or server error — apply grace period logic
      applyOfflineGrace();
    }
  }

  function applyOfflineGrace() {
    const raw = localStorage.getItem(LIC_CACHE_KEY);
    if (!raw) return; // Never registered → fail open

    try {
      const { ts, active, data } = JSON.parse(raw);

      if (active === false) {
        // Was already locked before going offline → keep locked
        applyLicenseStatus(data || { active: false });
        return;
      }

      const ageMs = Date.now() - ts;
      if (ageMs > LIC_GRACE_MS) {
        // Grace period expired → lock with "needs internet" message
        showOfflineLock(Math.ceil(ageMs / 86400000));
      }
      // else: within grace period → allow (do nothing)
    } catch (_) {}
  }

  function showOfflineLock(offlineDays) {
    document.getElementById('license-overlay')?.remove();
    const el = document.createElement('div');
    el.id = 'license-overlay';
    el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0f172a;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1.25rem;padding:2rem;text-align:center;';
    el.innerHTML = `
      <div style="width:64px;height:64px;background:#f59e0b;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem">📡</div>
      <div style="color:white;font-size:1.25rem;font-weight:700">Απαιτείται σύνδεση internet</div>
      <div style="color:#94a3b8;font-size:0.875rem;max-width:320px;line-height:1.6">Η εφαρμογή δεν έχει επαληθεύσει τη συνδρομή σας για ${offlineDays} ημέρες. Συνδεθείτε στο internet για να συνεχίσετε.</div>
      <button onclick="location.reload()" style="background:#1d4ed8;color:white;padding:0.625rem 1.5rem;border-radius:0.5rem;border:none;font-size:0.875rem;font-weight:600;cursor:pointer">Δοκιμή ξανά</button>
    `;
    document.body.appendChild(el);
  }

  function applyLicenseStatus(data) {
    document.getElementById('license-overlay')?.remove();
    document.getElementById('payment-banner')?.remove();

    if (data.active === false) {
      const el = document.createElement('div');
      el.id = 'license-overlay';
      el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0f172a;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1.25rem;padding:2rem;text-align:center;';
      el.innerHTML = `
        <div style="width:64px;height:64px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem">🔒</div>
        <div style="color:white;font-size:1.25rem;font-weight:700">Η πρόσβαση έχει ανασταλεί</div>
        <div style="color:#94a3b8;font-size:0.875rem;max-width:320px;line-height:1.6">Η συνδρομή σας έχει λήξει ή ανασταλεί. Επικοινωνήστε με τον πάροχο για να ενεργοποιηθεί ξανά η πρόσβαση.</div>
        ${data.workshopName ? `<div style="color:#475569;font-size:0.75rem">Συνεργείο: ${U.escape(data.workshopName)}</div>` : ''}
      `;
      document.body.appendChild(el);
      return;
    }

    if (data.registered && data.daysUntilPayment !== null && data.daysUntilPayment <= 5) {
      const days = data.daysUntilPayment;
      const feeStr = data.monthlyFee
        ? ` — ${Number(data.monthlyFee).toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })}`
        : '';
      const msg = days === 0
        ? `Σήμερα είναι η ημέρα πληρωμής της συνδρομής σας${feeStr}!`
        : `Η πληρωμή συνδρομής λήγει σε ${days} ${days === 1 ? 'ημέρα' : 'ημέρες'}${feeStr}.`;

      const el = document.createElement('div');
      el.id = 'payment-banner';
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;background:#fef3c7;border-bottom:2px solid #f59e0b;padding:0.625rem 1rem;display:flex;align-items:center;gap:0.75rem;';
      el.innerHTML = `
        <span style="font-size:1.1rem;flex-shrink:0">⚠️</span>
        <span style="flex:1;font-size:0.8125rem;font-weight:600;color:#78350f">${msg} Επικοινωνήστε με τον πάροχο.</span>
        <button onclick="document.getElementById('payment-banner').remove()" style="flex-shrink:0;padding:0.25rem 0.625rem;font-size:0.8rem;color:#92400e;font-weight:700;border-radius:0.375rem;border:1px solid #f59e0b;background:transparent;cursor:pointer">✕</button>
      `;
      document.body.appendChild(el);
    }
  }

  // =========================================================
  //  SUPER ADMIN
  // =========================================================
  async function renderSuperAdmin() {
    $('#view').innerHTML = `
      ${pageHeader('Super Admin')}
      <div class="max-w-3xl mx-auto p-4 pb-24 sm:pb-4">
        <div id="sa-content">
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 max-w-sm mx-auto mt-8">
            <div class="flex flex-col items-center gap-3 mb-6">
              <div class="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">${icon('shield','w-7 h-7 text-blue-600')}</div>
              <h2 class="font-bold text-lg">Σύνδεση Super Admin</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 text-center">Εισάγετε το PIN διαχειριστή για να συνεχίσετε.</p>
            </div>
            <div class="space-y-3">
              <input id="sa-pin" type="password" inputmode="text" placeholder="Κωδικός PIN"
                class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest" />
              <div id="sa-pin-err" class="hidden text-red-500 text-sm text-center"></div>
              <button id="sa-login" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg">
                ${icon('log-in','w-4 h-4 inline mr-1')} Είσοδος
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    refreshIcons();

    let adminPin = null;

    async function saLogin() {
      const pin = ($('#sa-pin').value || '').trim();
      if (!pin) return;
      const btn = $('#sa-login');
      btn.disabled = true;
      btn.textContent = '…';
      $('#sa-pin-err').classList.add('hidden');
      try {
        const resp = await fetch('/api/admin-clients', { headers: { 'x-admin-pin': pin } });
        if (resp.status === 401) {
          $('#sa-pin-err').textContent = 'Λάθος PIN. Δοκιμάστε ξανά.';
          $('#sa-pin-err').classList.remove('hidden');
          btn.disabled = false;
          btn.innerHTML = `${icon('log-in','w-4 h-4 inline mr-1')} Είσοδος`;
          refreshIcons();
          return;
        }
        if (!resp.ok) {
          $('#sa-pin-err').textContent = 'Σφάλμα σύνδεσης. Ελέγξτε τις ρυθμίσεις διακομιστή.';
          $('#sa-pin-err').classList.remove('hidden');
          btn.disabled = false;
          btn.innerHTML = `${icon('log-in','w-4 h-4 inline mr-1')} Είσοδος`;
          refreshIcons();
          return;
        }
        adminPin = pin;
        const clients = await resp.json();
        renderAdminDashboard(clients);
      } catch (e) {
        $('#sa-pin-err').textContent = 'Σφάλμα σύνδεσης.';
        $('#sa-pin-err').classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = `${icon('log-in','w-4 h-4 inline mr-1')} Είσοδος`;
        refreshIcons();
      }
    }

    $('#sa-login').addEventListener('click', saLogin);
    $('#sa-pin').addEventListener('keydown', (e) => { if (e.key === 'Enter') saLogin(); });

    async function loadClients() {
      const resp = await fetch('/api/admin-clients', { headers: { 'x-admin-pin': adminPin } });
      return resp.ok ? resp.json() : [];
    }

    function clientDaysUntilPayment(paymentDay) {
      if (!paymentDay) return null;
      const today = new Date();
      let pd = new Date(today.getFullYear(), today.getMonth(), paymentDay);
      if (pd < today) pd = new Date(today.getFullYear(), today.getMonth() + 1, paymentDay);
      return Math.ceil((pd - today) / 86400000);
    }

    function renderAdminDashboard(clients) {
      const content = $('#sa-content');
      const today = new Date();
      content.innerHTML = `
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold">Πελάτες (${clients.length})</h2>
          <button id="sa-add-btn" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1">
            ${icon('plus','w-4 h-4')} Νέος πελάτης
          </button>
        </div>

        <div id="sa-client-list" class="space-y-3 mb-6">
          ${clients.length === 0 ? `<div class="text-center py-12 text-slate-400">Δεν υπάρχουν πελάτες ακόμα. Προσθέστε τον πρώτο!</div>` : clients.map((c) => {
            const days = clientDaysUntilPayment(c.payment_day);
            const dueSoon = days !== null && days <= 5;
            const isInactive = !c.is_active;
            return `
            <div class="bg-white dark:bg-slate-800 rounded-xl border ${isInactive ? 'border-red-200 dark:border-red-900/50' : dueSoon ? 'border-amber-300 dark:border-amber-600/50' : 'border-slate-200 dark:border-slate-700'} p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold text-sm">${U.escape(c.workshop_name)}</span>
                    <span class="text-xs px-1.5 py-0.5 rounded-full font-medium ${isInactive ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'}">
                      ${isInactive ? 'Ανενεργό' : 'Ενεργό'}
                    </span>
                    ${dueSoon && !isInactive ? `<span class="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                      ${days === 0 ? 'Πληρωμή σήμερα' : `Πληρωμή σε ${days}μ`}
                    </span>` : ''}
                  </div>
                  <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
                    ${c.contact_name ? `<div>${U.escape(c.contact_name)}</div>` : ''}
                    ${c.email ? `<div>${U.escape(c.email)}</div>` : ''}
                    ${c.phone ? `<div>${U.escape(c.phone)}</div>` : ''}
                    ${c.monthly_fee ? `<div class="font-medium text-slate-600 dark:text-slate-300">${Number(c.monthly_fee).toLocaleString('el-GR',{style:'currency',currency:'EUR'})}/μήνα · ημέρα ${c.payment_day}</div>` : ''}
                  </div>
                  ${c.workshop_id ? `
                  <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div class="text-[10px] text-slate-400 mb-1">Κωδικός Ενεργοποίησης</div>
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-sm font-bold tracking-widest text-blue-600 dark:text-blue-400">${U.escape(c.workshop_id)}</span>
                      <button data-wid="${U.escape(c.workshop_id)}" class="sa-copy-wid text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">${icon('copy','w-3 h-3 inline')} Αντιγραφή</button>
                    </div>
                  </div>` : ''}
                </div>
                <div class="flex flex-col gap-1.5 flex-shrink-0">
                  <button data-cid="${U.escape(c.id)}" data-active="${c.is_active ? '1' : '0'}" class="sa-toggle text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${isInactive ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500' : 'bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'}">
                    ${isInactive ? icon('check','w-3.5 h-3.5 inline') + ' Ενεργοποίηση' : icon('ban','w-3.5 h-3.5 inline') + ' Απενεργοποίηση'}
                  </button>
                  <button data-cid="${U.escape(c.id)}" class="sa-edit text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                    ${icon('pencil','w-3.5 h-3.5 inline')} Επεξεργασία
                  </button>
                </div>
              </div>
              ${c.notes ? `<div class="mt-2 text-xs text-slate-400 italic border-t border-slate-100 dark:border-slate-700 pt-2">${U.escape(c.notes)}</div>` : ''}
            </div>`;
          }).join('')}
        </div>

        <div id="sa-form-wrap" class="hidden bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h3 id="sa-form-title" class="font-semibold">Νέος Πελάτης</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label class="block text-sm font-medium mb-1">Όνομα Συνεργείου <span class="text-red-500">*</span></label>
              <input id="sa-workshop-name" type="text" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /></div>
            <div><label class="block text-sm font-medium mb-1">Υπεύθυνος</label>
              <input id="sa-contact-name" type="text" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /></div>
            <div><label class="block text-sm font-medium mb-1">Email</label>
              <input id="sa-email" type="email" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /></div>
            <div><label class="block text-sm font-medium mb-1">Τηλέφωνο</label>
              <input id="sa-phone" type="tel" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /></div>
            <div><label class="block text-sm font-medium mb-1">Μηνιαία Χρέωση (€)</label>
              <input id="sa-fee" type="number" min="0" step="0.01" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /></div>
            <div><label class="block text-sm font-medium mb-1">Ημέρα Πληρωμής (1-28)</label>
              <input id="sa-payDay" type="number" min="1" max="28" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /></div>
            <div class="sm:col-span-2"><label class="block text-sm font-medium mb-1">Workshop ID <span class="text-xs text-slate-400">(από τις Ρυθμίσεις της εφαρμογής τους)</span></label>
              <input id="sa-wid" type="text" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" /></div>
            <div class="sm:col-span-2"><label class="block text-sm font-medium mb-1">Σημειώσεις</label>
              <textarea id="sa-notes" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"></textarea></div>
          </div>
          <div class="flex gap-2 pt-1">
            <button id="sa-save" class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm">Αποθήκευση</button>
            <button id="sa-cancel" class="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium px-4 py-2 rounded-lg text-sm">Ακύρωση</button>
          </div>
        </div>
      `;
      refreshIcons();
      wireAdminDashboard(clients);
    }

    function genActivationCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      return `GL-${seg(4)}-${seg(4)}`;
    }

    function showForm(client) {
      const wrap = $('#sa-form-wrap');
      $('#sa-form-title').textContent = client ? 'Επεξεργασία Πελάτη' : 'Νέος Πελάτης';
      $('#sa-workshop-name').value = client?.workshop_name || '';
      $('#sa-contact-name').value = client?.contact_name || '';
      $('#sa-email').value = client?.email || '';
      $('#sa-phone').value = client?.phone || '';
      $('#sa-fee').value = client?.monthly_fee || '';
      $('#sa-payDay').value = client?.payment_day || '';
      $('#sa-wid').value = client?.workshop_id || genActivationCode();
      $('#sa-notes').value = client?.notes || '';
      wrap.dataset.editId = client?.id || '';
      wrap.classList.remove('hidden');
      wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function wireAdminDashboard(clients) {
      $('#sa-add-btn').addEventListener('click', () => showForm(null));
      $('#sa-cancel').addEventListener('click', () => $('#sa-form-wrap').classList.add('hidden'));

      $('#sa-save').addEventListener('click', async () => {
        const workshopName = ($('#sa-workshop-name').value || '').trim();
        if (!workshopName) { U.toast('Το όνομα συνεργείου είναι υποχρεωτικό', 'error'); return; }
        const payload = {
          workshop_name: workshopName,
          contact_name: ($('#sa-contact-name').value || '').trim() || null,
          email: ($('#sa-email').value || '').trim() || null,
          phone: ($('#sa-phone').value || '').trim() || null,
          monthly_fee: Number($('#sa-fee').value) || 0,
          payment_day: Number($('#sa-payDay').value) || 1,
          workshop_id: ($('#sa-wid').value || '').trim() || null,
          notes: ($('#sa-notes').value || '').trim() || null,
        };
        const editId = $('#sa-form-wrap').dataset.editId;
        try {
          const url = '/api/admin-clients';
          const method = editId ? 'PUT' : 'POST';
          if (editId) payload.id = editId;
          const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-admin-pin': adminPin }, body: JSON.stringify(payload) });
          if (!resp.ok) throw new Error(await resp.text());
          U.toast('Αποθηκεύτηκε');
          const updated = await loadClients();
          renderAdminDashboard(updated);
        } catch (e) {
          U.toast(e.message || 'Σφάλμα αποθήκευσης', 'error');
        }
      });

      $$('.sa-copy-wid').forEach((btn) => btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.wid).then(() => U.toast('Αντιγράφηκε!'));
      }));

      $$('.sa-toggle').forEach((btn) => btn.addEventListener('click', async () => {
        const cid = btn.dataset.cid;
        const currentlyActive = btn.dataset.active === '1';
        const client = clients.find((c) => c.id === cid);
        if (!client) return;
        const confirmed = confirm(`${currentlyActive ? 'Απενεργοποίηση' : 'Ενεργοποίηση'} "${client.workshop_name}";`);
        if (!confirmed) return;
        try {
          await fetch('/api/admin-clients', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-admin-pin': adminPin },
            body: JSON.stringify({ id: cid, is_active: !currentlyActive }),
          });
          const updated = await loadClients();
          renderAdminDashboard(updated);
        } catch (e) {
          U.toast('Σφάλμα ενημέρωσης', 'error');
        }
      }));

      $$('.sa-edit').forEach((btn) => btn.addEventListener('click', () => {
        const cid = btn.dataset.cid;
        const client = clients.find((c) => c.id === cid);
        if (client) showForm(client);
      }));
    }
  }

  // =========================================================
  //  SETTINGS
  // =========================================================
  async function renderSettings() {
    const s = state.settings;
    $('#view').innerHTML = `
      ${pageHeader(t('settings'))}
      <div class="max-w-2xl mx-auto p-4 pb-24 sm:pb-4 space-y-6">

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h2 class="font-semibold">${t('workshop_info')}</h2>
          ${settingsField('workshopName', t('workshop_name'), s.workshopName)}
          ${settingsField('workshopPhone', t('workshop_phone'), s.workshopPhone, 'tel')}
          ${settingsField('workshopEmail', t('workshop_email'), s.workshopEmail, 'email')}
          ${settingsField('workshopAddress', t('workshop_address'), s.workshopAddress)}
          ${settingsField('workshopTaxId', t('workshop_tax_id'), s.workshopTaxId)}
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h2 class="font-semibold">${t('preferences')}</h2>
          <div>
            <label class="block text-sm font-medium mb-1">${t('language')}</label>
            <select id="lang-sel" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <option value="el" ${(localStorage.getItem('lang')||'el')==='el'?'selected':''}>Ελληνικά</option>
              <option value="en" ${(localStorage.getItem('lang')||'el')==='en'?'selected':''}>English</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">${t('theme')}</label>
            <select id="theme-sel" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <option value="auto" ${(localStorage.getItem('theme')||'auto')==='auto'?'selected':''}>${t('theme_auto')}</option>
              <option value="light" ${localStorage.getItem('theme')==='light'?'selected':''}>${t('theme_light')}</option>
              <option value="dark" ${localStorage.getItem('theme')==='dark'?'selected':''}>${t('theme_dark')}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">${t('currency')}</label>
            <select id="curr-sel" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <option value="EUR" ${(s.currency||'EUR')==='EUR'?'selected':''}>EUR (€)</option>
              <option value="USD" ${s.currency==='USD'?'selected':''}>USD ($)</option>
              <option value="GBP" ${s.currency==='GBP'?'selected':''}>GBP (£)</option>
            </select>
          </div>
          ${settingsField('laborRate', t('default_labor_rate'), s.laborRate, 'number', '0.01')}
          <div class="grid grid-cols-2 gap-3">
            ${settingsField('intervalKm', t('default_service_interval_km'), s.intervalKm, 'number')}
            ${settingsField('intervalMonths', t('default_service_interval_months'), s.intervalMonths, 'number')}
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h2 class="font-semibold">Μηχανικοί</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Οι μηχανικοί του συνεργείου εμφανίζονται ως dropdown στις φόρμες service και εντολών.</p>
          <div id="mechanics-list" class="space-y-2">
            ${JSON.parse(s.workshopMechanics || '[]').map((m, i) => `
              <div class="flex items-center gap-2">
                <span class="flex-1 text-sm font-medium px-3 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">${U.escape(m)}</span>
                <button type="button" data-mech-idx="${i}" class="mech-del p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">${icon('trash-2','w-4 h-4')}</button>
              </div>
            `).join('')}
          </div>
          <div class="flex gap-2">
            <input id="new-mechanic" type="text" placeholder="Όνομα μηχανικού" style="text-transform:uppercase"
              oninput="this.value=this.value.toUpperCase()"
              class="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="button" id="add-mechanic" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1">
              ${icon('plus','w-4 h-4')} Προσθήκη
            </button>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h2 class="font-semibold">Τύποι Οχημάτων</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Επιλέξτε με τι οχήματα ασχολείται το συνεργείο σας (χρησιμοποιείται από τον Σύμβουλο AI)</p>
          <div class="grid grid-cols-2 gap-1">
            ${[['car','Αυτοκίνητα','car'],['moto','Μοτοσυκλέτες','bike'],['truck','Φορτηγά','truck'],['boat','Σκάφη','ship']].map(([val,label,icn]) => `
              <label class="flex items-center gap-2 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer">
                <input type="checkbox" id="vtype-${val}" ${(s.workshopVehicleTypes || 'car').includes(val) ? 'checked' : ''} class="w-4 h-4 rounded accent-blue-600" />
                <span class="flex items-center gap-1.5 text-sm">${icon(icn,'w-4 h-4 text-slate-500')} ${label}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h2 class="font-semibold">${t('data_management')}</h2>
          <div class="grid grid-cols-2 gap-2">
            <button id="export-data" class="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-3 py-2.5 rounded-lg flex items-center justify-center gap-1">${icon('download','w-4 h-4')} ${t('export_backup')}</button>
            <label class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer">
              ${icon('upload','w-4 h-4')} ${t('import_backup')}
              <input type="file" id="import-data" accept="application/json" class="hidden" />
            </label>
          </div>
          <button id="reset-data" class="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/30 text-sm font-medium px-3 py-2.5 rounded-lg flex items-center justify-center gap-1">${icon('trash-2','w-4 h-4')} ${t('reset_data')}</button>
        </div>

        <button id="save-settings" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg">${t('save')}</button>
      </div>
    `;

    // --- Mechanics management ---
    window._settingsMechanics = JSON.parse(s.workshopMechanics || '[]');

    function renderMechanicsList() {
      const list = $('#mechanics-list');
      if (!list) return;
      list.innerHTML = window._settingsMechanics.map((m, i) => `
        <div class="flex items-center gap-2">
          <span class="flex-1 text-sm font-medium px-3 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">${U.escape(m)}</span>
          <button type="button" data-mech-idx="${i}" class="mech-del p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">${icon('trash-2','w-4 h-4')}</button>
        </div>`).join('');
      refreshIcons();
      $$('.mech-del').forEach((btn) => btn.addEventListener('click', () => {
        window._settingsMechanics.splice(Number(btn.dataset.mechIdx), 1);
        renderMechanicsList();
      }));
    }

    $('#add-mechanic').addEventListener('click', () => {
      const inp = $('#new-mechanic');
      const name = (inp.value || '').trim().toUpperCase();
      if (!name) return;
      window._settingsMechanics.push(name);
      inp.value = '';
      renderMechanicsList();
    });
    $('#new-mechanic').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#add-mechanic').click(); } });
    renderMechanicsList();

    $('#save-settings').addEventListener('click', async () => {
      const fields = ['workshopName','workshopPhone','workshopEmail','workshopAddress','workshopTaxId','laborRate','intervalKm','intervalMonths'];
      for (const f of fields) {
        const el = $(`[data-setting="${f}"]`);
        if (el) {
          let val = el.value;
          if (['laborRate','intervalKm','intervalMonths'].includes(f)) val = Number(val) || 0;
          await DB.setSetting(f, val);
        }
      }
      await DB.setSetting('currency', $('#curr-sel').value);
      const vtypes = ['car','moto','truck','boat'].filter((v) => $(`#vtype-${v}`)?.checked).join(',');
      await DB.setSetting('workshopVehicleTypes', vtypes || 'car');
      await DB.setSetting('workshopMechanics', JSON.stringify(window._settingsMechanics || JSON.parse(s.workshopMechanics || '[]')));
      localStorage.setItem('lang', $('#lang-sel').value);
      localStorage.setItem('theme', $('#theme-sel').value);
      localStorage.setItem('currency', $('#curr-sel').value);
      applyTheme();
      U.toast(t('saved'));
      setTimeout(() => location.reload(), 600);
    });

    $('#export-data').addEventListener('click', async () => {
      const data = await DB.exportAll();
      // Include localStorage preferences so they're restored on import
      data._prefs = {
        lang: localStorage.getItem('lang') || 'el',
        theme: localStorage.getItem('theme') || 'light',
        currency: localStorage.getItem('currency') || 'EUR',
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gearlog-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    $('#import-data').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      let data;
      try { data = JSON.parse(text); } catch (err) { U.toast('Μη έγκυρο αρχείο backup', 'error'); return; }
      const counts = [
        data.customers?.length ? `${data.customers.length} πελάτες` : null,
        data.vehicles?.length ? `${data.vehicles.length} οχήματα` : null,
        data.services?.length ? `${data.services.length} καταγραφές service` : null,
        data.job_orders?.length ? `${data.job_orders.length} εντολές` : null,
      ].filter(Boolean).join(', ');
      const msg = `Θα αντικατασταθούν ΟΛΕΣ οι τρέχουσες εγγραφές με τα δεδομένα του backup${counts ? ' (' + counts + ')' : ''}.\n\nΣυνέχεια;`;
      if (!confirm(msg)) return;
      try {
        await DB.importAll(data);
        // Restore localStorage preferences
        if (data._prefs) {
          if (data._prefs.lang) localStorage.setItem('lang', data._prefs.lang);
          if (data._prefs.theme) localStorage.setItem('theme', data._prefs.theme);
          if (data._prefs.currency) localStorage.setItem('currency', data._prefs.currency);
        }
        U.toast('Το backup επαναφέρθηκε επιτυχώς');
        setTimeout(() => location.reload(), 800);
      } catch (err) {
        U.toast('Σφάλμα κατά την εισαγωγή: ' + (err?.message || err), 'error');
      }
    });

    $('#reset-data').addEventListener('click', async () => {
      if (!confirm(t('confirm_delete'))) return;
      if (!confirm('Διαγραφή ΟΛΩΝ; Δεν μπορεί να αναιρεθεί!')) return;
      await DB.resetAll();
      localStorage.clear();
      location.reload();
    });
  }

  // =========================================================
  //  Form helpers
  // =========================================================
  function formField(name, label, value, opts) {
    opts = opts || {};
    const fieldId = opts.id || `ff-${name}`;
    const isText = !opts.type || opts.type === 'text' || opts.type === 'tel' || opts.type === 'email';
    // Auto-detect transform by field type if not explicitly set
    const vtr = opts.transform || (opts.type === 'tel' ? 'phone' : opts.type === 'email' ? 'email' : '');
    const mic = opts.voice && isText ? micBtn(fieldId, { transform: vtr }) : '';
    return `
      <div>
        <label class="block text-sm font-medium mb-1">${U.escape(label)}${opts.required?' <span class="text-red-500">*</span>':''}</label>
        <div class="${mic ? 'flex gap-2' : ''}">
          <input id="${fieldId}" type="${opts.type||'text'}" name="${name}" value="${U.escape(value==null?'':value)}" ${mic?'data-vi="1"':''} ${opts.required?'required':''} ${opts.step?`step="${opts.step}"`:''} placeholder="${U.escape(opts.placeholder||'')}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          ${mic}
        </div>
      </div>
    `;
  }

  function formTextArea(name, label, value, opts) {
    opts = opts || {};
    const fieldId = opts.id || `ta-${name}`;
    const mic = opts.voice !== false ? micBtn(fieldId) : '';
    return `
      <div>
        <label class="block text-sm font-medium mb-1">${U.escape(label)}</label>
        <div class="${mic ? 'flex gap-2 items-start' : ''}">
          <textarea id="${fieldId}" name="${name}" rows="${opts.rows||2}" data-vi="1" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">${U.escape(value==null?'':value)}</textarea>
          ${mic}
        </div>
      </div>
    `;
  }

  function mechanicSelect(fieldName, currentValue) {
    const mechanics = JSON.parse(state.settings.workshopMechanics || '[]');
    if (!mechanics.length) {
      return `
        <div>
          <label class="block text-sm font-medium mb-1">${t('service_mechanic')}</label>
          <div class="flex gap-2">
            <input id="ff-mechanic" name="${fieldName}" type="text" value="${U.escape((currentValue||'').toUpperCase())}"
              oninput="this.value=this.value.toUpperCase()"
              class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            ${micBtn('ff-mechanic', { transform: 'name' })}
          </div>
          <p class="text-xs text-slate-400 mt-1">Πρόσθεσε μηχανικούς στις <a href="#/settings" class="underline">Ρυθμίσεις</a> για dropdown επιλογή.</p>
        </div>`;
    }
    const opts = ['', ...mechanics].map((m) =>
      `<option value="${U.escape(m)}" ${currentValue === m ? 'selected' : ''}>${m || '— Επιλογή μηχανικού —'}</option>`
    ).join('');
    return `
      <div>
        <label class="block text-sm font-medium mb-1">${t('service_mechanic')}</label>
        <select name="${fieldName}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
          ${opts}
        </select>
      </div>`;
  }

  function settingsField(name, label, value, type, step) {
    return `
      <div>
        <label class="block text-sm font-medium mb-1">${U.escape(label)}</label>
        <input data-setting="${name}" type="${type||'text'}" ${step?`step="${step}"`:''} value="${U.escape(value==null?'':value)}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
      </div>
    `;
  }

  function formData(form) {
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = typeof v === 'string' ? v.trim() : v; });
    return data;
  }

  // =========================================================
  //  Modal dialog
  // =========================================================
  function openDialog(title, html) {
    let modal = $('#modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" id="modal-bg">
        <div class="bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border-t sm:border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] overflow-auto">
          <div class="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
            <h2 class="font-semibold">${U.escape(title)}</h2>
            <button id="modal-close" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">${icon('x','w-5 h-5')}</button>
          </div>
          <div class="p-4">${html}</div>
        </div>
      </div>
    `;
    refreshIcons();
    const close = () => { modal.innerHTML = ''; };
    $('#modal-close').addEventListener('click', close);
    $('#modal-bg').addEventListener('click', (e) => { if (e.target.id === 'modal-bg') close(); });
  }

  // =========================================================
  //  Theme
  // =========================================================
  function applyTheme() {
    const pref = localStorage.getItem('theme') || 'auto';
    const dark = pref === 'dark' || (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    // color-scheme tells the browser (and mobile WebViews) which mode we want,
    // preventing Android Chrome "Force Dark" from overriding our CSS
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }

  // =========================================================
  //  Backup Reminder
  // =========================================================
  function checkBackupReminder() {
    const BACKUP_KEY = 'lastBackupReminder';
    const INTERVAL_DAYS = 15;
    const last = Number(localStorage.getItem(BACKUP_KEY) || 0);
    if (last === 0) {
      // First launch ever — nothing to back up yet. Start the clock silently instead of
      // showing a nonsensical "days since 1970" reminder.
      localStorage.setItem(BACKUP_KEY, String(Date.now()));
      return;
    }
    const daysSince = (Date.now() - last) / 86400000;
    if (daysSince < INTERVAL_DAYS) return;

    setTimeout(() => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4';
      overlay.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div>
              <div class="font-bold text-base">Υπενθύμιση Backup</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Ασφάλεια δεδομένων επιχείρησης</div>
            </div>
          </div>
          <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Έχουν περάσει <b>${Math.floor(daysSince) || 'μερικές'} ημέρες</b> από το τελευταίο backup.<br>
            Κάνε εξαγωγή των δεδομένων σου για να προστατεύσεις το αρχείο της επιχείρησής σου.
          </p>
          <div class="space-y-2">
            <button id="br-backup" class="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Λήψη Backup τώρα
            </button>
            <button id="br-done" class="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
              Το έχω κάνει ήδη
            </button>
            <button id="br-later" class="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm py-1.5 transition-colors">
              Υπενθύμηση σε 3 ημέρες
            </button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      overlay.querySelector('#br-backup').addEventListener('click', () => {
        overlay.remove();
        localStorage.setItem(BACKUP_KEY, String(Date.now()));
        go('/settings?backup=1');
      });

      overlay.querySelector('#br-done').addEventListener('click', () => {
        overlay.remove();
        localStorage.setItem(BACKUP_KEY, String(Date.now()));
      });

      overlay.querySelector('#br-later').addEventListener('click', () => {
        overlay.remove();
        // Set timestamp 12 days ago so next check triggers in 3 days
        localStorage.setItem(BACKUP_KEY, String(Date.now() - (12 * 86400000)));
      });
    }, 3000);
  }

  // =========================================================
  //  ΚΤΕΟ / Emissions Alerts
  // =========================================================
  function checkKteoAlerts() {
    const ALERT_KEY = 'lastKteoAlertDay';
    const today = new Date().toDateString();
    if (localStorage.getItem(ALERT_KEY) === today) return; // once per day

    const kteoExpiring = state.vehicles.filter((v) => { const st = kteoStatus(v); return st && st.daysLeft >= 0 && st.daysLeft <= 14; });
    const emExpiring = state.vehicles.filter((v) => { const st = emissionsStatus(v); return st && st.daysLeft >= 0 && st.daysLeft <= 14; });

    const total = kteoExpiring.length + emExpiring.length;
    if (!total) return;

    localStorage.setItem(ALERT_KEY, today);

    const lines = [];
    if (kteoExpiring.length) lines.push(`🔵 ΚΤΕΟ: ${kteoExpiring.map((v) => v.plate || vehicleLabel(v)).join(', ')}`);
    if (emExpiring.length) lines.push(`🟢 Καυσαέρια: ${emExpiring.map((v) => v.plate || vehicleLabel(v)).join(', ')}`);

    setTimeout(() => {
      openDialog('Ειδοποίηση ΚΤΕΟ / Καυσαερίων', `
        <div class="space-y-3">
          <div class="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            ${icon('shield-alert','w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5')}
            <div class="text-sm text-amber-800 dark:text-amber-200">
              <p class="font-semibold mb-1">${total} όχημα${total > 1 ? 'τα' : ''} λήγει${total > 1 ? 'ουν' : ''} εντός 2 εβδομάδων:</p>
              ${lines.map((l) => `<p class="text-xs mt-0.5">${l}</p>`).join('')}
            </div>
          </div>
          <p class="text-xs text-slate-500 text-center">Μεταβείτε στις Υπενθυμίσεις για να ειδοποιήσετε τους πελάτες.</p>
          <a href="#/reminders" class="block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg text-center" onclick="closeDialog?.()">Προβολή Υπενθυμίσεων</a>
        </div>
      `);
    }, 2500);
  }

  // =========================================================
  //  Init
  // =========================================================
  async function init() {
    applyTheme();
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    }

    try {
      await DB.open();
    } catch (err) {
      const view = document.getElementById('view');
      if (view) view.innerHTML = `<div style="padding:2rem;color:red"><b>Σφάλμα βάσης δεδομένων:</b> ${String(err && err.message || err)}<br><small>Ο browser σου μπορεί να μπλοκάρει το IndexedDB (π.χ. private mode).</small></div>`;
      return;
    }

    // Bottom nav strings
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });

    window.addEventListener('hashchange', router);
    // Wait for the first render (which loads state.* from IndexedDB via loadAll())
    // before running checks that read that state — otherwise they'd see empty arrays.
    await router();

    // License check (runs once per session, non-blocking)
    checkLicenseStatus();

    // Backup reminder (every 15 days)
    checkBackupReminder();

    // ΚΤΕΟ / emissions alerts (vehicles expiring within 14 days)
    checkKteoAlerts();

    // Register service worker
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    // Install prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const btn = document.getElementById('install-btn');
      if (btn) {
        btn.classList.remove('hidden');
        btn.addEventListener('click', async () => {
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          deferredPrompt = null;
          btn.classList.add('hidden');
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

