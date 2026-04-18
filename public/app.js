/* ══════════════════════════════════════════════════════════
   Finance Tracker — Frontend JS
   ══════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────
let accessToken = null;
let currentUser = null;
let categories = [];
let chartExpenses = null;
let chartTrend = null;
let txnPage = 1;

// ── API Helper ───────────────────────────────────────────
async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  if (!(opts.body instanceof FormData) && opts.body) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(`/api${path}`, { ...opts, headers, credentials: 'include' });
  if (res.status === 401 && path !== '/auth/refresh') {
    const refreshed = await tryRefresh();
    if (refreshed) return api(path, opts);
    showAuth(); return null;
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/csv')) { return res; }
  const json = await res.json();
  if (!json.success) { toast(json.error?.message || 'Error', true); return null; }
  return json.data;
}

async function tryRefresh() {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    const json = await res.json();
    if (json.success) { accessToken = json.data.accessToken; currentUser = json.data.user; return true; }
  } catch {}
  return false;
}

// ── Toast ────────────────────────────────────────────────
function toast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? 'var(--red)' : 'var(--primary)';
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

// ── Screen switching ─────────────────────────────────────
function showAuth() { accessToken = null; currentUser = null; toggle('auth-screen', 'app-screen'); }
function showApp() { toggle('app-screen', 'auth-screen'); updateUserInfo(); loadCategories().then(loadDashboard); }
function toggle(show, hide) {
  document.getElementById(show).classList.add('active');
  document.getElementById(hide).classList.remove('active');
}

function updateUserInfo() {
  if (!currentUser) return;
  document.getElementById('user-name').textContent = currentUser.name;
  document.getElementById('user-email').textContent = currentUser.email;
}

// ── Auth ─────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('login-form').classList.toggle('hidden', tab.dataset.tab !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', tab.dataset.tab !== 'register');
  });
});

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const data = await api('/auth/login', { method: 'POST', body: { email: document.getElementById('login-email').value, password: document.getElementById('login-password').value }});
  if (data) { accessToken = data.accessToken; currentUser = data.user; showApp(); }
});

document.getElementById('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  const data = await api('/auth/register', { method: 'POST', body: { name: document.getElementById('reg-name').value, email: document.getElementById('reg-email').value, password: document.getElementById('reg-password').value }});
  if (data) { accessToken = data.accessToken; currentUser = data.user; showApp(); }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('/auth/logout', { method: 'POST' }); showAuth();
});

// ── Check token from URL hash (Google OAuth redirect) ────
const hashMatch = location.hash.match(/token=(.+)/);
if (hashMatch) { accessToken = hashMatch[1]; location.hash = ''; }

// ── Navigation ───────────────────────────────────────────
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = link.dataset.page;
    document.getElementById(`page-${page}`).classList.add('active');
    if (page === 'dashboard') loadDashboard();
    if (page === 'transactions') loadTransactions();
    if (page === 'budgets') loadBudgets();
  });
});

// ── Modal helpers ────────────────────────────────────────
function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

// ── Categories ───────────────────────────────────────────
async function loadCategories() {
  const data = await api('/categories');
  if (data) categories = data.categories;
  const sel = document.getElementById('filter-category');
  sel.innerHTML = '<option value="">All Categories</option>' + categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

function categoryOptions(type) {
  return categories.filter(c => !type || c.type === type).map(c => `<option value="${c.id}">${c.icon} ${c.name} (${c.type})</option>`).join('');
}

// ── Dashboard ────────────────────────────────────────────
async function loadDashboard() {
  const d = await api('/dashboard');
  if (!d) return;
  document.getElementById('stat-income').textContent = '$' + d.summary.total_income.toLocaleString();
  document.getElementById('stat-expenses').textContent = '$' + d.summary.total_expenses.toLocaleString();
  document.getElementById('stat-savings').textContent = '$' + d.summary.net_savings.toLocaleString();
  document.getElementById('stat-rate').textContent = d.summary.savings_rate + '%';

  // Expenses by category chart
  if (chartExpenses) chartExpenses.destroy();
  const expCtx = document.getElementById('chart-expenses-category');
  chartExpenses = new Chart(expCtx, {
    type: 'doughnut',
    data: {
      labels: d.expenses_by_category.map(e => e.category),
      datasets: [{ data: d.expenses_by_category.map(e => e.amount), backgroundColor: d.expenses_by_category.map(e => e.color || '#6366f1'), borderWidth: 0 }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#e4e6eb', font: { size: 11 } } } } }
  });

  // Monthly trend chart
  if (chartTrend) chartTrend.destroy();
  const tCtx = document.getElementById('chart-monthly-trend');
  chartTrend = new Chart(tCtx, {
    type: 'bar',
    data: {
      labels: d.monthly_trend.map(m => m.month),
      datasets: [
        { label: 'Income', data: d.monthly_trend.map(m => m.income), backgroundColor: '#22c55e' },
        { label: 'Expenses', data: d.monthly_trend.map(m => m.expenses), backgroundColor: '#ef4444' }
      ]
    },
    options: { responsive: true, scales: { x: { ticks: { color: '#8b8fa3' }, grid: { display: false } }, y: { ticks: { color: '#8b8fa3' }, grid: { color: '#2a2d3a' } } }, plugins: { legend: { labels: { color: '#e4e6eb' } } } }
  });

  // Budget alerts
  const alertsEl = document.getElementById('budget-alerts-list');
  if (d.budget_alerts.length === 0) { alertsEl.innerHTML = '<p class="muted">No alerts</p>'; }
  else { alertsEl.innerHTML = d.budget_alerts.filter(a => a.percent_used >= 80).map(a => `<div class="alert-item ${a.is_overrun ? 'overrun' : 'warning'}"><span>${a.category}: ${a.percent_used}% used</span><span>$${a.spent} / $${a.budget}</span></div>`).join('') || '<p class="muted">All budgets on track</p>'; }

  // Recent transactions
  const recentEl = document.getElementById('recent-txns');
  recentEl.innerHTML = d.top_transactions.length === 0 ? '<p class="muted">No transactions yet</p>' : d.top_transactions.map(txnRow).join('');
}

function txnRow(t) {
  const sign = t.type === 'income' ? '+' : '-';
  return `<div class="txn-row"><div class="txn-left"><span class="txn-icon">${t.category_icon || '📁'}</span><div class="txn-info"><span class="txn-desc">${t.description || 'No description'}</span><span class="txn-meta">${t.category_name || ''} · ${t.date?.slice(0,10)} · ${t.currency}${t.is_refund ? ' · Refund' : ''}</span></div></div><div class="txn-right"><div class="txn-amount ${t.type}">${sign}$${parseFloat(t.amount).toFixed(2)}</div><div class="txn-actions"><button onclick="openEditTxn('${t.id}')">✏️</button><button onclick="deleteTxn('${t.id}')">🗑️</button></div></div></div>`;
}

// ── Transactions ─────────────────────────────────────────
async function loadTransactions() {
  const params = new URLSearchParams({ page: txnPage, limit: 15 });
  const type = document.getElementById('filter-type').value;
  const cat = document.getElementById('filter-category').value;
  const sd = document.getElementById('filter-start').value;
  const ed = document.getElementById('filter-end').value;
  if (type) params.set('type', type);
  if (cat) params.set('category_id', cat);
  if (sd) params.set('start_date', sd);
  if (ed) params.set('end_date', ed);

  const data = await api(`/transactions?${params}`);
  if (!data) return;
  const container = document.getElementById('txn-list-container');
  container.innerHTML = data.transactions.length === 0 ? '<p class="muted">No transactions found</p>' : data.transactions.map(txnRow).join('');

  // Pagination
  const pag = data.pagination;
  const pagEl = document.getElementById('txn-pagination');
  let btns = '';
  if (pag.total_pages > 1) {
    btns += `<button ${pag.page <= 1 ? 'disabled' : ''} onclick="txnPage=${pag.page-1};loadTransactions()">← Prev</button>`;
    btns += `<button disabled>Page ${pag.page} of ${pag.total_pages}</button>`;
    btns += `<button ${pag.page >= pag.total_pages ? 'disabled' : ''} onclick="txnPage=${pag.page+1};loadTransactions()">Next →</button>`;
  }
  pagEl.innerHTML = btns;
}

document.getElementById('btn-apply-filters').addEventListener('click', () => { txnPage = 1; loadTransactions(); });

document.getElementById('btn-add-txn').addEventListener('click', () => {
  openModal(`<h2>Add Transaction</h2>
    <form id="txn-form">
      <div class="form-group"><label>Type</label><select id="txn-type" required><option value="expense">Expense</option><option value="income">Income</option></select></div>
      <div class="form-group"><label>Category</label><select id="txn-category" required>${categoryOptions()}</select></div>
      <div class="form-group"><label>Amount</label><input type="number" id="txn-amount" step="0.01" min="0.01" required></div>
      <div class="form-group"><label>Currency</label><input type="text" id="txn-currency" value="USD" maxlength="3" required></div>
      <div class="form-group"><label>Date</label><input type="date" id="txn-date" required></div>
      <div class="form-group"><label>Description</label><input type="text" id="txn-description"></div>
      <div class="form-group"><label>Receipt</label><input type="file" id="txn-receipt" accept="image/jpeg,image/png,application/pdf"></div>
      <div class="form-group"><label><input type="checkbox" id="txn-refund"> Is Refund</label></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div>
    </form>`);
  document.getElementById('txn-date').valueAsDate = new Date();
  document.getElementById('txn-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('type', document.getElementById('txn-type').value);
    fd.append('category_id', document.getElementById('txn-category').value);
    fd.append('amount', document.getElementById('txn-amount').value);
    fd.append('currency', document.getElementById('txn-currency').value.toUpperCase());
    fd.append('date', document.getElementById('txn-date').value);
    fd.append('description', document.getElementById('txn-description').value);
    fd.append('is_refund', document.getElementById('txn-refund').checked);
    const file = document.getElementById('txn-receipt').files[0];
    if (file) fd.append('receipt', file);
    const data = await api('/transactions', { method: 'POST', body: fd, headers: {} });
    if (data) { closeModal(); toast('Transaction added!'); loadTransactions(); }
  });
});

async function openEditTxn(id) {
  openModal(`<h2>Edit Transaction</h2>
    <form id="edit-txn-form">
      <div class="form-group"><label>Amount</label><input type="number" id="edit-amount" step="0.01" min="0.01"></div>
      <div class="form-group"><label>Currency</label><input type="text" id="edit-currency" maxlength="3"></div>
      <div class="form-group"><label>Date</label><input type="date" id="edit-date"></div>
      <div class="form-group"><label>Description</label><input type="text" id="edit-description"></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Update</button></div>
    </form>`);
  document.getElementById('edit-txn-form').addEventListener('submit', async e => {
    e.preventDefault();
    const body = {};
    const a = document.getElementById('edit-amount').value;
    const c = document.getElementById('edit-currency').value;
    const d2 = document.getElementById('edit-date').value;
    const desc = document.getElementById('edit-description').value;
    if (a) body.amount = parseFloat(a);
    if (c) body.currency = c.toUpperCase();
    if (d2) body.date = d2;
    if (desc) body.description = desc;
    const data = await api(`/transactions/${id}`, { method: 'PATCH', body });
    if (data) { closeModal(); toast('Updated!'); loadTransactions(); }
  });
}

async function deleteTxn(id) {
  if (!confirm('Delete this transaction?')) return;
  const data = await api(`/transactions/${id}`, { method: 'DELETE' });
  if (data) { toast('Deleted'); loadTransactions(); loadDashboard(); }
}

// ── Budgets ──────────────────────────────────────────────
async function loadBudgets() {
  const data = await api('/budgets');
  if (!data) return;
  const el = document.getElementById('budgets-list');
  if (data.budgets.length === 0) { el.innerHTML = '<p class="muted">No budgets set</p>'; return; }
  el.innerHTML = data.budgets.map(b => {
    const pct = Math.min(b.percent_used, 100);
    const color = b.is_overrun ? 'var(--red)' : b.percent_used >= 80 ? 'var(--yellow)' : 'var(--green)';
    return `<div class="budget-card"><h4>${b.category_icon || '📁'} ${b.category_name}</h4><div class="budget-meta"><span>${b.period}</span><span>$${parseFloat(b.spent).toFixed(2)} / $${parseFloat(b.amount).toFixed(2)}</span></div><div class="budget-bar-bg"><div class="budget-bar" style="width:${pct}%;background:${color}"></div></div><div class="budget-meta"><span>${b.percent_used}% used</span><span>${b.is_overrun ? '🚨 Over budget!' : b.percent_used >= 80 ? '⚠️ Warning' : '✅ On track'}</span></div><div class="budget-actions"><button class="btn btn-sm btn-danger" onclick="deleteBudget('${b.id}')">Delete</button></div></div>`;
  }).join('');
}

document.getElementById('btn-add-budget').addEventListener('click', () => {
  const expCats = categories.filter(c => c.type === 'expense');
  openModal(`<h2>Add Budget</h2>
    <form id="budget-form">
      <div class="form-group"><label>Category</label><select id="budget-cat" required>${expCats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select></div>
      <div class="form-group"><label>Amount</label><input type="number" id="budget-amount" step="0.01" min="0.01" required></div>
      <div class="form-group"><label>Period</label><select id="budget-period"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="yearly">Yearly</option></select></div>
      <div class="form-group"><label>Alert at %</label><input type="number" id="budget-notify" value="80" min="1" max="100"></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create</button></div>
    </form>`);
  document.getElementById('budget-form').addEventListener('submit', async e => {
    e.preventDefault();
    const data = await api('/budgets', { method: 'POST', body: { category_id: document.getElementById('budget-cat').value, amount: parseFloat(document.getElementById('budget-amount').value), period: document.getElementById('budget-period').value, notify_at_percent: parseInt(document.getElementById('budget-notify').value) }});
    if (data) { closeModal(); toast('Budget created!'); loadBudgets(); }
  });
});

async function deleteBudget(id) {
  if (!confirm('Delete this budget?')) return;
  await api(`/budgets/${id}`, { method: 'DELETE' });
  toast('Budget deleted'); loadBudgets();
}

// ── Reports ──────────────────────────────────────────────
document.getElementById('report-year').value = new Date().getFullYear();
document.getElementById('report-month').value = new Date().getMonth() + 1;

document.getElementById('btn-load-report').addEventListener('click', async () => {
  const year = document.getElementById('report-year').value;
  const month = document.getElementById('report-month').value;
  const data = await api(`/reports/monthly?year=${year}&month=${month}`);
  if (!data) return;
  const s = data.summary;
  document.getElementById('report-summary').innerHTML = `
    <div class="stat-card income"><div class="stat-label">Income</div><div class="stat-value">$${s.total_income}</div></div>
    <div class="stat-card expense"><div class="stat-label">Expenses</div><div class="stat-value">$${s.total_expenses}</div></div>
    <div class="stat-card savings"><div class="stat-label">Net Savings</div><div class="stat-value">$${s.net_savings}</div></div>
    <div class="stat-card rate"><div class="stat-label">Savings Rate</div><div class="stat-value">${s.savings_rate}%</div></div>`;
  document.getElementById('report-breakdown').innerHTML = '<h3>Category Breakdown</h3>' + (data.category_breakdown.length === 0 ? '<p class="muted">No data</p>' : '<div class="txn-list">' + data.category_breakdown.map(c => `<div class="txn-row"><span>${c.category} (${c.type})</span><span class="txn-amount ${c.type}">$${c.amount}</span></div>`).join('') + '</div>');
});

document.getElementById('btn-export-csv').addEventListener('click', async () => {
  const year = document.getElementById('report-year').value;
  const month = document.getElementById('report-month').value;
  const sd = `${year}-${String(month).padStart(2,'0')}-01`;
  const ed = new Date(year, month, 0).toISOString().slice(0, 10);
  const res = await fetch(`/api/reports/export?format=csv&start_date=${sd}&end_date=${ed}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) { toast('Export failed', true); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `transactions_${sd}_${ed}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast('CSV exported!');
});

// ── Init: try refresh on page load ───────────────────────
(async () => {
  if (accessToken) {
    const data = await api('/auth/me');
    if (data) { currentUser = data.user; showApp(); return; }
  }
  const ok = await tryRefresh();
  if (ok) showApp(); else showAuth();
})();
