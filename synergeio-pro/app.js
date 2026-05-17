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
              <input type="checkbox" data-task="${key}" ${selectedTasks.has(key) ? 'checked' : ''} class="w-4 h-4 rounded accent-orange-500 flex-shrink-0" />
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
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (btn._rec) return;
        const target = document.getElementById(btn.dataset.vfor);
        if (!target) return;
        btn._rec = true;
        btn.classList.add('!bg-red-500', '!text-white');
        btn.innerHTML = icon('mic-off', 'w-4 h-4 animate-pulse');
        refreshIcons();
        const tr = btn.dataset.vtr;
        U.triggerVoice(target, {
          transform: tr === 'plate'
            ? (s) => s.toUpperCase().replace(/\s+/g, '').replace(/[^A-ZΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ0-9]/gi, '')
            : undefined,
          onEnd: () => {
            btn._rec = false;
            btn.classList.remove('!bg-red-500', '!text-white');
            btn.innerHTML = icon('mic', 'w-4 h-4');
            refreshIcons();
          },
        });
      });
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
    '/parts': renderPartsSearch,
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
      el.classList.toggle('text-orange-600', isActive);
      el.classList.toggle('dark:text-orange-400', isActive);
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
    $('#view').innerHTML = `
      <div class="min-h-screen flex flex-col">
        <!-- Top bar -->
        <div class="flex items-center justify-between px-4 pt-4 pb-2 sm:px-8 sm:pt-6">
          <div>
            <div class="text-xs text-slate-400">${t('dashboard_welcome')}</div>
            <div class="text-lg font-bold leading-tight">${U.escape(state.settings.workshopName || t('app_name'))}</div>
          </div>
          <button onclick="go('/settings')" class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
            ${icon('settings','w-5 h-5')}
          </button>
        </div>

        <!-- Hero plate search — vertically centered -->
        <div class="flex-1 flex flex-col items-center justify-center px-4 pb-24 sm:pb-12">
          <div class="w-full max-w-sm">

            <!-- Icon + title -->
            <div class="text-center mb-7">
              <div class="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/30">
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
                class="w-full px-4 py-4 rounded-2xl text-3xl font-bold tracking-widest uppercase text-center bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-500 border-0 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
                maxlength="12" />

              <!-- Action buttons row -->
              <div class="grid grid-cols-3 gap-2">
                <!-- Mic -->
                ${micBtn('dash-plate', { transform: 'plate', cls: 'w-full h-12 rounded-2xl bg-slate-700 text-slate-300 hover:bg-red-500 hover:text-white' })}

                <!-- Camera → plate OCR -->
                <button id="dash-plate-cam" class="h-12 flex items-center justify-center gap-1.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-colors" title="${t('plate_photo_btn')}">
                  ${icon('camera','w-5 h-5')} <span>${t('plate_photo_btn')}</span>
                </button>

                <!-- Search -->
                <button id="dash-plate-btn" class="h-12 flex items-center justify-center gap-1.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm transition-colors">
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
      </div>
    `;
    refreshIcons();

    // ---------- plate lookup ----------
    function plateLookup() {
      const raw = ($('#dash-plate')?.value || '').trim().toUpperCase().replace(/[\s\-]/g, '');
      if (!raw) return;
      const result = $('#dash-plate-result');
      const v = state.vehicles.find((x) => (x.plate || '').toUpperCase().replace(/[\s\-]/g, '') === raw);
      if (v) {
        const c = customerById(v.customerId);
        const lastSvc = servicesForVehicle(v.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const activeJOs = (state.jobOrders || []).filter((j) => j.vehicleId === v.id && j.status !== 'completed').length;
        result.innerHTML = `
          <div class="bg-white/10 rounded-2xl p-3 flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center flex-shrink-0">
              ${icon(vehicleIcon(v.type || 'car'), 'w-6 h-6')}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-sm text-white">${U.escape(v.brand || '')} ${U.escape(v.model || '')} <span class="text-slate-400 font-normal text-xs">${v.year || ''}</span></div>
              ${c ? `<div class="text-xs text-slate-300 truncate">${U.escape(c.name)}</div>` : ''}
              ${lastSvc ? `<div class="text-xs text-slate-400">τελ. service: ${U.fmtDate(lastSvc.date)}</div>` : ''}
              ${activeJOs ? `<div class="text-xs text-amber-400 font-medium">${activeJOs} ${t('plate_active_orders')}</div>` : ''}
            </div>
          </div>
          <div class="flex flex-col gap-2 mt-2">
            <button onclick="go('/job-orders/new?vehicle=${v.id}')" class="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors">
              ${icon('plus','w-4 h-4')} ${t('plate_new_order')}
            </button>
            <button onclick="go('/vehicles/${v.id}')" class="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm">
              ${icon('history','w-4 h-4')} ${t('plate_history')}
            </button>
          </div>`;
      } else {
        result.innerHTML = `
          <div class="text-center py-1">
            <p class="text-slate-400 text-sm mb-1">${t('plate_not_found')}</p>
            <p class="text-slate-500 text-xs mb-3">${t('plate_not_found_add')}</p>
            <div class="flex flex-col gap-2">
              <button onclick="go('/scan')" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm">
                ${icon('scan-line','w-4 h-4')} ${t('plate_scan_hint')}
              </button>
              <button onclick="go('/vehicles/new')" class="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm">
                ${icon('plus','w-4 h-4')} ${t('plate_new_vehicle')}
              </button>
            </div>
          </div>`;
      }
      refreshIcons();
    }

    // ---------- plate photo OCR ----------
    async function platePhotoOCR(file) {
      const result = $('#dash-plate-result');
      result.innerHTML = `<div class="text-center text-slate-400 text-sm py-2 flex items-center justify-center gap-2">${icon('loader','w-4 h-4 animate-spin')} ${t('plate_reading')}</div>`;
      refreshIcons();
      try {
        const dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(file);
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

  function statCard(iconName, value, label, href, color) {
    const colors = {
      sky: 'from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-900/10 text-orange-700 dark:text-orange-300',
      indigo: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-900/10 text-indigo-700 dark:text-indigo-300',
      emerald: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/10 text-emerald-700 dark:text-emerald-300',
      amber: 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-900/10 text-amber-700 dark:text-amber-300',
      red: 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/10 text-red-700 dark:text-red-300',
    };
    return `
      <a href="${href}" class="block bg-gradient-to-br ${colors[color]} rounded-xl p-3 border border-white/50 dark:border-white/5">
        <div class="flex items-center justify-between mb-2">${icon(iconName, 'w-5 h-5')}</div>
        <div class="text-2xl font-bold">${value}</div>
        <div class="text-xs opacity-80 truncate">${U.escape(label)}</div>
      </a>
    `;
  }

  function qaCard(iconName, label, href, color) {
    const colors = {
      sky: 'bg-orange-500 hover:bg-orange-600',
      indigo: 'bg-indigo-500 hover:bg-indigo-600',
      emerald: 'bg-emerald-500 hover:bg-emerald-600',
      purple: 'bg-purple-500 hover:bg-purple-600',
    };
    return `
      <a href="${href}" class="${colors[color]} text-white rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition shadow-sm hover:shadow-md aspect-square">
        ${icon(iconName, 'w-6 h-6')}
        <span class="text-xs text-center font-medium leading-tight">${U.escape(label)}</span>
      </a>
    `;
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
    const total = (s.parts || []).reduce((x, p) => x + (Number(p.qty) || 0) * (Number(p.price) || 0), 0)
      + (Number(s.laborHours) || 0) * (Number(s.laborRate) || 0);
    return `
      <a href="#/services/${s.id}" class="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
        <div class="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
          ${icon('wrench', 'w-5 h-5')}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">${U.escape(s.type || t('service'))} • ${U.escape(vehicleLabel(v))}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400 truncate">${U.fmtDate(s.date)} • ${U.escape(c?.name || '—')}</div>
        </div>
        <div class="text-sm font-semibold">${U.fmtMoney(total, state.settings.currency)}</div>
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
        actions: `<a href="#/customers/new" class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">${icon('plus','w-4 h-4')} ${t('add')}</a>`
      })}
      <div class="max-w-5xl mx-auto p-4 pb-24 sm:pb-4">
        <div class="relative mb-4">
          <input id="search-input" type="search" placeholder="${t('search')}" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500" />
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
        <div class="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 flex items-center justify-center font-semibold">
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
        ${ctaHref ? `<a href="${ctaHref}" class="inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">${icon('plus','w-4 h-4')} ${U.escape(ctaLabel)}</a>` : ''}
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
          ${c.phone ? `<div class="flex items-center gap-2"><span class="text-slate-400">${icon('phone','w-4 h-4')}</span><a href="tel:${U.escape(c.phone)}" class="text-orange-600 dark:text-orange-400">${U.escape(c.phone)}</a></div>` : ''}
          ${c.email ? `<div class="flex items-center gap-2"><span class="text-slate-400">${icon('mail','w-4 h-4')}</span><a href="mailto:${U.escape(c.email)}" class="text-orange-600 dark:text-orange-400">${U.escape(c.email)}</a></div>` : ''}
          ${c.address ? `<div class="flex items-center gap-2"><span class="text-slate-400">${icon('map-pin','w-4 h-4')}</span>${U.escape(c.address)}</div>` : ''}
          ${c.company ? `<div class="flex items-center gap-2"><span class="text-slate-400">${icon('briefcase','w-4 h-4')}</span>${U.escape(c.company)}</div>` : ''}
          ${c.taxId ? `<div class="flex items-center gap-2"><span class="text-slate-400">${icon('hash','w-4 h-4')}</span>ΑΦΜ: ${U.escape(c.taxId)}</div>` : ''}
          ${c.notes ? `<div class="text-sm text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-700">${U.escape(c.notes)}</div>` : ''}

          ${c.phone ? `
            <div class="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <a target="_blank" href="${U.whatsappLink(c.phone, '')}" class="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-circle','w-4 h-4')} WhatsApp</a>
              <a href="${U.viberLink(c.phone, '')}" class="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('phone','w-4 h-4')} Viber</a>
              <a href="tel:${U.escape(c.phone)}" class="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('phone-call','w-4 h-4')} ${t('open')}</a>
            </div>
          ` : ''}
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <h2 class="font-semibold">${t('customer_vehicles')}</h2>
            <a href="#/vehicles/new?customer=${c.id}" class="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">${icon('plus','w-4 h-4')} ${t('new_vehicle')}</a>
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
              <input type="text" name="name" id="cf-name" value="${U.escape(c.name || pendingName)}" required autocomplete="name"
                class="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              ${micBtn('cf-name')}
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">${t('customer_phone')}</label>
            <div class="flex gap-2">
              <input type="tel" name="phone" id="cf-phone" value="${U.escape(c.phone || '')}" placeholder="+30 69..."
                class="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              ${micBtn('cf-phone')}
            </div>
          </div>
          ${formField('email', t('customer_email'), c.email, { type: 'email' })}
          ${formField('address', t('customer_address'), c.address)}
          <div class="grid grid-cols-2 gap-3">
            ${formField('company', t('customer_company'), c.company)}
            ${formField('taxId', t('customer_tax_id'), c.taxId)}
          </div>
          ${formTextArea('notes', t('notes'), c.notes)}
          <div class="flex gap-2 pt-2">
            <button type="submit" class="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg">${t('save')}</button>
            <button type="button" onclick="history.back()" class="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-medium py-2.5 rounded-lg">${t('cancel')}</button>
          </div>
        </form>
      </div>
    `;
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
        actions: `<a href="#/vehicles/new" class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">${icon('plus','w-4 h-4')} ${t('add')}</a>`
      })}
      <div class="max-w-5xl mx-auto p-4 pb-24 sm:pb-4">
        <div class="flex gap-2 mb-4">
          <div class="relative flex-1">
            <input id="search-input" type="search" placeholder="${t('search')}" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500" />
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
    if (s.includes('λάδ') || s.includes('oil') || s.includes('λιπ')) return { icon: 'droplets', bg: 'bg-orange-500' };
    if (s.includes('φρέν') || s.includes('brake') || s.includes('τακάκ') || s.includes('δίσκ')) return { icon: 'disc', bg: 'bg-red-500' };
    if (s.includes('ελαστ') || s.includes('tire') || s.includes('ρόδ')) return { icon: 'circle-dot', bg: 'bg-slate-700' };
    if (s.includes('μπαταρ') || s.includes('battery')) return { icon: 'battery-charging', bg: 'bg-yellow-500' };
    if (s.includes('κτεο') || s.includes('inspect') || s.includes('έλεγχ')) return { icon: 'clipboard-check', bg: 'bg-blue-500' };
    if (s.includes('κλιματ') || s.includes('air') || s.includes('ac')) return { icon: 'wind', bg: 'bg-cyan-500' };
    return { icon: 'wrench', bg: 'bg-orange-400' };
  }

  function vehicleServiceCard(s) {
    const cfg = serviceIconConfig(s.type);
    const total = (s.parts || []).reduce((x, p) => x + (Number(p.qty)||0)*(Number(p.price)||0), 0)
      + (Number(s.laborHours)||0)*(Number(s.laborRate)||0);
    return `
      <a href="#/services/${s.id}" class="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
        <div class="w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0 shadow-sm">
          ${icon(cfg.icon, 'w-5 h-5 text-white')}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-xs text-slate-400 dark:text-slate-500">${U.fmtDate(s.date)}</div>
          <div class="font-semibold text-sm truncate">${U.escape(s.type || t('service'))}</div>
          ${s.mileage ? `<div class="text-xs text-slate-500 dark:text-slate-400">~${Number(s.mileage).toLocaleString()} km</div>` : ''}
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          ${total > 0 ? `<span class="text-sm font-semibold text-orange-600 dark:text-orange-400">${U.fmtMoney(total, state.settings.currency)}</span>` : ''}
          ${icon('chevron-right', 'w-4 h-4 text-slate-300 dark:text-slate-600')}
        </div>
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
        const p = (s.parts || []).reduce((x, p) => x + (Number(p.qty)||0)*(Number(p.price)||0), 0);
        const l = (Number(s.laborHours)||0)*(Number(s.laborRate)||0);
        months[mi].total += p + l;
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
    const totalSpent = services.reduce((sum, s) => {
      return sum + (s.parts || []).reduce((x, p) => x + (Number(p.qty)||0)*(Number(p.price)||0), 0)
        + (Number(s.laborHours)||0)*(Number(s.laborRate)||0);
    }, 0);

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
              <h2 class="text-2xl font-bold leading-tight">${U.escape(v.brand || '')} ${U.escape(v.model || '')} <span class="text-orange-500">${v.plate ? '(' + U.escape(v.plate) + ')' : v.year ? '(' + v.year + ')' : ''}</span></h2>
              ${v.plate ? `<div class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">${t('vehicle_plate')}: ${U.escape(v.plate)}</div>` : ''}
              ${v.mileage ? `<div class="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-1">${Number(v.mileage).toLocaleString()} km</div>` : ''}
            </div>
            <div class="w-20 h-16 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl flex items-center justify-center flex-shrink-0">
              ${icon(vehicleIcon(v.type), 'w-10 h-10 text-orange-400')}
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex gap-2 pb-3 overflow-x-auto no-scrollbar">
            <a href="#/services/new?vehicle=${v.id}" class="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 whitespace-nowrap shadow-sm flex-shrink-0">${icon('plus','w-4 h-4')} Νέα Καταγραφή</a>
            <a href="#/job-orders/new?vehicle=${v.id}" class="border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 text-sm font-medium px-4 py-2 rounded-full flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">${icon('clipboard-check','w-4 h-4')} Εντολή</a>
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
                <div class="w-14 h-14 mx-auto bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-3 text-orange-400">${icon('wrench','w-7 h-7')}</div>
                <div class="text-slate-400 text-sm">${t('no_service_history')}</div>
                <a href="#/services/new?vehicle=${v.id}" class="mt-3 inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium">${icon('plus','w-4 h-4')} Νέα Καταγραφή</a>
              </div>
            `}
          </div>

          <!-- Right: charts -->
          <div class="sm:col-span-2 p-4 space-y-4">
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold text-sm">Έξοδα Συντήρησης</h3>
                <span class="text-xs font-semibold text-orange-500">${U.fmtMoney(totalSpent, state.settings.currency)}</span>
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
              ${kv(t('vehicle_owner'), c ? `<a class="text-orange-600 dark:text-orange-400 font-semibold" href="#/customers/${c.id}">${U.escape(c.name)}</a>` : '—', true)}
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
          <a href="#/parts?vehicle=${v.id}" class="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:bg-orange-50 dark:hover:bg-orange-900/10">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">${icon('package','w-5 h-5')}</div>
              <span class="font-medium text-sm">${t('nav_parts')}</span>
            </div>
            ${icon('chevron-right','w-4 h-4 text-slate-400')}
          </a>
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
        <button type="button" class="cust-pick-row w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors" data-cid="${c.id}" data-cname="${U.escape(c.name)}">
          <div class="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 flex items-center justify-center font-bold text-sm flex-shrink-0">${U.escape(c.name.charAt(0).toUpperCase())}</div>
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
            <div id="vf-csel" class="${preselectedCustomer ? '' : 'hidden'} flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
              <div class="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">${preselectedCustomer ? U.escape(preselectedCustomer.name.charAt(0).toUpperCase()) : ''}</div>
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
                    class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                ${micBtn('vf-cq')}
                <a href="#/customers/new" class="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 flex-shrink-0" title="${t('new_customer')}">
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
                  <div class="border border-slate-200 dark:border-slate-700 rounded-lg py-2 text-center text-xs peer-checked:bg-orange-500 peer-checked:text-white peer-checked:border-orange-500">
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
                <input type="text" name="plate" id="vf-plate" value="${U.escape(v.plate || '')}" autocomplete="off" spellcheck="false"
                  class="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500" />
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
            <button type="submit" class="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg">${t('save')}</button>
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
        actions: `<a href="#/services/new" class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">${icon('plus','w-4 h-4')} ${t('add')}</a>`
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
    const partsTotal = (s.parts || []).reduce((x, p) => x + (Number(p.qty) || 0) * (Number(p.price) || 0), 0);
    const laborTotal = (Number(s.laborHours) || 0) * (Number(s.laborRate) || 0);
    const grand = partsTotal + laborTotal;

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
              <div class="text-lg font-bold">${U.escape(s.type || '—')}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-slate-500 dark:text-slate-400">${t('grand_total')}</div>
              <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400">${U.fmtMoney(grand, state.settings.currency)}</div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-slate-100 dark:border-slate-700">
            ${kv(t('vehicle'), v ? `<a class="text-orange-600 dark:text-orange-400" href="#/vehicles/${v.id}">${U.escape(vehicleLabel(v))}</a>` : '—', true)}
            ${kv(t('customer'), c ? `<a class="text-orange-600 dark:text-orange-400" href="#/customers/${c.id}">${U.escape(c.name)}</a>` : '—', true)}
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

        ${(s.parts && s.parts.length) ? `
          <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div class="text-xs text-slate-500 dark:text-slate-400 mb-2">${t('service_parts')}</div>
            <table class="w-full text-sm">
              <thead><tr class="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th class="py-1">${t('part_name')}</th>
                <th class="py-1">${t('part_code')}</th>
                <th class="py-1 text-right">${t('part_qty')}</th>
                <th class="py-1 text-right">${t('part_price')}</th>
                <th class="py-1 text-right">${t('service_total')}</th>
              </tr></thead>
              <tbody>
                ${s.parts.map((p) => `
                  <tr class="border-b border-slate-50 dark:border-slate-800 last:border-0">
                    <td class="py-2">${U.escape(p.name)}</td>
                    <td class="py-2 text-slate-500 dark:text-slate-400">${U.escape(p.code || '')}</td>
                    <td class="py-2 text-right">${p.qty}</td>
                    <td class="py-2 text-right">${U.fmtMoney(p.price, state.settings.currency)}</td>
                    <td class="py-2 text-right font-medium">${U.fmtMoney((Number(p.qty)||0)*(Number(p.price)||0), state.settings.currency)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-1 text-sm">
          <div class="flex justify-between"><span class="text-slate-500">${t('parts_total')}</span><span>${U.fmtMoney(partsTotal, state.settings.currency)}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">${t('labor_total')} (${s.laborHours || 0}h × ${U.fmtMoney(s.laborRate || 0, state.settings.currency)})</span><span>${U.fmtMoney(laborTotal, state.settings.currency)}</span></div>
          <div class="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-bold text-base"><span>${t('grand_total')}</span><span class="text-emerald-600 dark:text-emerald-400">${U.fmtMoney(grand, state.settings.currency)}</span></div>
        </div>

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
          <button id="btn-share" class="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-2.5 rounded-lg flex items-center justify-center gap-1">${icon('send','w-4 h-4')} ${t('send_to_customer')}</button>
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
        parts: [],
        laborRate: state.settings.laborRate || 35,
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

    $('#view').innerHTML = `
      ${pageHeader(id ? t('edit') + ' ' + t('service') : t('new_service'))}
      <div class="max-w-3xl mx-auto p-4 pb-24 sm:pb-4">
        <form id="service-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">${t('vehicle')} <span class="text-red-500">*</span></label>
            <select name="vehicleId" required class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <option value="">—</option>
              ${vehicleOptions}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            ${formField('date', t('service_date'), s.date ? s.date.slice(0,10) : new Date().toISOString().slice(0,10), { type: 'date', required: true })}
            <div>
              <label class="block text-sm font-medium mb-1">${t('service_type')}</label>
              <select name="type" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                ${['oil','regular','major','brakes','tires','inspection','repair','other'].map((tp) =>
                  `<option value="${t('service_type_'+tp)}" ${s.type===t('service_type_'+tp)?'selected':''}>${t('service_type_'+tp)}</option>`
                ).join('')}
              </select>
            </div>
          </div>

          ${formField('mileage', t('service_mileage'), s.mileage, { type: 'number' })}
          ${formTextArea('description', t('service_description'), s.description, { rows: 3, voice: true })}

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium">${t('service_parts')}</label>
              <button type="button" id="add-part" class="text-orange-600 dark:text-orange-400 text-sm flex items-center gap-1">${icon('plus','w-4 h-4')} ${t('parts_add')}</button>
            </div>
            <div id="parts-list" class="space-y-2"></div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            ${formField('laborHours', t('service_labor'), s.laborHours, { type: 'number', step: '0.25' })}
            ${formField('laborRate', t('service_labor_rate'), s.laborRate || state.settings.laborRate, { type: 'number', step: '0.01' })}
          </div>

          <div id="totals" class="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-sm space-y-1"></div>

          ${formField('mechanic', t('service_mechanic'), s.mechanic, { voice: true })}

          <div class="grid grid-cols-2 gap-3">
            ${formField('nextServiceDate', t('service_next_date'), s.nextServiceDate ? s.nextServiceDate.slice(0,10) : '', { type: 'date' })}
            ${formField('nextServiceMileage', t('service_next_in_km'), s.nextServiceMileage, { type: 'number' })}
          </div>

          <div class="flex gap-2 pt-2">
            <button type="submit" class="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg">${t('save')}</button>
            <button type="button" onclick="history.back()" class="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-medium py-2.5 rounded-lg">${t('cancel')}</button>
          </div>
        </form>
      </div>
    `;

    // Parts editor
    let parts = (s.parts || []).map((p) => ({ ...p }));
    const partsList = $('#parts-list');
    function renderParts() {
      partsList.innerHTML = parts.map((p, i) => `
        <div class="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
          <input data-i="${i}" data-k="name" type="text" placeholder="${t('part_name')}" value="${U.escape(p.name||'')}" class="col-span-5 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
          <input data-i="${i}" data-k="code" type="text" placeholder="${t('part_code')}" value="${U.escape(p.code||'')}" class="col-span-3 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
          <input data-i="${i}" data-k="qty" type="number" placeholder="Qty" value="${p.qty||1}" class="col-span-1 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
          <input data-i="${i}" data-k="price" type="number" step="0.01" placeholder="€" value="${p.price||''}" class="col-span-2 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
          <button type="button" data-del="${i}" class="col-span-1 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">${icon('x','w-4 h-4')}</button>
        </div>
      `).join('');
      refreshIcons();
      partsList.querySelectorAll('input').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const i = +e.target.dataset.i;
          const k = e.target.dataset.k;
          parts[i][k] = e.target.value;
          updateTotals();
        });
      });
      partsList.querySelectorAll('[data-del]').forEach((btn) => {
        btn.addEventListener('click', () => {
          parts.splice(+btn.dataset.del, 1);
          renderParts();
          updateTotals();
        });
      });
    }
    function updateTotals() {
      const pt = parts.reduce((x, p) => x + (Number(p.qty) || 0) * (Number(p.price) || 0), 0);
      const lh = Number($('[name=laborHours]').value) || 0;
      const lr = Number($('[name=laborRate]').value) || 0;
      const lt = lh * lr;
      $('#totals').innerHTML = `
        <div class="flex justify-between"><span class="text-slate-500">${t('parts_total')}</span><span>${U.fmtMoney(pt, state.settings.currency)}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">${t('labor_total')}</span><span>${U.fmtMoney(lt, state.settings.currency)}</span></div>
        <div class="flex justify-between font-bold pt-1 border-t border-slate-200 dark:border-slate-700"><span>${t('grand_total')}</span><span class="text-emerald-600 dark:text-emerald-400">${U.fmtMoney(pt + lt, state.settings.currency)}</span></div>
      `;
    }
    renderParts();
    updateTotals();

    $('#add-part').addEventListener('click', () => {
      parts.push({ name: '', code: '', qty: 1, price: 0 });
      renderParts();
    });
    $('[name=laborHours]').addEventListener('input', updateTotals);
    $('[name=laborRate]').addEventListener('input', updateTotals);

    $('#service-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = formData(e.target);
      data.parts = parts.filter((p) => p.name && (Number(p.qty) > 0));
      if (data.mileage) data.mileage = Number(data.mileage);
      if (data.laborHours) data.laborHours = Number(data.laborHours);
      if (data.laborRate) data.laborRate = Number(data.laborRate);
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

      U.toast(t('saved'));
      go('/services/' + saved.id);
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
          <button id="send-sms" class="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('message-square','w-4 h-4')} SMS</button>
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
    const partsTotal = (s.parts || []).reduce((x, p) => x + (Number(p.qty) || 0) * (Number(p.price) || 0), 0);
    const laborTotal = (Number(s.laborHours) || 0) * (Number(s.laborRate) || 0);
    lines.push(`${t('grand_total')}: ${U.fmtMoney(partsTotal + laborTotal, state.settings.currency)}`);
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
          <button id="send-copy" class="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('copy','w-4 h-4')} ${t('copy')}</button>
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
      const partsTotal = (s.parts || []).reduce((x, p) => x + (Number(p.qty) || 0) * (Number(p.price) || 0), 0);
      const laborTotal = (Number(s.laborHours) || 0) * (Number(s.laborRate) || 0);
      lines.push(`• ${U.fmtDate(s.date)} - ${s.type || '—'} (${s.mileage || 0}km) - ${U.fmtMoney(partsTotal+laborTotal, state.settings.currency)}`);
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
          <button id="send-copy" class="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('copy','w-4 h-4')} ${t('copy')}</button>
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
    const photos = [null, null, null]; // [license-front, license-back, odometer]

    $('#view').innerHTML = `
      ${pageHeader(t('ai_scan_title'))}
      <div class="max-w-2xl mx-auto p-4 pb-24 sm:pb-4 space-y-4">

        <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900/50 rounded-xl p-3 text-sm text-purple-800 dark:text-purple-200">
          ${t('ai_scan_instructions')}
        </div>

        <!-- License photos (front + back) -->
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
          <div class="flex items-center gap-2 text-sm font-semibold">
            ${icon('file-text','w-4 h-4 text-purple-500')}
            <span>${t('ai_scan_license_section')}</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-xl p-3 flex flex-col items-center gap-2 min-h-[140px] justify-center bg-purple-50/40 dark:bg-purple-900/10">
              <div id="prev0" class="hidden w-full"><img id="img0" class="rounded-lg w-full object-cover max-h-24" /></div>
              <div class="text-xs font-medium text-slate-500 dark:text-slate-400">${t('ai_scan_front')}</div>
              <label id="lbl0" class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium">
                ${icon('camera','w-3.5 h-3.5')} ${t('take_photo')}
                <input type="file" id="file0" accept="image/*" capture="environment" class="hidden" />
              </label>
            </div>
            <div class="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center gap-2 min-h-[140px] justify-center">
              <div id="prev1" class="hidden w-full"><img id="img1" class="rounded-lg w-full object-cover max-h-24" /></div>
              <div class="text-xs font-medium text-slate-500 dark:text-slate-400">${t('ai_scan_back')}</div>
              <label id="lbl1" class="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium">
                ${icon('camera','w-3.5 h-3.5')} ${t('take_photo')}
                <input type="file" id="file1" accept="image/*" capture="environment" class="hidden" />
              </label>
            </div>
          </div>
          <p class="text-xs text-slate-400 dark:text-slate-500 text-center">${t('ai_scan_tip')}</p>
        </div>

        <!-- Odometer photo -->
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
          <div class="flex items-center gap-2 text-sm font-semibold">
            ${icon('gauge','w-4 h-4 text-amber-500')}
            <span>${t('ai_scan_odometer')}</span>
            <span class="text-xs font-normal text-slate-400">(${t('optional')})</span>
          </div>
          <div class="border-2 border-dashed border-amber-200 dark:border-amber-800/50 rounded-xl p-3 flex flex-col items-center gap-2 min-h-[120px] justify-center bg-amber-50/40 dark:bg-amber-900/10">
            <div id="prev2" class="hidden w-full"><img id="img2" class="rounded-lg w-full object-cover max-h-24 mx-auto" style="max-width:200px" /></div>
            <div class="text-xs text-slate-500 dark:text-slate-400 text-center">${t('ai_scan_odometer_tip')}</div>
            <label id="lbl2" class="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium">
              ${icon('camera','w-3.5 h-3.5')} ${t('take_photo')}
              <input type="file" id="file2" accept="image/*" capture="environment" class="hidden" />
            </label>
          </div>
        </div>

        <!-- Analyze button — visible after at least 1 license photo -->
        <button id="btn-analyze" class="hidden w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2">
          ${icon('sparkles','w-5 h-5')} ${t('ai_scan_analyze')}
        </button>

        <div id="scan-result" class="hidden"></div>
      </div>
    `;
    refreshIcons();

    function updateAnalyzeBtn() {
      $('#btn-analyze').classList.toggle('hidden', !(photos[0] || photos[1]));
    }

    async function handleFile(idx, e) {
      const file = e.target.files[0];
      if (!file) return;
      const dataUrl = await U.readFileAsDataURL(file);
      const compressed = await U.compressImage(dataUrl, 1600, 0.85);
      photos[idx] = compressed;
      $(`#img${idx}`).src = compressed;
      $(`#prev${idx}`).classList.remove('hidden');
      const retakeCls = 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium';
      $(`#lbl${idx}`).className = retakeCls;
      updateAnalyzeBtn();
    }

    $('#file0').addEventListener('change', (e) => handleFile(0, e));
    $('#file1').addEventListener('change', (e) => handleFile(1, e));
    $('#file2').addEventListener('change', (e) => handleFile(2, e));

    $('#btn-analyze').addEventListener('click', async () => {
      const regPhotos = [photos[0], photos[1]].filter(Boolean);
      if (!regPhotos.length) return;

      const btn = $('#btn-analyze');
      btn.disabled = true;
      btn.innerHTML = `<span class="inline-block animate-spin mr-2">${icon('loader-2','w-5 h-5 inline')}</span>${t('ai_scan_processing')}`;
      refreshIcons();

      const data = await U.aiExtractRegistration(regPhotos, photos[2] || null);

      btn.disabled = false;
      btn.innerHTML = `${icon('sparkles','w-5 h-5')} ${t('ai_scan_analyze')}`;
      refreshIcons();

      const result = $('#scan-result');
      result.classList.remove('hidden');
      if (!data) {
        result.innerHTML = `<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 text-sm text-red-600 dark:text-red-400">${t('error_generic')}</div>`;
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

      const mileageHtml = data.mileage ? `
        ${kv(t('ai_scan_mileage_found'), Number(data.mileage).toLocaleString() + ' km')}` : '';

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
        </div>` : `
        <div class="flex gap-2">
          <button id="apply-scan" class="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2.5 rounded-lg">${t('ai_scan_apply')}</button>
          <button onclick="go('/scan')" class="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-medium py-2.5 rounded-lg">${t('ai_scan_retake')}</button>
        </div>`;

      result.innerHTML = `
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
          <h3 class="font-semibold flex items-center gap-2">${icon('car','w-4 h-4 text-orange-500')} ${t('vehicle')}</h3>
          <div class="grid grid-cols-2 gap-3 text-sm">
            ${ownerHtml}
            ${kv(t('vehicle_plate'), data.plate)}
            ${kv(t('vehicle_vin'), data.vin, true)}
            ${kv(t('vehicle_brand'), data.brand)}
            ${kv(t('vehicle_model'), data.model)}
            ${kv(t('vehicle_year'), data.year)}
            ${kv(t('vehicle_engine'), data.engine ? data.engine + ' cc' : '')}
            ${kv(t('vehicle_fuel'), data.fuel ? t('fuel_' + data.fuel) : '')}
            ${kv(t('vehicle_color'), data.color)}
            ${mileageHtml}
          </div>
          ${ownerQuestionHtml}
          ${data.ownerName ? `<div class="flex gap-2 pt-1">
            <button onclick="go('/scan')" class="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-medium py-2 rounded-lg text-sm">${t('ai_scan_retake')}</button>
          </div>` : ''}
        </div>
      `;
      refreshIcons();

      function applyAndGo(includeOwner) {
        const payload = { ...data, regPhoto: photos[0] };
        if (data.mileage) payload.mileage = data.mileage;
        sessionStorage.setItem('ai_scan_result', JSON.stringify(payload));
        if (includeOwner && data.ownerName) {
          sessionStorage.setItem('ai_scan_customer_name', data.ownerName);
        } else {
          sessionStorage.removeItem('ai_scan_customer_name');
        }
        go('/vehicles/new');
      }

      if (data.ownerName) {
        $('#apply-with-owner')?.addEventListener('click', () => applyAndGo(true));
        $('#apply-vehicle-only')?.addEventListener('click', () => applyAndGo(false));
      } else {
        $('#apply-scan')?.addEventListener('click', () => applyAndGo(false));
      }
    });
  }

  // =========================================================
  //  PARTS SEARCH
  // =========================================================
  async function renderPartsSearch() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    const vid = qs.get('vehicle');
    let v = vid ? vehicleById(vid) : null;

    const vehicleOptions = state.vehicles
      .slice().sort((a, b) => (a.brand || '').localeCompare(b.brand || ''))
      .map((vv) => `<option value="${vv.id}" ${v && v.id===vv.id?'selected':''}>${U.escape(vehicleLabel(vv))}</option>`).join('');

    $('#view').innerHTML = `
      ${pageHeader(t('parts_search_title'))}
      <div class="max-w-3xl mx-auto p-4 pb-24 sm:pb-4 space-y-4">
        <p class="text-sm text-slate-500 dark:text-slate-400">${t('parts_search_intro')}</p>

        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
          <div>
            <label class="block text-sm font-medium mb-1">${t('vehicle')}</label>
            <select id="ps-vehicle" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <option value="">${t('select_customer').replace('πελάτη','όχημα').replace('customer','vehicle')}</option>
              ${vehicleOptions}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">${t('parts_search_text')}</label>
            <input id="ps-text" type="text" placeholder="πχ. σετ φρένων, αμορτισέρ, λάδια..." class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
        </div>

        <div id="parts-links"></div>
      </div>
    `;

    function renderLinks() {
      const sel = $('#ps-vehicle').value;
      const veh = sel ? vehicleById(sel) : (v || {});
      const q = $('#ps-text').value;
      const fullQuery = q || `${veh.brand || ''} ${veh.model || ''} ${veh.year || ''}`.trim();
      const links = U.partsSearchLinks(veh || {}, fullQuery);
      $('#parts-links').innerHTML = `
        ${veh && veh.id ? `
          <div class="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-3 text-sm">
            <div class="font-medium">${U.escape(vehicleLabel(veh))}</div>
            ${veh.vin ? `<div class="text-xs text-slate-500 dark:text-slate-400">VIN: ${U.escape(veh.vin)}</div>` : ''}
          </div>
        ` : ''}
        <div class="text-xs text-slate-500 dark:text-slate-400 mb-2">${t('parts_open_in')}</div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          ${links.map((l) => `
            <a target="_blank" rel="noopener" href="${l.url}" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl p-3 flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 flex items-center justify-center">${icon(l.icon, 'w-4 h-4')}</div>
              <div class="text-sm font-medium truncate">${U.escape(l.name)}</div>
            </a>
          `).join('')}
        </div>
      `;
      refreshIcons();
    }
    renderLinks();
    $('#ps-vehicle').addEventListener('change', renderLinks);
    $('#ps-text').addEventListener('input', U.debounce(renderLinks, 200));
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
        actions: `<a href="#/job-orders/new" class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">${icon('plus','w-4 h-4')} ${t('add')}</a>`
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
    if (!id && prefVehicle && !jo.vehicleId) jo.vehicleId = prefVehicle;

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
          <h2 class="font-semibold flex items-center gap-2">${icon('car','w-4 h-4 text-orange-500')} ${t('vehicle')}</h2>
          <select id="jo-vehicle" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <option value="">— ${t('select_vehicle')} —</option>
            ${vehicleOptions}
          </select>
          <div class="flex gap-2">
            <a href="#/scan" class="flex-1 border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('scan-line','w-4 h-4')} ${t('qa_scan_doc')}</a>
            <a href="#/vehicles/new" class="flex-1 border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1">${icon('plus','w-4 h-4')} ${t('new_vehicle')}</a>
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
            <button type="button" id="add-custom-task" class="text-sm text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">${icon('plus','w-3 h-3')} ${t('jo_add_custom')}</button>
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
          <h2 class="font-semibold flex items-center gap-2 mb-3">${icon('message-square','w-4 h-4 text-slate-500')} ${t('notes')} ${micBtn('jo-notes', { cls: 'ml-auto' })}</h2>
          <textarea id="jo-notes" rows="2" placeholder="${t('jo_notes_placeholder')}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">${U.escape(jo.notes || '')}</textarea>
        </div>

        <div class="flex gap-2">
          <button id="save-jo" class="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg">${t('save')}</button>
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
        <input id="${uid}" type="text" class="custom-task-input flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" value="${U.escape(value || '')}" placeholder="${t('task_custom_placeholder')}" />
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
            ${kv(t('vehicle'), v ? `<a class="text-orange-600 dark:text-orange-400" href="#/vehicles/${v.id}">${U.escape(vehicleLabel(v))}</a>` : '—', true)}
            ${kv(t('vehicle_plate'), v?.plate)}
            ${kv(t('customer'), c ? `<a class="text-orange-600 dark:text-orange-400" href="#/customers/${c.id}">${U.escape(c.name)}</a>` : '—')}
            ${kv(t('customer_phone'), c?.phone ? `<a href="tel:${U.escape(c.phone)}" class="text-orange-600 dark:text-orange-400">${U.escape(c.phone)}</a>` : '—')}
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
            <div class="bg-orange-500 h-1.5 rounded-full" style="width:${progress}%"></div>
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
      const allDone = taskCount > 0 && doneCount === taskCount;
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
            ${(jo.tasks || []).map((key, idx) => `
              <div class="border-b last:border-b-0 border-slate-100 dark:border-slate-700">
                <div class="flex items-center gap-3 p-3">
                  <input type="checkbox" id="cb-${idx}" data-key="${key}" ${jo.completedTasks?.[key] ? 'checked' : ''} class="task-cb w-5 h-5 rounded accent-emerald-500 flex-shrink-0 cursor-pointer" />
                  <label for="cb-${idx}" class="flex-1 text-sm cursor-pointer ${jo.completedTasks?.[key] ? 'line-through text-slate-400' : ''}">${taskLabel(key)}</label>
                  ${!key.startsWith('custom:') ? `<button class="parts-btn text-xs border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-2 py-1 rounded-lg flex items-center gap-1 whitespace-nowrap" data-idx="${idx}" data-key="${key}" data-task="${U.escape(t('task_' + key))}">${icon('package','w-3 h-3')} ${t('parts_ai_btn')}</button>` : ''}
                </div>
                <div class="parts-panel hidden px-3 pb-3 pt-1" id="parts-panel-${idx}"></div>
              </div>
            `).join('')}
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
      const progress = taskCount ? Math.round((doneCount / taskCount) * 100) : 0;
      const allDone = taskCount > 0 && doneCount === taskCount;
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
      U.toast(t('jo_completed_msg'));
      if (confirm(t('jo_export_pdf_prompt'))) {
        await loadAll();
        jobOrderPdf(jobOrderById(id));
      }
      go('/job-orders/' + id);
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

    // Parts AI buttons
    $$('.parts-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = btn.dataset.idx;
        const panel = $(`#parts-panel-${idx}`);
        if (!panel) return;
        if (!panel.classList.contains('hidden')) {
          panel.classList.add('hidden');
          return;
        }
        panel.classList.remove('hidden');
        panel.innerHTML = `<div class="text-sm text-slate-400 flex items-center gap-2">${icon('loader','w-4 h-4 animate-spin')} ${t('parts_ai_searching')}</div>`;
        refreshIcons();
        try {
          const result = await fetchPartsAI(v, btn.dataset.task);
          panel.innerHTML = renderPartsAIResult(result, v);
          panel.querySelectorAll('.price-search-btn').forEach((pbtn) => {
            pbtn.addEventListener('click', async () => {
              const targetId = pbtn.dataset.target;
              const target = document.getElementById(targetId);
              if (!target) return;
              pbtn.disabled = true;
              pbtn.innerHTML = `${icon('loader','w-3 h-3 animate-spin')} Αναζήτηση...`;
              target.classList.remove('hidden');
              target.innerHTML = `<div class="text-xs text-slate-400 flex items-center gap-1 py-1">${icon('loader','w-3 h-3 animate-spin')} Αναζήτηση τιμών...</div>`;
              refreshIcons();
              try {
                const priceData = await fetchPartPrices(pbtn.dataset.query, pbtn.dataset.oem, pbtn.dataset.brandPn, v);
                target.innerHTML = renderPriceResults(priceData, pbtn.dataset.query);
              } catch (e) {
                target.innerHTML = `<p class="text-xs text-red-500">Σφάλμα αναζήτησης τιμών</p>`;
              }
              pbtn.remove();
              refreshIcons();
            });
          });
        } catch (e) {
          panel.innerHTML = `<p class="text-sm text-red-500">${t('parts_ai_error')}</p>`;
        }
        refreshIcons();
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
              ${s.c?.phone ? `<a href="tel:${U.escape(s.c.phone)}" onclick="event.stopPropagation()" class="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full flex items-center gap-1">${icon('phone','w-3 h-3')} ${t('jo_call_customer')}</a>` : ''}
            </div>
          </div>
        </a>
      `;
    }

    $('#view').innerHTML = `
      ${pageHeader(t('schedule_title'), { back: false, actions: `<a href="#/job-orders/new" class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">${icon('plus','w-4 h-4')} ${t('add')}</a>` })}
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
    const colorMap = { orange: 'text-orange-600 dark:text-orange-400', blue: 'text-blue-600 dark:text-blue-400', green: 'text-green-600 dark:text-green-400' };

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
      const label = key.startsWith('custom:') ? key.slice(7) : t('task_' + key);
      return `<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:15px;color:${done ? '#10b981' : '#cbd5e1'};flex-shrink:0;">${done ? '✓' : '○'}</span>
        <span style="font-size:11.5px;">${U.escape(label)}</span>
      </div>`;
    }).join('');

    const statusLabel = jo.status === 'completed' ? (isEl ? 'Ολοκληρωμένη' : 'Completed')
      : jo.status === 'in_progress' ? (isEl ? 'Σε εξέλιξη' : 'In Progress')
      : (isEl ? 'Εκκρεμεί' : 'Pending');
    const statusStyle = jo.status === 'completed' ? 'background:#d1fae5;color:#065f46'
      : jo.status === 'in_progress' ? 'background:#dbeafe;color:#1e40af'
      : 'background:#fef3c7;color:#92400e';

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#1e293b;background:white;width:794px;padding:36px 40px 36px 40px;box-sizing:border-box;">

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
          <h2 class="font-semibold">${t('ai_settings')}</h2>
          <div class="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900/40 rounded-lg p-3">
            ${icon('sparkles','w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0')}
            <div>
              <div class="text-sm font-medium">Claude AI (Anthropic)</div>
              <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">claude-haiku-4-5 · Ενεργό · Ασφαλές</div>
            </div>
            <span class="ml-auto text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">ON</span>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h2 class="font-semibold">${t('data_management')}</h2>
          <div class="grid grid-cols-2 gap-2">
            <button id="export-data" class="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-3 py-2.5 rounded-lg flex items-center justify-center gap-1">${icon('download','w-4 h-4')} ${t('export_backup')}</button>
            <label class="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer">
              ${icon('upload','w-4 h-4')} ${t('import_backup')}
              <input type="file" id="import-data" accept="application/json" class="hidden" />
            </label>
          </div>
          <button id="reset-data" class="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/30 text-sm font-medium px-3 py-2.5 rounded-lg flex items-center justify-center gap-1">${icon('trash-2','w-4 h-4')} ${t('reset_data')}</button>
        </div>

        <button id="save-settings" class="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg">${t('save')}</button>
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
          <input id="${fieldId}" type="${opts.type||'text'}" name="${name}" value="${U.escape(value==null?'':value)}" ${opts.required?'required':''} ${opts.step?`step="${opts.step}"`:''} placeholder="${U.escape(opts.placeholder||'')}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          ${mic}
        </div>
      </div>
    `;
  }

  function formTextArea(name, label, value, opts) {
    opts = opts || {};
    const fieldId = opts.id || `ta-${name}`;
    const mic = opts.voice !== false ? micBtn(fieldId, { cls: 'ml-auto' }) : '';
    return `
      <div>
        <label class="block text-sm font-medium mb-1 flex items-center gap-1">${U.escape(label)} ${mic}</label>
        <textarea id="${fieldId}" name="${name}" rows="${opts.rows||2}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500">${U.escape(value==null?'':value)}</textarea>
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

