// ===== SUPABASE =====
const SUPABASE_URL = 'https://alqsoajntjmwkzfekwgg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscXNvYWpudGptd2t6ZmVrd2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTQ2NzYsImV4cCI6MjA5NDk3MDY3Nn0.KV3HqJlCmb3nCS7rp8It4TZJx0QhfK7YV6VtydI302U';
let _supaClient = null;
function getSupa() {
  if (!_supaClient && window.supabase) {
    _supaClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supaClient;
}

// ===== DEFAULT SERVICES (simplified - user can customize) =====
const DEFAULT_SERVICES = [
  { id: 'wash_ext',   name: 'Πλύσιμο Εξωτερικό',          basePrice: 8,  duration: 20 },
  { id: 'vacuum',     name: 'Ηλεκτρική Σκούπα',            basePrice: 6,  duration: 15 },
  { id: 'wash_combo', name: 'Πλύσιμο + Σκούπα (Combo)',    basePrice: 12, duration: 30 },
  { id: 'foam',       name: 'Αφρός (Foam Wash)',            basePrice: 18, duration: 30 },
  { id: 'int_full',   name: 'Βαθύς Καθαρισμός Εσωτερικού', basePrice: 30, duration: 60 },
  { id: 'wax',        name: 'Κερί (Hand Wax)',              basePrice: 25, duration: 45 },
  { id: 'wheels',     name: 'Καθαρισμός Ζαντών',           basePrice: 10, duration: 20 },
  { id: 'glass',      name: 'Καθαρισμός Τζαμιών',          basePrice: 8,  duration: 15 },
];

const VEHICLE_TYPES = ['small','sedan','suv','van','truck','moto'];
const VEHICLE_LABELS = { small:'Μικρό', sedan:'Sedan/Hatch', suv:'SUV/Jeep', van:'Van/MPV', truck:'Pick-up', moto:'Μοτο/Σκούτερ' };
const PRICE_MULTIPLIERS = { small:0.85, sedan:1.0, suv:1.2, van:1.3, truck:1.25, moto:0.7 };

// ===== STATE =====
let state = {
  currentPage: 'dashboard',
  prevPage: null,
  jobs: [],
  settings: {
    shopName: 'CarWash Pro',
    shopPhone: '',
    shopAddress: '',
    services: null,
    completionMsg: 'Αγαπητέ/ή {name}, το όχημά σας {plate} είναι έτοιμο για παραλαβή από το κατάστημά μας! Σας ευχαριστούμε!',
    thankYouMsg: 'Αγαπητέ/ή {name}, σας ευχαριστούμε θερμά για την εμπιστοσύνη σας! Θα χαρούμε να σας εξυπηρετήσουμε ξανά σύντομα!',
    reviewUrl: ''
  }
};

let form = {};
let estimatedMinutes = 30;
let currentJobId = null;
let appointments = [];
let apptSelectedDate = new Date();
let _apptSubscription = null;

// ===== INIT =====
function init() {
  loadData();
  updateClock();
  setInterval(updateClock, 60000);
  setTimeout(() => {
    document.getElementById('splash').classList.add('out');
    setTimeout(() => {
      document.getElementById('splash').style.display = 'none';
      document.getElementById('app').classList.remove('hidden');
      showPage('dashboard');
      subscribeToNewBookings();
      updateApptBadge();
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }, 500);
  }, 1800);
}

function loadData() {
  const saved = localStorage.getItem('carwash_data');
  if (saved) {
    const d = JSON.parse(saved);
    state.jobs = d.jobs || [];
    state.settings = { ...state.settings, ...d.settings };
  }
  if (!state.settings.services || state.settings.services.length === 0) {
    state.settings.services = DEFAULT_SERVICES.map(s => ({ ...s }));
  }
}

function saveData() {
  localStorage.setItem('carwash_data', JSON.stringify({
    jobs: state.jobs,
    settings: state.settings
  }));
}

function updateClock() {
  const now = new Date();
  const days = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
  const months = ['Ιαν','Φεβ','Μαρ','Απρ','Μαΐ','Ιουν','Ιουλ','Αυγ','Σεπ','Οκτ','Νοε','Δεκ'];
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
  document.getElementById('topDate').textContent = dateStr;
  const dashDay = document.getElementById('dashDay');
  if (dashDay) dashDay.innerHTML = `${days[now.getDay()]}<br>${now.getDate()} ${months[now.getMonth()]}`;
  const h = now.getHours();
  const greetingEl = document.getElementById('greeting');
  if (greetingEl) greetingEl.textContent = h < 12 ? 'Καλημέρα! ☀️' : h < 17 ? 'Καλό απόγευμα! 🌤️' : 'Καλησπέρα! 🌙';
  const sidebarDate = document.getElementById('sidebarDate');
  if (sidebarDate) sidebarDate.innerHTML = `${dateStr}<br><span style="font-size:1rem;color:rgba(255,255,255,0.85);font-family:'Syne',sans-serif;font-weight:700">${pad(h)}:${pad(now.getMinutes())}</span>`;
}

// ===== NAVIGATION =====
function showPage(page) {
  ['dashboard','active','history','settings','advisor','appointments'].forEach(p => {
    const el = document.getElementById('nav-' + p);
    if (el) el.classList.toggle('active', p === page);
    const sel = document.getElementById('snav-' + p);
    if (sel) sel.classList.toggle('active', p === page);
  });

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  const backBtn = document.getElementById('backBtn');
  const titleEl = document.getElementById('pageTitle');

  if (page === 'jobDetail') {
    backBtn.classList.remove('hidden');
    titleEl.innerHTML = '<span style="font-family:Syne;font-weight:700;font-size:1.1rem;color:var(--blue)">Εργασία</span>';
  } else if (page === 'newJob') {
    backBtn.classList.remove('hidden');
    titleEl.innerHTML = '<span style="font-family:Syne;font-weight:700;font-size:1.1rem;color:var(--blue)">Νέα Εργασία</span>';
  } else {
    backBtn.classList.add('hidden');
    titleEl.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="30" fill="#0F4C81"/>
        <path d="M16 38 Q32 22 48 38" stroke="#00C2FF" stroke-width="3" fill="none" stroke-linecap="round"/>
        <rect x="22" y="28" width="20" height="10" rx="3" fill="white" opacity="0.9"/>
        <rect x="24" y="24" width="16" height="6" rx="2" fill="white" opacity="0.7"/>
      </svg>
      <span>CarWash Pro</span>`;
  }

  state.prevPage = state.currentPage;
  state.currentPage = page;

  if (page === 'dashboard') renderDashboard();
  if (page === 'active') renderActivePage();
  if (page === 'history') renderHistory('all');
  if (page === 'settings') renderSettings();
  if (page === 'newJob') initNewJob();
  if (page === 'advisor') renderAdvisorPage();
  if (page === 'appointments') { renderAppointmentsPage(); loadAppointments(); }
}

function goBack() {
  showPage(state.prevPage || 'dashboard');
}

// ===== DASHBOARD =====
function renderDashboard() {
  const today = new Date().toDateString();
  const todayJobs = state.jobs.filter(j => new Date(j.createdAt).toDateString() === today);
  const activeJobs = state.jobs.filter(j => j.status === 'active' || j.status === 'ready');
  const doneToday = todayJobs.filter(j => j.status === 'done');
  const revenueToday = doneToday.reduce((s, j) => s + (j.finalTotal || j.total || 0), 0);

  document.getElementById('statToday').textContent = todayJobs.length;
  document.getElementById('statActive').textContent = activeJobs.length;
  document.getElementById('statDone').textContent = doneToday.length;
  document.getElementById('statRevenue').textContent = revenueToday.toFixed(0) + '€';

  const badge = document.getElementById('activeBadge');
  badge.textContent = activeJobs.length;
  badge.style.display = activeJobs.length > 0 ? 'flex' : 'none';
  const sideBadge = document.getElementById('sideActiveBadge');
  if (sideBadge) { sideBadge.textContent = activeJobs.length; sideBadge.style.display = activeJobs.length > 0 ? 'flex' : 'none'; }

  const container = document.getElementById('dashActiveJobs');
  if (activeJobs.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🚿</div><p>Δεν υπάρχουν ενεργές εργασίες</p><button class="btn-primary" onclick="showPage('newJob')">+ Νέα Εργασία</button></div>`;
  } else {
    container.innerHTML = activeJobs.slice(0, 4).map(j => jobCardHTML(j)).join('');
  }

  renderMiniChart();
  renderTopServices();
}

function renderMiniChart() {
  const container = document.getElementById('dashChart');
  if (!container) return;
  const dayNames = ['Κυρ','Δευ','Τρι','Τετ','Πεμ','Παρ','Σαβ'];
  const days = [];
  let maxRev = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const dayJobs = state.jobs.filter(j => j.status === 'done' && new Date(j.deliveredAt || j.createdAt).toDateString() === dateStr);
    const rev = dayJobs.reduce((s, j) => s + (j.finalTotal || j.total || 0), 0);
    days.push({ label: dayNames[d.getDay()], rev, count: dayJobs.length, isToday: i === 0 });
    if (rev > maxRev) maxRev = rev;
  }
  const scale = maxRev || 1;
  const weekTotal = days.reduce((s, d) => s + d.rev, 0);
  container.innerHTML = `
    <div class="chart-bars">
      ${days.map(d => `
        <div class="chart-bar-group">
          <div class="chart-bar-wrap">
            <div class="chart-bar${d.isToday ? ' chart-bar-today' : ''}" style="height:${Math.max(4, Math.round((d.rev / scale) * 100))}%"
                 title="${d.label}: ${d.rev.toFixed(0)}€ (${d.count} εργασίες)"></div>
          </div>
          <div class="chart-bar-val">${d.rev > 0 ? d.rev.toFixed(0) + '€' : '—'}</div>
          <div class="chart-bar-label${d.isToday ? ' today' : ''}">${d.label}</div>
        </div>`).join('')}
    </div>
    <div class="chart-footer">Σύνολο 7 ημερών: <strong>${weekTotal.toFixed(0)}€</strong> · ${days.reduce((s,d) => s + d.count, 0)} εργασίες</div>`;
}

