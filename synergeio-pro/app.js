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
  };

  async function loadAll() {
    state.customers = await DB.getAll('customers');
    state.vehicles = await DB.getAll('vehicles');
    state.services = await DB.getAll('services');
    state.jobOrders = await DB.getAll('job_orders');
    state.settings = await DB.getAllSettings();
    if (!state.settings.currency) state.settings.currency = 'EUR';
    if (!state.settings.intervalKm) state.settings.intervalKm = 10000;
    if (!state.settings.intervalMonths) state.settings.intervalMonths = 12;
    if (!state.settings.laborRate) state.settings.laborRate = 35;
  }

  // ---------- Helpers ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function customerById(id) { return state.customers.find((c) => c.id === id); }
  function vehicleById(id) { return state.vehicles.find((v) => v.id === id); }
  function serviceById(id) { return state.services.find((s) => s.id === id); }
  function jobOrderById(id) { return state.jobOrders.find((j) => j.id === id); }

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

  function initVoiceButtons() {
    if (!U.hasSpeech()) return;
    $$('.voice-btn[data-vfor]').forEach((btn) => {
      if (btn._vb) return;
      btn._vb = true;

      const tr = btn.dataset.vtr;
      const transform = tr === 'plate'
        ? (s) => s.toUpperCase().replace(/\s+/g, '').replace(/[^A-ZΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ0-9]/gi, '')
        : undefined;

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
    '/job-orders': renderJobOrders,
    '/job-orders/new': () => renderJobOrderForm(),
    '/job-orders/:id': (id) => renderJobOrderDetail(id),
    '/job-orders/:id/edit': (id) => renderJobOrderForm(id),
    '/job-orders/:id/work': (id) => renderJobOrderWork(id),
    '/schedule': renderSchedule,
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
      <div class="sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur border-b border-slate-200 dark:border-slate-800">
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
              <h1 class="text-2xl font-bold">${t('plate_search_title')}</h1>
              <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">${t('plate_search_subtitle')}</p>
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

              <!-- Hidden file input for plate photo -->
              <input type="file" id="dash-plate-file" accept="image/*" capture="environment" class="hidden" />

              <!-- Result -->
              <div id="dash-plate-result" class="mt-4 empty:hidden"></div>
            </div>

          </div>
        </div>

        <!-- Stats panel -->
        <div class="space-y-4">

          <!-- 4 stat cards -->
          <div class="grid grid-cols-2 gap-3">
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
                <div class="text-xs text-slate-500 dark:text-slate-400">Εκκρεμείς εντολές</div>
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
          </div>

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

        </div>

        </div>
      </div>
    `;
    refreshIcons();

    // ---------- plate lookup ----------
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
            <button onclick="go('/scan')" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors">
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

    const fileInput = $('#dash-plate-file');
    $('#dash-plate-cam')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', () => {
      if (fileInput.files?.[0]) platePhotoOCR(fileInput.files[0]);
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

    $('#view').innerHTML = `
      ${pageHeader(c.name, {
        actions: `
          <a href="#/customers/${c.id}/edit" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">${icon('edit-2','w-5 h-5')}</a>
          <button id="del-customer" class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600">${icon('trash-2','w-5 h-5')}</button>
        `
      })}
      <div class="max-w-5xl mx-auto p-4 pb-24 sm:pb-4 space-y-4">
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
              <a href="${U.viberLink(c.phone, '')}" class="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('phone','w-4 h-4')} Viber</a>
              <a href="tel:${U.escape(c.phone)}" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('phone-call','w-4 h-4')} ${t('open')}</a>
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
      // delete cascade: services & vehicles
      for (const v of vs) {
        for (const s of servicesForVehicle(v.id)) await DB.remove('services', s.id);
        await DB.remove('vehicles', v.id);
      }
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
              <input type="text" name="name" id="cf-name" value="${U.escape(c.name || pendingName)}" required autocomplete="name" data-vi="1"
                class="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ${micBtn('cf-name')}
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">${t('customer_phone')}</label>
            <div class="flex gap-2">
              <input type="tel" name="phone" id="cf-phone" value="${U.escape(c.phone || '')}" placeholder="+30 69..." data-vi="1"
                class="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ${micBtn('cf-phone')}
            </div>
          </div>
          ${formField('email', t('customer_email'), c.email, { type: 'email', voice: true })}
          ${formField('address', t('customer_address'), c.address, { voice: true })}
          <div class="grid grid-cols-2 gap-3">
            ${formField('company', t('customer_company'), c.company, { voice: true })}
            ${formField('taxId', t('customer_tax_id'), c.taxId, { voice: true })}
          </div>
          ${formTextArea('notes', t('notes'), c.notes)}
          <!-- Contact methods (multi-select) -->
          <div>
            <label class="block text-sm font-medium mb-1">Τρόποι επικοινωνίας <span class="text-xs font-normal text-slate-400">(επίλεξε όσους έχει ο πελάτης)</span></label>
            <div class="grid grid-cols-3 gap-2" id="cm-grid">
              <button type="button" data-cm="sms" class="cm-btn flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-medium transition-all">
                ${icon('message-circle','w-5 h-5')} SMS
              </button>
              <button type="button" data-cm="viber" class="cm-btn flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-medium transition-all">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.4 0C5.2.4.6 5.2.6 11.4c0 2.2.6 4.3 1.8 6.1l-1.2 4.4 4.5-1.2c1.7 1 3.7 1.6 5.7 1.6 6.2 0 11-4.8 11.4-11C23 4.8 17.8-.4 11.4 0zm5.7 15.6c-.2.6-.9 1.1-1.6 1.2-.4.1-.9.1-1.4 0-2.7-.7-4.9-2.5-6.4-4.9-.8-1.3-1.3-2.7-1.4-4.2 0-.7.2-1.4.7-1.9.3-.3.6-.5.9-.5h.8c.3 0 .5.2.7.5l1 2.2c.1.3 0 .6-.2.8l-.6.7c-.1.2-.1.4 0 .6.5 1 1.3 1.9 2.3 2.5.2.1.4.1.6 0l.7-.7c.2-.2.5-.3.8-.2l2.2 1c.3.2.5.4.5.7v.8c0 .2-.1.3-.2.4h-.4z"/></svg>
                Viber
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
    const cmActive = { sms:'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700', viber:'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-600', whatsapp:'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600' };
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
        </div>
      `;
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
        else renderInfoTab();
      });
    });

    $('#del-vehicle').addEventListener('click', async () => {
      if (!confirm(t('confirm_delete'))) return;
      destroyCharts();
      for (const s of services) await DB.remove('services', s.id);
      await DB.remove('vehicles', v.id);
      U.toast(t('deleted'));
      go('/vehicles');
    });

    $('#send-reminder').addEventListener('click', () => openReminderDialog(v, c));
    $('#send-history').addEventListener('click', () => openShareHistoryDialog(v, c, services));
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
      await U.servicePdf({
        workshop: {
          name: state.settings.workshopName,
          address: state.settings.workshopAddress,
          phone: state.settings.workshopPhone,
          email: state.settings.workshopEmail,
        },
        customer: c, vehicle: v, service: s,
      });
    });

    $('#btn-print').addEventListener('click', () => window.print());

    $('#btn-share').addEventListener('click', () => openShareServiceDialog(s, v, c));
  }

  async function renderServiceForm(id) {
    let s = id ? serviceById(id) : {};
    if (id && !s) { go('/services'); return; }
    if (!id) {
      s = {
        date: new Date().toISOString().slice(0, 10),
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
            ${formField('date', t('service_date'), s.date ? s.date.slice(0,10) : new Date().toISOString().slice(0,10), { type: 'date', required: true })}
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

          ${formField('mechanic', t('service_mechanic'), s.mechanic, { voice: true })}

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

    $('#view').innerHTML = `
      ${pageHeader(t('reminders'), { back: false })}
      <div class="max-w-5xl mx-auto p-4 pb-24 sm:pb-4">
        ${!all.length ? emptyState('bell-off', t('no_reminders'), '', '') : ''}
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
      </div>
    `;

    // Wire up reminder buttons
    $$('[data-reminder]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const vid = btn.dataset.reminder;
        const v = vehicleById(vid);
        const c = customerById(v.customerId);
        openReminderDialog(v, c);
      });
    });
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
            <a href="${U.viberLink(c.phone, t('reminder_message_default', { customer: c.name, brand: r.v.brand||'', model: r.v.model||'', plate: r.v.plate||'' }))}" class="bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('phone','w-4 h-4')} Viber</a>
          </div>
        ` : `<div class="text-xs italic text-slate-400 pt-1">${t('customer_phone')}: —</div>`}
      </div>
    `;
  }

  function openReminderDialog(v, c) {
    if (!c) { U.toast(t('error_generic'), 'error'); return; }
    const msg = t('reminder_message_default', { customer: c.name, brand: v.brand||'', model: v.model||'', plate: v.plate||'' });
    openDialog(t('send_reminder'), `
      <div class="space-y-3">
        <textarea id="msg-text" rows="5" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">${U.escape(msg)}</textarea>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button id="send-wa" class="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-circle','w-4 h-4')} WhatsApp</button>
          <button id="send-vi" class="bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('phone','w-4 h-4')} Viber</button>
          <button id="send-sms" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-square','w-4 h-4')} SMS</button>
          <button id="send-em" class="bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('mail','w-4 h-4')} Email</button>
        </div>
      </div>
    `);
    setTimeout(() => {
      $('#send-wa').addEventListener('click', () => {
        window.open(U.whatsappLink(c.phone, $('#msg-text').value), '_blank');
      });
      $('#send-vi').addEventListener('click', () => {
        window.location.href = U.viberLink(c.phone, $('#msg-text').value);
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
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          ${c?.phone ? `
            <button id="send-wa" class="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-circle','w-4 h-4')} WhatsApp</button>
            <button id="send-vi" class="bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('phone','w-4 h-4')} Viber</button>
          ` : ''}
          ${c?.email ? `<button id="send-em" class="bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('mail','w-4 h-4')} Email</button>` : ''}
          <button id="send-copy" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('copy','w-4 h-4')} ${t('copy')}</button>
        </div>
      </div>
    `);
    setTimeout(() => {
      if (c?.phone) {
        $('#send-wa').addEventListener('click', () => window.open(U.whatsappLink(c.phone, $('#msg-text').value), '_blank'));
        $('#send-vi').addEventListener('click', () => { window.location.href = U.viberLink(c.phone, $('#msg-text').value); });
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
            <button id="send-vi" class="bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('phone','w-4 h-4')} Viber</button>
          ` : ''}
          <button id="send-copy" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('copy','w-4 h-4')} ${t('copy')}</button>
        </div>
      </div>
    `);
    setTimeout(() => {
      if (c?.phone) {
        $('#send-wa').addEventListener('click', () => window.open(U.whatsappLink(c.phone, $('#msg-text').value), '_blank'));
        $('#send-vi').addEventListener('click', () => { window.location.href = U.viberLink(c.phone, $('#msg-text').value); });
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
      const compressed = await U.compressImage(dataUrl, 2800, 0.95);
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
        : (c?.preferredContact ? [c.preferredContact] : ['whatsapp', 'viber', 'sms']);
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
              viber: viberLink ? `<a href="${viberLink}" class="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.4 0C5.2.4.6 5.2.6 11.4c0 2.2.6 4.3 1.8 6.1l-1.2 4.4 4.5-1.2c1.7 1 3.7 1.6 5.7 1.6 6.2 0 11-4.8 11.4-11C23 4.8 17.8-.4 11.4 0zm5.7 15.6c-.2.6-.9 1.1-1.6 1.2-.4.1-.9.1-1.4 0-2.7-.7-4.9-2.5-6.4-4.9-.8-1.3-1.3-2.7-1.4-4.2 0-.7.2-1.4.7-1.9.3-.3.6-.5.9-.5h.8c.3 0 .5.2.7.5l1 2.2c.1.3 0 .6-.2.8l-.6.7c-.1.2-.1.4 0 .6.5 1 1.3 1.9 2.3 2.5.2.1.4.1.6 0l.7-.7c.2-.2.5-.3.8-.2l2.2 1c.3.2.5.4.5.7v.8c0 .2-.1.3-.2.4h-.4z"/></svg>
                Viber
              </a>` : '',
              sms: phone ? `<a href="sms:${c?.phone}&body=${encodedMsg}" class="flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
                ${icon('message-circle','w-5 h-5')} SMS
              </a>` : '',
            };
            const btns = methods.map((k) => contactButtons[k] || '').filter(Boolean);
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
        <div>
          <div style="font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:1px;padding-bottom:5px;border-bottom:2px solid #e2e8f0;margin-bottom:8px;">${isEl ? 'ΣΗΜΕΙΩΣΕΙΣ' : 'NOTES'}</div>
          <div style="font-size:11.5px;color:#374151;line-height:1.6;background:#fffbeb;border-left:3px solid #f59e0b;padding:10px 12px;border-radius:4px;">${U.escape(jo.notes).replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}

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
      localStorage.setItem('lang', $('#lang-sel').value);
      localStorage.setItem('theme', $('#theme-sel').value);
      localStorage.setItem('currency', $('#curr-sel').value);
      applyTheme();
      U.toast(t('saved'));
      setTimeout(() => location.reload(), 600);
    });

    $('#export-data').addEventListener('click', async () => {
      const data = await DB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `synergeio-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    $('#import-data').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!confirm('Θα αντικαταστήσει όλα τα δεδομένα. Συνέχεια;')) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        await DB.importAll(data);
        U.toast(t('saved'));
        setTimeout(() => location.reload(), 600);
      } catch (err) {
        U.toast(t('error_generic'), 'error');
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
    const mic = opts.voice && isText ? micBtn(fieldId) : '';
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
    router();

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