function renderTopServices() {
  const container = document.getElementById('dashTopServices');
  if (!container) return;
  const counts = {}, revenues = {};
  state.jobs.filter(j => j.status === 'done').forEach(j => {
    j.tasks.forEach(t => {
      counts[t.name] = (counts[t.name] || 0) + 1;
      revenues[t.name] = (revenues[t.name] || 0) + t.price;
    });
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (top.length === 0) {
    container.innerHTML = '<p class="chart-empty">Δεν υπάρχουν δεδομένα ακόμα. Ολοκληρώστε εργασίες για να δείτε στατιστικά.</p>';
    return;
  }
  const maxCount = top[0][1];
  container.innerHTML = top.map(([name, count]) => `
    <div class="top-svc-item">
      <span class="top-svc-name">${name}</span>
      <div class="top-svc-bar-wrap"><div class="top-svc-bar" style="width:${Math.round((count / maxCount) * 100)}%"></div></div>
      <span class="top-svc-count">${count}x</span>
      <span class="top-svc-rev">${(revenues[name] || 0).toFixed(0)}€</span>
    </div>`).join('');
}

// ===== JOB CARD HTML =====
function jobCardHTML(job) {
  const completed = job.tasks.filter(t => t.done).length;
  const total = job.tasks.length;
  const pct = total > 0 ? (completed / total * 100) : 0;
  const statusLabel = job.status === 'ready' ? 'Έτοιμο ✅' : `${completed}/${total} εργασίες`;
  const badgeClass = job.status === 'ready' ? 'badge-ready' : 'badge-active';
  const cardClass = job.status === 'ready' ? 'status-ready' : 'status-active';
  const elapsed = formatElapsed(job.createdAt);
  return `
    <div class="job-card ${cardClass}" onclick="openJobDetail('${job.id}')">
      <div class="job-card-top">
        <div class="job-plate">${job.plate}</div>
        <span class="job-status-badge ${badgeClass}">${statusLabel}</span>
      </div>
      <div class="job-car-info">${job.brand} ${job.model} · ${VEHICLE_LABELS[job.vehicleType] || ''} · ${job.color || ''}</div>
      <div class="job-customer">
        <span>${commIcon(job.commMethod)}</span>
        <strong>${job.customerName}</strong>
        <span style="color:var(--text3)">· ${job.customerPhone}</span>
      </div>
      <div class="job-timer-row">
        <span class="job-timer">⏱ ${elapsed}</span>
        <div class="job-progress"><div class="job-progress-fill" style="width:${pct}%"></div></div>
        <span style="font-size:0.75rem;color:var(--text2);font-weight:700">${pct.toFixed(0)}%</span>
      </div>
    </div>`;
}

function commIcon(method) {
  const icons = { phone:'📞', sms:'💬', whatsapp:'🟢', email:'📧' };
  return icons[method] || '📞';
}

function formatElapsed(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}λ πριν`;
  const h = Math.floor(m / 60);
  return `${h}ω ${m % 60}λ`;
}

// ===== NEW JOB =====
function initNewJob() {
  form = { plate:'', brand:'', model:'', vehicleType:'', color:'', colorName:'', customerName:'', customerPhone:'', customerEmail:'', commMethod:'', notes:'', selectedServices:[], pickupTime:'', estimatedMin:30 };
  estimatedMinutes = 30;
  ['plateInput','modelInput','customerName','customerPhone','customerEmail','customerNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('brandSelect').value = '';
  document.querySelectorAll('.vtype-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  document.querySelectorAll('.comm-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('colorLabel').textContent = '—';
  hidePlateHistory();

  const d = new Date(Date.now() + 2 * 3600000);
  d.setMinutes(0);
  document.getElementById('pickupTime').value = d.toISOString().slice(0, 16);

  // Plate history listener
  const plateInput = document.getElementById('plateInput');
  plateInput.oninput = function() {
    this.value = this.value.toUpperCase();
    const plate = this.value.trim();
    if (plate.length >= 3) {
      const past = state.jobs.filter(j => j.plate === plate && j.status !== 'active' && j.status !== 'ready')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      if (past) showPlateHistory(past); else hidePlateHistory();
    } else {
      hidePlateHistory();
    }
  };

  goToStep1();
}

// ===== PLATE HISTORY =====
function showPlateHistory(job) {
  const el = document.getElementById('plateHistoryCard');
  if (!el) return;
  el.classList.remove('hidden');
  const dt = new Date(job.createdAt).toLocaleDateString('el-GR', { day:'2-digit', month:'2-digit', year:'2-digit' });
  el.innerHTML = `
    <div class="plate-history">
      <div class="plate-history-left">
        <div class="plate-history-icon"></div>
        <div>
          <div class="plate-history-name">Επαναλαμβανόμενος πελάτης</div>
          <div class="plate-history-meta">${job.customerName} · ${job.customerPhone} · ${VEHICLE_LABELS[job.vehicleType] || ''}</div>
          <div class="plate-history-date">Τελευταία επίσκεψη: ${dt}</div>
        </div>
      </div>
      <button class="btn-primary" onclick="fillFromHistory('${job.id}')" style="white-space:nowrap;flex-shrink:0">Συμπλήρωση ↓</button>
    </div>`;
}

function hidePlateHistory() {
  const el = document.getElementById('plateHistoryCard');
  if (el) el.classList.add('hidden');
}

// ===== VOICE INPUT =====
let _activeRecognition = null;

function startVoiceInput(fieldId) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast('Φωνητική εισαγωγή μη διαθέσιμη σε αυτό το πρόγραμμα', 'error'); return; }

  const btn = document.querySelector(`[data-voice="${fieldId}"]`);

  if (_activeRecognition) {
    _activeRecognition.stop();
    _activeRecognition = null;
    if (btn) btn.classList.remove('voice-active');
    return;
  }

  const recognition = new SR();
  recognition.lang = 'el-GR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  _activeRecognition = recognition;

  if (btn) btn.classList.add('voice-active');
  showToast('Ακούω...', '');

  recognition.onresult = function(e) {
    const text = e.results[0][0].transcript;
    const el = document.getElementById(fieldId);
    if (el) { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); }
    showToast('"' + text + '"', 'success');
  };

  recognition.onerror = function() {
    if (btn) btn.classList.remove('voice-active');
    _activeRecognition = null;
    showToast('Αποτυχία φωνητικής εισαγωγής', 'error');
  };

  recognition.onend = function() {
    if (btn) btn.classList.remove('voice-active');
    _activeRecognition = null;
  };

  recognition.start();
}

function fillFromHistory(jobId) {
  const job = state.jobs.find(j => j.id === jobId);
  if (!job) return;
  document.getElementById('customerName').value = job.customerName || '';
  document.getElementById('customerPhone').value = job.customerPhone || '';
  document.getElementById('customerEmail').value = job.customerEmail || '';
  document.getElementById('customerNotes').value = job.notes || '';
  document.getElementById('brandSelect').value = job.brand || '';
  document.getElementById('modelInput').value = job.model || '';
  form.brand = job.brand || '';
  form.model = job.model || '';
  form.commMethod = job.commMethod || '';
  document.querySelectorAll('.vtype-btn').forEach(b => { if (b.dataset.type === job.vehicleType) selectVehicleType(b); });
  document.querySelectorAll('.color-swatch').forEach(s => { if (s.dataset.color === job.color) selectColor(s); });
  document.querySelectorAll('.comm-btn').forEach(b => { if (b.dataset.comm === job.commMethod) selectComm(b); });
  hidePlateHistory();
  showToast('Στοιχεία πελάτη συμπληρώθηκαν', 'success');
}

function goToStep1() { setStep(1); }
function goToStep2Back() { setStep(2); }

function goToStep2() {
  const plate = document.getElementById('plateInput').value.trim();
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  if (!plate) { showToast('⚠️ Συμπληρώστε την πινακίδα', 'error'); return; }
  if (!form.vehicleType) { showToast('⚠️ Επιλέξτε κατηγορία οχήματος', 'error'); return; }
  if (!name) { showToast('⚠️ Συμπληρώστε το όνομα πελάτη', 'error'); return; }
  if (!phone) { showToast('⚠️ Συμπληρώστε το τηλέφωνο', 'error'); return; }
  if (!form.commMethod) { showToast('⚠️ Επιλέξτε τρόπο επικοινωνίας', 'error'); return; }
  form.plate = plate;
  form.brand = document.getElementById('brandSelect').value;
  form.model = document.getElementById('modelInput').value.trim();
  form.customerName = name;
  form.customerPhone = phone;
  form.customerEmail = document.getElementById('customerEmail').value.trim();
  form.notes = document.getElementById('customerNotes').value.trim();
  renderServicesStep();
  setStep(2);
}

function renderServicesStep() {
  document.getElementById('vehicleTypeLabel').textContent = `Κατηγορία: ${VEHICLE_LABELS[form.vehicleType]}`;
  const services = state.settings.services;
  const container = document.getElementById('servicesContainer');
  container.innerHTML = services.map(svc => {
    const price = getServicePrice(svc, form.vehicleType);
    return `
      <div class="service-item" id="svc-${svc.id}" onclick="toggleService('${svc.id}', '${svc.name.replace(/'/g, "\\'")}', ${price}, ${svc.duration})">
        <div class="service-check"></div>
        <span class="service-name">${svc.name}</span>
        <span class="service-price">${price.toFixed(2)}€</span>
      </div>`;
  }).join('');
  updateSummary();
}

function getServicePrice(svc, vehicleType) {
  const mult = PRICE_MULTIPLIERS[vehicleType] || 1.0;
  return Math.round(svc.basePrice * mult * 100) / 100;
}

function toggleService(id, name, price, dur) {
  const idx = form.selectedServices.findIndex(s => s.id === id);
  const el = document.getElementById('svc-' + id);
  if (idx > -1) {
    form.selectedServices.splice(idx, 1);
    el.classList.remove('selected');
  } else {
    form.selectedServices.push({ id, name, price, dur });
    el.classList.add('selected');
  }
  updateSummary();
}

function updateSummary() {
  const total = form.selectedServices.reduce((s, sv) => s + sv.price, 0);
  document.getElementById('summaryTotal').textContent = total.toFixed(2) + '€';
  document.getElementById('summaryList').innerHTML = form.selectedServices.map(s =>
    `<div class="summary-item">• ${s.name} — ${s.price.toFixed(2)}€</div>`).join('') ||
    '<div class="summary-item" style="opacity:0.6">Δεν έχουν επιλεχθεί υπηρεσίες ακόμα</div>';
}

function goToStep3() {
  if (form.selectedServices.length === 0) { showToast('⚠️ Επιλέξτε τουλάχιστον 1 υπηρεσία', 'error'); return; }
  form.pickupTime = document.getElementById('pickupTime').value;
  estimatedMinutes = Math.max(15, form.selectedServices.reduce((s, sv) => s + sv.dur, 0));
  updateTimeDisplay();
  renderConfirm();
  setStep(3);
}

function renderConfirm() {
  const total = form.selectedServices.reduce((s, sv) => s + sv.price, 0);
  const pickupStr = form.pickupTime ? new Date(form.pickupTime).toLocaleString('el-GR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—';
  document.getElementById('confirmSummary').innerHTML = `
    <div class="confirm-row"><span>Πινακίδα</span><span>${form.plate}</span></div>
    <div class="confirm-row"><span>Όχημα</span><span>${form.brand} ${form.model} (${VEHICLE_LABELS[form.vehicleType]})</span></div>
    <div class="confirm-row"><span>Πελάτης</span><span>${form.customerName}</span></div>
    <div class="confirm-row"><span>Τηλέφωνο</span><span>${form.customerPhone}</span></div>
    <div class="confirm-row"><span>Παραλαβή</span><span>${pickupStr}</span></div>
    <div class="confirm-services">
      <p style="font-size:0.82rem;color:var(--text2);margin-bottom:6px;font-weight:600;">Υπηρεσίες:</p>
      ${form.selectedServices.map(s => `<span class="confirm-service-tag">${s.name}</span>`).join('')}
    </div>
    <div class="confirm-total"><span>Εκτιμώμενο Κόστος</span><span>${total.toFixed(2)}€</span></div>`;
}

function setStep(n) {
  for (let i = 1; i <= 3; i++) {
    document.getElementById('formStep' + i).classList.toggle('active', i === n);
    const dot = document.getElementById('step-dot-' + i);
    dot.classList.toggle('active', i === n);
    dot.classList.toggle('done', i < n);
  }
}

function adjustTime(delta) { estimatedMinutes = Math.max(15, estimatedMinutes + delta); updateTimeDisplay(); }
function setTime(min) { estimatedMinutes = min; updateTimeDisplay(); }
function updateTimeDisplay() {
  document.getElementById('timeHours').textContent = Math.floor(estimatedMinutes / 60);
  document.getElementById('timeMinutes').textContent = estimatedMinutes % 60;
}

function selectVehicleType(btn) {
  document.querySelectorAll('.vtype-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  form.vehicleType = btn.dataset.type;
}
function selectColor(el) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  form.color = form.colorName = el.dataset.color;
  document.getElementById('colorLabel').textContent = el.dataset.color;
}
function selectComm(btn) {
  document.querySelectorAll('.comm-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  form.commMethod = btn.dataset.comm;
}
function updateBrand() { form.brand = document.getElementById('brandSelect').value; }

// ===== START JOB =====
function startJob() {
  form.pickupTime = document.getElementById('pickupTime').value;
  const total = form.selectedServices.reduce((s, sv) => s + sv.price, 0);
  const job = {
    id: 'job_' + Date.now(),
    createdAt: new Date().toISOString(),
    plate: form.plate, brand: form.brand, model: form.model,
    vehicleType: form.vehicleType, color: form.color,
    customerName: form.customerName, customerPhone: form.customerPhone,
    customerEmail: form.customerEmail, commMethod: form.commMethod,
    notes: form.notes, pickupTime: form.pickupTime,
    estimatedMin: estimatedMinutes,
    tasks: form.selectedServices.map(s => ({ ...s, done: false })),
    total, finalTotal: total, status: 'active',
    completedAt: null, deliveredAt: null
  };
  state.jobs.unshift(job);
  saveData();
  showToast('Η εργασία ξεκίνησε', 'success');
  openJobDetail(job.id);
}

// ===== ACTIVE PAGE =====
function renderActivePage() {
  const active = state.jobs.filter(j => j.status === 'active' || j.status === 'ready');
  const container = document.getElementById('activeJobsList');
  if (active.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🚗</div><p>Δεν υπάρχουν ενεργές εργασίες</p><button class="btn-primary" onclick="showPage('newJob')">+ Νέα Εργασία</button></div>`;
    return;
  }
  container.innerHTML = active.map(j => jobCardHTML(j)).join('');
}

// ===== JOB DETAIL =====
function openJobDetail(jobId) {
  currentJobId = jobId;
  renderJobDetail();
  showPage('jobDetail');
}

function renderJobDetail() {
  const job = state.jobs.find(j => j.id === currentJobId);
  if (!job) return;
  const completed = job.tasks.filter(t => t.done).length;
  const total = job.tasks.length;
  const allDone = completed === total && total > 0;
  const createdStr = new Date(job.createdAt).toLocaleString('el-GR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  const pickupStr = job.pickupTime ? new Date(job.pickupTime).toLocaleString('el-GR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—';
  const isDone = job.status === 'done';

  let html = `
    <div class="job-detail-header">
      <div class="job-detail-plate">${job.plate}</div>
      <div class="job-detail-car">${job.brand} ${job.model} · ${VEHICLE_LABELS[job.vehicleType] || ''} · ${job.color || ''}</div>
      <div class="job-detail-meta">
        <span class="job-meta-item">👤 ${job.customerName}</span>
        <span class="job-meta-item">${commIcon(job.commMethod)} ${job.customerPhone}</span>
        <span class="job-meta-item">📅 ${pickupStr}</span>
        <span class="job-meta-item">⏱ ${job.estimatedMin}λ</span>
        <span class="job-meta-item">${createdStr}</span>
      </div>
    </div>`;

  if (allDone && !isDone && job.status !== 'ready') {
    html += buildNotifyWidget(job);
  }

  if (job.status === 'ready') {
    html += `
      <div class="ready-banner">
        <div class="ready-banner-row">
          <span class="ready-banner-icon">✅</span>
          <div>
            <div class="ready-banner-title">Πελάτης ενημερώθηκε</div>
            <div class="ready-banner-sub">Αναμένεται παραλαβή — ${job.customerName}</div>
          </div>
        </div>
        <button class="btn-green btn-full" onclick="confirmDelivery('${job.id}')">🚗 Ο Πελάτης Παρέλαβε</button>
      </div>`;
  }

  // Tasks with individual price editing
  html += `<div class="tasks-section"><h4>Εργασίες (${completed}/${total})</h4>`;
  job.tasks.forEach((task, idx) => {
    html += `
      <div class="task-item ${task.done ? 'completed' : ''}" id="task-${idx}">
        <div class="task-toggle" onclick="toggleTask('${job.id}', ${idx})">
          <div class="task-check"></div>
          <span class="task-name">${task.name}</span>
        </div>
        <div class="task-price-wrap">
          <input type="number" class="task-price-input" value="${task.price.toFixed(2)}"
            step="0.5" min="0"
            onchange="updateTaskPrice('${job.id}', ${idx}, this.value)"
            onclick="event.stopPropagation()"
            ${isDone ? 'disabled' : ''}
            title="Επεξεργασία τιμής">
          <span class="task-price-unit">€</span>
        </div>
      </div>`;
  });
  html += '</div>';

  // Running total
  const runningTotal = job.tasks.reduce((s, t) => s + t.price, 0);
  html += `
    <div class="confirm-card">
      <h4>Κόστος Εργασίας</h4>
      ${job.tasks.map(t => `
        <div class="confirm-row">
          <span>${t.name}</span>
          <span class="${t.done ? '' : 'text-muted'}">${t.price.toFixed(2)}€</span>
        </div>`).join('')}
      <div class="confirm-total">
        <span>Σύνολο</span>
        <span id="finalTotalDisplay">${runningTotal.toFixed(2)}€</span>
      </div>
      ${!isDone ? '<p class="price-hint">Αλλάξτε την τιμή σε κάθε υπηρεσία παραπάνω για να ενημερωθεί το σύνολο</p>' : ''}
    </div>`;

  if (job.notes) {
    html += `<div class="confirm-card" style="margin-top:12px"><h4>Σημειώσεις</h4><p style="font-size:0.85rem;color:var(--text2)">${job.notes}</p></div>`;
  }

  document.getElementById('jobDetailContent').innerHTML = html;
}

function toggleTask(jobId, taskIdx) {
  const job = state.jobs.find(j => j.id === jobId);
  if (!job || job.status === 'done') return;
  job.tasks[taskIdx].done = !job.tasks[taskIdx].done;
  const completedCount = job.tasks.filter(t => t.done).length;
  // If not all done, revert to active. If all done, keep 'active' so notify widget appears first.
  if (completedCount < job.tasks.length) job.status = 'active';
  saveData();
  renderJobDetail();
  renderDashboard();
}

function updateTaskPrice(jobId, taskIdx, value) {
  const job = state.jobs.find(j => j.id === jobId);
  if (!job || job.status === 'done') return;
  const price = parseFloat(value);
  if (!isNaN(price) && price >= 0) {
    job.tasks[taskIdx].price = price;
    job.finalTotal = job.tasks.reduce((s, t) => s + t.price, 0);
    saveData();
    const el = document.getElementById('finalTotalDisplay');
    if (el) el.textContent = job.finalTotal.toFixed(2) + '€';
  }
}

// ===== NOTIFICATION HELPERS =====

function openExternal(url) {
  // tel: and mailto: are intercepted by the OS and don't navigate the PWA.
  // For all other schemes (viber://, sms:, https://wa.me) use window.open
  // so the PWA stays open in its own window.
  if (url.startsWith('tel:') || url.startsWith('mailto:')) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function buildThankMsg(job) {
  const shopName = state.settings.shopName || 'το κατάστημά μας';
  const reviewUrl = (state.settings.reviewUrl || '').trim();
  const firstName = job.customerName.split(' ')[0];
  let msg = (state.settings.thankYouMsg ||
    'Αγαπητέ/ή {name}, σας ευχαριστούμε θερμά για την εμπιστοσύνη σας! Θα χαρούμε να σας εξυπηρετήσουμε ξανά σύντομα!')
    .replace('{name}', firstName)
    .replace('{plate}', job.plate)
    .replace('{shop}', shopName);
  if (reviewUrl) msg += `\n⭐ Αφήστε μας μια κριτική: ${reviewUrl}`;
  return msg;
}

function buildReadyMsg(job) {
  const shopName = state.settings.shopName || 'το κατάστημά μας';
  return (state.settings.completionMsg || 'Αγαπητέ/ή {name}, το όχημά σας {plate} είναι έτοιμο για παραλαβή!')
    .replace('{name}', job.customerName)
    .replace('{plate}', job.plate)
    .replace('{shop}', shopName);
}

function buildCommLink(job, msg, { label }) {
  const phone = job.customerPhone.replace(/\s/g, '');
  const enc = encodeURIComponent(msg);
  const comm = job.commMethod;
  if (comm === 'phone') return { href: `tel:${phone}`, label: `📞 ${label}` };
  if (comm === 'sms') return { href: `sms:${phone}?body=${enc}`, label: `💬 ${label}` };
  if (comm === 'whatsapp') {
    const intl = phone.startsWith('+') ? phone.slice(1) : '30' + phone;
    return { href: `https://wa.me/${intl}?text=${enc}`, label: `🟢 ${label}` };
  }
  if (comm === 'email') {
    const subj = encodeURIComponent(label);
    return { href: `mailto:${job.customerEmail}?subject=${subj}&body=${enc}`, label: `📧 ${label}` };
  }
  return null;
}

function buildNotifyWidget(job) {
  const msg = buildReadyMsg(job);
  const comm = job.commMethod;
  const phone = job.customerPhone.replace(/\s/g, '');
  const isPhone = comm === 'phone';

  let actionHTML = '';
  if (isPhone) {
    actionHTML = `
      <button class="btn-notify-main" onclick="openExternal('tel:${phone}'); markAsReady('${job.id}')">
        📞 Κάλεσε: ${job.customerName} · ${job.customerPhone}
      </button>
      <button class="btn-notify-skip" onclick="markAsReady('${job.id}')">
        ✅ Σήμανε ως Έτοιμο — αφού καλέσετε
      </button>`;
  } else {
    const appName = comm === 'whatsapp' ? 'WhatsApp' : comm === 'sms' ? 'SMS' : 'Email';
    const link = buildCommLink(job, msg, { label: `Άνοιξε ${appName} — ${job.customerName}` });
    actionHTML = `
      <div class="notify-msg-box">
        <div class="notify-msg-label">✉️ Μήνυμα ετοιμότητας:</div>
        <div class="notify-msg-text">${msg}</div>
      </div>
      <button class="btn-notify-main" onclick="openExternal('${link.href}'); markAsReady('${job.id}')">
        ${link.label}
      </button>
      <button class="btn-notify-skip" onclick="markAsReady('${job.id}')">
        ✅ Σήμανε ως Έτοιμο — χωρίς αποστολή
      </button>`;
  }

  return `
    <div class="notify-widget">
      <div class="notify-widget-header">
        <svg class="notify-widget-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.56 2 2 0 0 1 3.58 1.34h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.93 6.93l1.16-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        <div>
          <div class="notify-widget-title">Εργασίες Ολοκληρώθηκαν</div>
          <div class="notify-widget-sub">Ενημερώστε τον πελάτη για παραλαβή</div>
        </div>
      </div>
      ${actionHTML}
    </div>`;
}

function markAsReady(jobId) {
  const job = state.jobs.find(j => j.id === jobId);
  if (!job) return;
  job.status = 'ready';
  job.completedAt = new Date().toISOString();
  saveData();
  renderJobDetail();
  renderDashboard();
}

function confirmDelivery(jobId) {
  const job = state.jobs.find(j => j.id === jobId);
  if (!job) return;
  job.status = 'done';
  job.deliveredAt = new Date().toISOString();
  job.finalTotal = job.tasks.reduce((s, t) => s + t.price, 0);
  saveData();
  renderDashboard();
  showThankYouFlow(job);
}

function showThankYouFlow(job) {
  const reviewUrl = (state.settings.reviewUrl || '').trim();
  const comm = job.commMethod;
  const thankMsg = buildThankMsg(job);

  const canSendMsg = comm !== 'phone';
  let sendBtn = '';

  if (canSendMsg) {
    const appName = comm === 'whatsapp' ? 'WhatsApp' : comm === 'sms' ? 'SMS' : 'Email';
    const link = buildCommLink(job, thankMsg, { label: `Στείλε Ευχαριστήριο — ${appName}` });
    sendBtn = `<button class="btn-primary btn-full" onclick="openExternal('${link.href}')">${link.label}</button>`;
  }

  const reviewHint = reviewUrl
    ? `<div class="review-preview"><span>⭐ Review link:</span><span class="review-url">${reviewUrl}</span></div>`
    : `<div class="review-missing">Προσθέστε σύνδεσμο αξιολόγησης στις <strong>Ρυθμίσεις</strong> για να συμπεριλαμβάνεται αυτόματα</div>`;

  const notifBody = `
    <div class="thankyou-flow">
      ${canSendMsg ? `
        <div class="notify-msg-box" style="margin-bottom:12px">
          <div class="notify-msg-label">✉️ Μήνυμα Ευχαριστιών:</div>
          <div class="notify-msg-text">${thankMsg.replace(/\n/g, '<br>')}</div>
          ${reviewHint}
        </div>
        ${sendBtn}` : `
        <div style="text-align:center;padding:12px 0;color:var(--text2);font-size:0.88rem">
          📞 Μπορείτε να καλέσετε για να ευχαριστήσετε τον πελάτη
        </div>`}
      <button class="btn-secondary btn-full" onclick="closeNotif();showPage('dashboard')">Επιστροφή στο Dashboard</button>
    </div>`;

  showNotif('🎉', `Παραδόθηκε! ${job.finalTotal.toFixed(2)}€`, '', notifBody);
}

// ===== HISTORY =====
function renderHistory(filter) {
  const searchVal = (document.getElementById('historySearch')?.value || '').trim().toLowerCase();
  const now = new Date();
  let jobs = state.jobs.filter(j => j.status === 'done');

  if (filter === 'today') jobs = jobs.filter(j => new Date(j.deliveredAt || j.createdAt).toDateString() === now.toDateString());
  else if (filter === 'week') { const w = new Date(now - 7 * 86400000); jobs = jobs.filter(j => new Date(j.deliveredAt || j.createdAt) >= w); }
  else if (filter === 'month') { const m = new Date(now - 30 * 86400000); jobs = jobs.filter(j => new Date(j.deliveredAt || j.createdAt) >= m); }

  if (searchVal) {
    jobs = jobs.filter(j =>
      j.plate.toLowerCase().includes(searchVal) ||
      j.customerName.toLowerCase().includes(searchVal) ||
      j.customerPhone.includes(searchVal)
    );
  }

  const container = document.getElementById('historyList');
  if (jobs.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>Δεν βρέθηκαν εργασίες</p></div>`;
    return;
  }
  container.innerHTML = jobs.map(j => {
    const dt = new Date(j.deliveredAt || j.createdAt).toLocaleString('el-GR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
    return `
      <div class="job-card status-done" onclick="openJobDetail('${j.id}')">
        <div class="job-card-top">
          <div class="job-plate">${j.plate}</div>
          <span class="job-status-badge badge-done">✅ Παραδόθηκε</span>
        </div>
        <div class="job-car-info">${j.brand} ${j.model} · ${VEHICLE_LABELS[j.vehicleType] || ''}</div>
        <div class="job-customer"><strong>${j.customerName}</strong><span style="color:var(--text3);margin-left:6px">· ${j.customerPhone}</span></div>
        <div class="job-timer-row">
          <span class="job-timer">📅 ${dt}</span>
          <span style="font-weight:700;color:var(--blue)">${(j.finalTotal || j.total || 0).toFixed(2)}€</span>
        </div>
      </div>`;
  }).join('');
}

function filterHistory(filter, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderHistory(filter);
}

// ===== SETTINGS =====
function renderSettings() {
  document.getElementById('shopName').value = state.settings.shopName || '';
  document.getElementById('shopPhone').value = state.settings.shopPhone || '';
  document.getElementById('shopAddress').value = state.settings.shopAddress || '';
  document.getElementById('completionMsg').value = state.settings.completionMsg || '';
  document.getElementById('thankYouMsg').value = state.settings.thankYouMsg || '';
  document.getElementById('reviewUrl').value = state.settings.reviewUrl || '';
  renderServicesList();
  renderDetailedStats();
}

// ===== SERVICES MANAGEMENT =====
function renderServicesList() {
  const container = document.getElementById('servicesEditor');
  if (!container) return;
  const services = state.settings.services;
  if (services.length === 0) {
    container.innerHTML = '<p style="color:var(--text3);font-size:0.85rem;padding:12px 0">Δεν υπάρχουν υπηρεσίες. Προσθέστε νέα.</p>';
    return;
  }
  container.innerHTML = services.map((s, i) => `
    <div class="svc-editor-row">
      <input type="text" class="form-control svc-editor-name" id="svcn-${i}" value="${s.name}" placeholder="Όνομα υπηρεσίας">
      <div class="svc-editor-nums">
        <div class="svc-editor-field">
          <span class="svc-editor-label">Τιμή €</span>
          <input type="number" class="form-control" id="svcp-${i}" value="${s.basePrice}" step="0.5" min="0">
        </div>
        <div class="svc-editor-field">
          <span class="svc-editor-label">Λεπτά</span>
          <input type="number" class="form-control" id="svcd-${i}" value="${s.duration}" step="5" min="5">
        </div>
      </div>
      <button class="btn-del-svc" onclick="deleteService(${i})" title="Διαγραφή">🗑</button>
    </div>`).join('');
}

function addService() {
  saveCurrentServices();
  state.settings.services.push({ id: 'custom_' + Date.now(), name: 'Νέα Υπηρεσία', basePrice: 10, duration: 20 });
  saveData();
  renderServicesList();
  showToast('Νέα υπηρεσία προστέθηκε', 'success');
}

function deleteService(idx) {
  saveCurrentServices();
  state.settings.services.splice(idx, 1);
  saveData();
  renderServicesList();
  showToast('Υπηρεσία διαγράφηκε', 'success');
}

function saveCurrentServices() {
  state.settings.services.forEach((s, i) => {
    const n = document.getElementById(`svcn-${i}`);
    const p = document.getElementById(`svcp-${i}`);
    const d = document.getElementById(`svcd-${i}`);
    if (n) s.name = n.value.trim() || s.name;
    if (p) s.basePrice = parseFloat(p.value) || 0;
    if (d) s.duration = parseInt(d.value) || 15;
  });
}

function saveServices() {
  saveCurrentServices();
  saveData();
  showToast('Υπηρεσίες αποθηκεύτηκαν', 'success');
}

function resetServices() {
  if (!confirm('Επαναφορά στις default υπηρεσίες; Οι προσαρμογές σας θα χαθούν.')) return;
  state.settings.services = DEFAULT_SERVICES.map(s => ({ ...s }));
  saveData();
  renderServicesList();
  showToast('Επαναφορά υπηρεσιών', 'success');
}

function saveShopInfo() {
  state.settings.shopName = document.getElementById('shopName').value.trim();
  state.settings.shopPhone = document.getElementById('shopPhone').value.trim();
  state.settings.shopAddress = document.getElementById('shopAddress').value.trim();
  saveData();
  showToast('Στοιχεία αποθηκεύτηκαν', 'success');
}

function saveCompletionMsg() {
  state.settings.completionMsg = document.getElementById('completionMsg').value.trim();
  state.settings.thankYouMsg = document.getElementById('thankYouMsg').value.trim();
  state.settings.reviewUrl = document.getElementById('reviewUrl').value.trim();
  saveData();
  showToast('Μηνύματα αποθηκεύτηκαν', 'success');
}

function clearHistory() {
  if (!confirm('Διαγραφή ολοκληρωμένων εργασιών; Αυτή η ενέργεια δεν αναιρείται.')) return;
  state.jobs = state.jobs.filter(j => j.status !== 'done');
  saveData();
  renderSettings();
  showToast('Ιστορικό εκκαθαρίστηκε', 'success');
}

// ===== DETAILED STATS =====
function renderDetailedStats() {
  const container = document.getElementById('statsOverall');
  if (!container) return;
  const now = new Date();
  const doneJobs = state.jobs.filter(j => j.status === 'done');

  const todayStr = now.toDateString();
  const weekAgo = new Date(now - 7 * 86400000);
  const monthAgo = new Date(now - 30 * 86400000);

  const todayJobs = doneJobs.filter(j => new Date(j.deliveredAt || j.createdAt).toDateString() === todayStr);
  const weekJobs = doneJobs.filter(j => new Date(j.deliveredAt || j.createdAt) >= weekAgo);
  const monthJobs = doneJobs.filter(j => new Date(j.deliveredAt || j.createdAt) >= monthAgo);

  const rev = v => v.reduce((s, j) => s + (j.finalTotal || j.total || 0), 0);
  const avgTicket = doneJobs.length > 0 ? rev(doneJobs) / doneJobs.length : 0;

  // Top services by revenue
  const svcRevenue = {};
  doneJobs.forEach(j => j.tasks.forEach(t => { svcRevenue[t.name] = (svcRevenue[t.name] || 0) + t.price; }));
  const topSvcs = Object.entries(svcRevenue).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Repeat customers
  const plateCounts = {};
  state.jobs.forEach(j => { plateCounts[j.plate] = (plateCounts[j.plate] || 0) + 1; });
  const repeatCustomers = Object.values(plateCounts).filter(c => c > 1).length;

  container.innerHTML = `
    <div class="stats-detail-grid">
      <div class="stat-detail-card">
        <div class="stat-detail-label">Σήμερα</div>
        <div class="stat-detail-val">${todayJobs.length} <span>εργασίες</span></div>
        <div class="stat-detail-sub">${rev(todayJobs).toFixed(0)}€</div>
      </div>
      <div class="stat-detail-card">
        <div class="stat-detail-label">Εβδομάδα</div>
        <div class="stat-detail-val">${weekJobs.length} <span>εργασίες</span></div>
        <div class="stat-detail-sub">${rev(weekJobs).toFixed(0)}€</div>
      </div>
      <div class="stat-detail-card">
        <div class="stat-detail-label">Μήνας</div>
        <div class="stat-detail-val">${monthJobs.length} <span>εργασίες</span></div>
        <div class="stat-detail-sub">${rev(monthJobs).toFixed(0)}€</div>
      </div>
      <div class="stat-detail-card">
        <div class="stat-detail-label">Σύνολο</div>
        <div class="stat-detail-val">${doneJobs.length} <span>εργασίες</span></div>
        <div class="stat-detail-sub">${rev(doneJobs).toFixed(0)}€</div>
      </div>
      <div class="stat-detail-card stat-detail-wide">
        <div class="stat-detail-label">Μέση Τιμή / Εργασία</div>
        <div class="stat-detail-val">${avgTicket.toFixed(0)}€</div>
      </div>
      <div class="stat-detail-card stat-detail-wide">
        <div class="stat-detail-label">Επαναλαμβανόμενοι Πελάτες</div>
        <div class="stat-detail-val">${repeatCustomers}</div>
      </div>
    </div>
    ${topSvcs.length > 0 ? `
      <div style="margin-top:16px">
        <p style="font-size:0.78rem;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Top Υπηρεσίες (Έσοδα)</p>
        ${topSvcs.map(([name, rev]) => `
          <div class="top-svc-item" style="margin-bottom:6px">
            <span class="top-svc-name">${name}</span>
            <div class="top-svc-bar-wrap"><div class="top-svc-bar" style="width:${Math.round((rev/topSvcs[0][1])*100)}%"></div></div>
            <span class="top-svc-rev">${rev.toFixed(0)}€</span>
          </div>`).join('')}
      </div>` : ''}`;
}

// ===== NOTIFICATION & TOAST =====
function showNotif(icon, title, msg, actionsHTML) {
  document.getElementById('notifIcon').textContent = icon;
  document.getElementById('notifTitle').textContent = title;
  document.getElementById('notifMsg').textContent = msg;
  document.getElementById('notifActions').innerHTML = actionsHTML;
  document.getElementById('notifOverlay').classList.remove('hidden');
}
function closeNotif() { document.getElementById('notifOverlay').classList.add('hidden'); }

let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + type;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
}

// ===== AI ADVISOR =====
let advisorHistory = [];

function buildAdvisorSystemPrompt() {
  const services = state.settings.services || [];
  const doneJobs = state.jobs.filter(j => j.status === 'done');
  const totalRevenue = doneJobs.reduce((s, j) => s + (j.finalTotal || j.total || 0), 0);
  const avgTicket = doneJobs.length > 0 ? (totalRevenue / doneJobs.length).toFixed(2) : 0;

  const svcCounts = {}, svcRevenue = {};
  doneJobs.forEach(j => j.tasks.forEach(t => {
    svcCounts[t.name] = (svcCounts[t.name] || 0) + 1;
    svcRevenue[t.name] = (svcRevenue[t.name] || 0) + t.price;
  }));
  const sorted = Object.entries(svcCounts).sort((a, b) => b[1] - a[1]);
  const topSvcs = sorted.slice(0, 5).map(([n, c]) => `${n} (${c}x, ${(svcRevenue[n]||0).toFixed(0)}€)`).join(', ');
  const lowSvcs = sorted.slice(-3).map(([n, c]) => `${n} (${c}x)`).join(', ');

  const plateCounts = {};
  state.jobs.forEach(j => { plateCounts[j.plate] = (plateCounts[j.plate] || 0) + 1; });
  const repeatCustomers = Object.values(plateCounts).filter(c => c > 1).length;
  const totalCustomers = Object.keys(plateCounts).length;
  const repeatRate = totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(0) : 0;

  return `Είσαι έμπειρος επιχειρηματικός σύμβουλος ειδικευμένος σε πλυντήρια αυτοκινήτων στην Ελλάδα. Μιλάς πάντα ελληνικά. Οι απαντήσεις σου είναι συγκεκριμένες, πρακτικές και βασισμένες στα πραγματικά δεδομένα της επιχείρησης.

ΔΕΔΟΜΕΝΑ ΕΠΙΧΕΙΡΗΣΗΣ:
- Όνομα: ${state.settings.shopName || 'Άγνωστο'}
- Υπηρεσίες & τιμές: ${services.map(s => `${s.name} (${s.basePrice}€)`).join(', ') || 'Δεν έχουν οριστεί'}
- Ολοκληρωμένες εργασίες: ${doneJobs.length}
- Συνολικά έσοδα: ${totalRevenue.toFixed(2)}€
- Μέση αξία εργασίας: ${avgTicket}€
- Επαναλαμβανόμενοι πελάτες: ${repeatCustomers} / ${totalCustomers} (${repeatRate}%)
- Top υπηρεσίες: ${topSvcs || 'Δεν υπάρχουν δεδομένα ακόμα'}
- Λιγότερο δημοφιλείς: ${lowSvcs || 'Δεν υπάρχουν δεδομένα ακόμα'}

ΓΝΩΣΕΙΣ ΠΟΥ ΕΧΕΙΣ:
- Υπηρεσίες υψηλής ζήτησης στην Ελλάδα: ceramic coating, paint protection film (PPF), car detailing, εσωτερικός βαθύς καθαρισμός, ozone treatment, engine bay cleaning, γυαλάδα φαναριών, anti-rain για τζάμια
- Στρατηγικές τιμολόγησης: πακέτα (combo), membership/συνδρομές, εποχικές προσφορές
- Marketing: Google My Business, Instagram/Facebook, loyalty card, referral programs, Google Ads
- Τρόποι αύξησης μέσου λογαριασμού: upselling, cross-selling, πακέτα υπηρεσιών
- Εποχικότητα: χειμώνας (αλάτι, λάσπη), άνοιξη (βαθύς καθαρισμός μετά χειμώνα), καλοκαίρι (εσωτερικό, βουβαλίσια)
- KPIs σημαντικά: μέσος λογαριασμός, retention rate, εβδομαδιαία/μηνιαία έσοδα

Ανάλυσε τα δεδομένα και δώσε εξατομικευμένες συμβουλές. Χρησιμοποίησε **bold** για έμφαση. Προτίμησε bullet points για σαφήνεια.`;
}

async function callClaudeAPI(messages) {
  const response = await fetch('/api/advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemPrompt: buildAdvisorSystemPrompt() })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.text;
}

function renderAdvisorPage() {
  const container = document.getElementById('advisorMessages');
  if (!container) return;
  if (advisorHistory.length === 0) renderAdvisorMessages();
}

function renderAdvisorMessages() {
  const container = document.getElementById('advisorMessages');
  if (!container) return;
  if (advisorHistory.length === 0) {
    container.innerHTML = `
      <div class="advisor-welcome">
        <div class="advisor-welcome-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><circle cx="18" cy="6" r="4" fill="var(--blue)" stroke="none"/><text x="16" y="9" font-size="5" fill="white" font-weight="bold">AI</text></svg>
        </div>
        <p><strong>Γεια σας!</strong> Είμαι ο AI επιχειρηματικός σύμβουλός σας.</p>
        <p>Έχω πρόσβαση στα δεδομένα της επιχείρησής σας και μπορώ να αναλύσω τις υπηρεσίες σας, τα έσοδα και τους πελάτες σας για να σας δώσω <strong>εξατομικευμένες συμβουλές</strong>.</p>
      </div>`;
    return;
  }
  container.innerHTML = advisorHistory.map(msg => {
    const text = msg.content
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    return `<div class="advisor-msg advisor-msg-${msg.role}">
      ${msg.role === 'assistant' ? '<div class="advisor-avatar">AI</div>' : ''}
      <div class="advisor-bubble">${text}</div>
    </div>`;
  }).join('');
  container.scrollTop = container.scrollHeight;
}

async function sendAdvisorMessage() {
  const input = document.getElementById('advisorInput');
  const text = (input.value || '').trim();
  if (!text) return;
  input.value = '';

  advisorHistory.push({ role: 'user', content: text });
  renderAdvisorMessages();

  const sendBtn = document.getElementById('advisorSendBtn');
  if (sendBtn) sendBtn.disabled = true;

  // typing indicator
  const container = document.getElementById('advisorMessages');
  if (container) {
    container.innerHTML += `<div class="advisor-msg advisor-msg-assistant" id="advisorTyping"><div class="advisor-avatar">AI</div><div class="advisor-bubble advisor-typing"><span></span><span></span><span></span></div></div>`;
    container.scrollTop = container.scrollHeight;
  }

  try {
    const reply = await callClaudeAPI(advisorHistory);
    advisorHistory.push({ role: 'assistant', content: reply });
  } catch (err) {
    advisorHistory.push({ role: 'assistant', content: `Σφάλμα: ${err.message}` });
  }

  renderAdvisorMessages();
  if (sendBtn) sendBtn.disabled = false;
  input.focus();
}

function askAdvisor(question) {
  const input = document.getElementById('advisorInput');
  if (input) { input.value = question; sendAdvisorMessage(); }
}

function clearAdvisorChat() {
  advisorHistory = [];
  renderAdvisorMessages();
}

function advisorInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdvisorMessage(); }
}

// ===== APPOINTMENTS =====
const APPT_SLOTS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

function apptSlotFromDate(d) {
  const h = new Date(d);
  return `${String(h.getHours()).padStart(2,'0')}:${String(h.getMinutes()).padStart(2,'0')}`;
}

function apptBuildScheduledAt(date, timeSlot) {
  const d = new Date(date);
  const [hh, mm] = timeSlot.split(':').map(Number);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

function apptDayRange(date) {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function loadAppointments() {
  try {
    const { start, end } = apptDayRange(apptSelectedDate);
    const { data, error } = await getSupa()
      .from('appointments')
      .select('*')
      .gte('scheduled_at', start)
      .lte('scheduled_at', end)
      .order('scheduled_at');
    if (error) throw error;
    appointments = data || [];
    renderAppointmentsPage();
  } catch (e) {
    showToast('Σφάλμα φόρτωσης ραντεβού', 'error');
  }
}

function subscribeToNewBookings() {
  const supa = getSupa();
  if (!supa) return;
  _apptSubscription = supa
    .channel('appointments-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, payload => {
      if (payload.new && payload.new.source === 'online') notifyNewBooking(payload.new);
      if (payload.new && payload.new.scheduled_at) {
        const newDay = new Date(payload.new.scheduled_at).toDateString();
        if (newDay === apptSelectedDate.toDateString() && state.currentPage === 'appointments') {
          loadAppointments();
        }
      }
      updateApptBadge();
    })
    .subscribe();
}

function notifyNewBooking(appt) {
  const slot = appt.scheduled_at ? apptSlotFromDate(appt.scheduled_at) : '—';
  showToast(`Νέο ραντεβού: ${appt.customer_name} στις ${slot}`, 'success');
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Νέο Ραντεβού!', {
      body: `${appt.customer_name} · ${slot}`,
      icon: '/icon.svg'
    });
  }
}

async function updateApptBadge() {
  try {
    const supa = getSupa();
    if (!supa) return;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { count } = await supa
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('scheduled_at', todayStart.toISOString());
    const c = count || 0;
    ['apptBadge','sideApptBadge'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = c; el.style.display = c > 0 ? 'flex' : 'none'; }
    });
  } catch (e) {}
}

function renderAppointmentsPage() {
  const container = document.getElementById('apptDayView');
  if (!container) return;

  const DAY_NAMES = ['Κυρ','Δευ','Τρι','Τετ','Πεμ','Παρ','Σαβ'];
  const MONTH_NAMES = ['Ιαν','Φεβ','Μαρ','Απρ','Μαΐ','Ιουν','Ιουλ','Αυγ','Σεπ','Οκτ','Νοε','Δεκ'];
  const dateStr = `${DAY_NAMES[apptSelectedDate.getDay()]} ${apptSelectedDate.getDate()} ${MONTH_NAMES[apptSelectedDate.getMonth()]} ${apptSelectedDate.getFullYear()}`;
  const dateEl = document.getElementById('apptDateLabel');
  if (dateEl) dateEl.textContent = dateStr;

  const isToday = apptSelectedDate.toDateString() === new Date().toDateString();
  const todayBtn = document.getElementById('apptTodayBtn');
  if (todayBtn) todayBtn.style.opacity = isToday ? '0.4' : '1';

  const linkEl = document.getElementById('bookingLinkUrl');
  if (linkEl) linkEl.textContent = window.location.origin + '/book.html';

  container.innerHTML = APPT_SLOTS.map(slot => {
    const appt = appointments.find(a => apptSlotFromDate(a.scheduled_at) === slot);
    if (!appt) {
      return `
        <div class="appt-slot appt-slot-free" onclick="openApptModal('${slot}')">
          <div class="appt-slot-time">${slot}</div>
          <div class="appt-slot-free-label">Ελεύθερο</div>
        </div>`;
    }
    const statusClass = { confirmed:'appt-slot-confirmed', cancelled:'appt-slot-cancelled', pending:'appt-slot-pending' }[appt.status] || 'appt-slot-pending';
    const statusLabel = { confirmed:'Επιβεβαιωμένο', cancelled:'Ακυρωμένο', pending:'Εκκρεμεί' }[appt.status] || appt.status;
    return `
      <div class="appt-slot ${statusClass}">
        <div class="appt-slot-time">${slot}</div>
        <div class="appt-slot-info">
          <div class="appt-slot-name">${appt.customer_name}</div>
          <div class="appt-slot-phone">${appt.customer_phone}</div>
          ${appt.notes ? `<div class="appt-slot-notes">${appt.notes}</div>` : ''}
          <span class="appt-source-tag">${appt.source === 'online' ? '🌐 Online' : '📞 Χειροκίνητο'}</span>
        </div>
        <div class="appt-slot-actions">
          <span class="appt-status-badge appt-status-${appt.status}">${statusLabel}</span>
          ${appt.status === 'pending' ? `
            <button class="btn-appt-confirm" onclick="updateApptStatus('${appt.id}','confirmed')">✓</button>
            <button class="btn-appt-cancel" onclick="updateApptStatus('${appt.id}','cancelled')">✗</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

function apptPrevDay() {
  apptSelectedDate = new Date(apptSelectedDate.getTime() - 86400000);
  loadAppointments();
}

function apptNextDay() {
  apptSelectedDate = new Date(apptSelectedDate.getTime() + 86400000);
  loadAppointments();
}

function apptGoToday() {
  apptSelectedDate = new Date();
  loadAppointments();
}

function openApptModal(timeSlot) {
  const modal = document.getElementById('apptModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  const timeEl = document.getElementById('apptModalTime');
  if (timeEl) timeEl.value = timeSlot || '';
  ['apptModalName','apptModalPhone','apptModalNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  setTimeout(() => { const el = document.getElementById('apptModalName'); if (el) el.focus(); }, 100);
}

function closeApptModal() {
  const modal = document.getElementById('apptModal');
  if (modal) modal.classList.add('hidden');
}

async function createManualAppointment() {
  const timeSlot = (document.getElementById('apptModalTime').value || '').trim();
  const name = (document.getElementById('apptModalName').value || '').trim();
  const phone = (document.getElementById('apptModalPhone').value || '').trim();
  const notes = (document.getElementById('apptModalNotes').value || '').trim();
  if (!timeSlot || !name || !phone) {
    showToast('Συμπληρώστε ώρα, όνομα και τηλέφωνο', 'error');
    return;
  }
  try {
    const { error } = await getSupa().from('appointments').insert({
      scheduled_at: apptBuildScheduledAt(apptSelectedDate, timeSlot),
      customer_name: name, customer_phone: phone,
      notes, status: 'confirmed', source: 'manual'
    });
    if (error) throw error;
    closeApptModal();
    await loadAppointments();
    updateApptBadge();
    showToast('Ραντεβού καταχωρήθηκε', 'success');
  } catch (e) {
    showToast('Σφάλμα: ' + e.message, 'error');
  }
}

async function updateApptStatus(apptId, newStatus) {
  try {
    const { error } = await getSupa().from('appointments').update({ status: newStatus }).eq('id', apptId);
    if (error) throw error;
    await loadAppointments();
    updateApptBadge();
    showToast(newStatus === 'confirmed' ? 'Επιβεβαιώθηκε' : 'Ακυρώθηκε', 'success');
  } catch (e) {
    showToast('Σφάλμα ενημέρωσης', 'error');
  }
}

function copyBookingLink() {
  const url = window.location.origin + '/book.html';
  navigator.clipboard.writeText(url).then(() => showToast('Σύνδεσμος αντιγράφηκε!', 'success')).catch(() => showToast(url, ''));
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('notifOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeNotif();
  });
});

window.addEventListener('load', init);
