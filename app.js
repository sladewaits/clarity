// ── Auth state ──
let authToken = localStorage.getItem('clarity_token');
let currentUser = null;

function apiFetch(url, opts = {}) {
  return fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': 'Bearer ' + authToken } : {}),
      ...(opts.headers || {}),
    },
  });
}

// ── Constants ──

// Apple system color palette (used sparingly for small avatars / accents).
const APPLE = {
  blue: '#007AFF', green: '#34C759', teal: '#5AC8FA', indigo: '#5856D6',
  purple: '#AF52DE', pink: '#FF2D55', orange: '#FF9500', red: '#FF3B30',
  yellow: '#FFCC00', gray: '#8E8E93',
};
// Read a live CSS custom property (so charts follow light/dark).
function cssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim() || '#007AFF';
}

const CATEGORY_COLOR = {
  'Housing': APPLE.indigo, 'Food': APPLE.orange, 'Transport': APPLE.blue,
  'Entertainment': APPLE.pink, 'Shopping': APPLE.purple, 'Health': APPLE.red,
  'Subscriptions': APPLE.teal, 'Other expense': APPLE.gray,
  'Salary': APPLE.green, 'Freelance': APPLE.green, 'Business': APPLE.green,
  'Investment': APPLE.green, 'Other income': APPLE.green,
};

// Kept so legacy list renderers don't throw; the redesign favors colored
// initial tiles over emoji, but a few secondary lists still read this.
const CATEGORY_EMOJI = {
  'Housing': '🏠', 'Food': '🍽️', 'Transport': '🚗',
  'Entertainment': '🎬', 'Shopping': '🛍️', 'Health': '⚕️',
  'Subscriptions': '🔁', 'Other expense': '📦',
  'Salary': '💼', 'Freelance': '💻', 'Business': '🏢',
  'Investment': '📈', 'Other income': '💰',
};

// Deterministic tile color + initial for tile-style rows.
function tileColor(name) {
  return CATEGORY_COLOR[name] || APPLE.gray;
}
function tileInitial(str) {
  return (str || '?').trim().charAt(0).toUpperCase();
}

// ── Month state ──
const now = new Date();
let viewYear = now.getFullYear();
let viewMonth = now.getMonth() + 1; // 1-indexed

function monthStr() {
  return `${viewYear}-${String(viewMonth).padStart(2, '0')}`;
}

function monthLabel(y, m) {
  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

function isCurrentMonth() {
  return viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1;
}

// Null-safe DOM event binding (several Home cards were removed).
function bind(id, ev, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(ev, fn);
}

function updateMonthNav() {
  const label = document.getElementById('monthLabel');
  const next = document.getElementById('nextMonth');
  if (label) label.textContent = monthLabel(viewYear, viewMonth);
  if (next) next.disabled = isCurrentMonth();
}

bind('prevMonth', 'click', () => {
  if (viewMonth === 1) { viewMonth = 12; viewYear--; }
  else viewMonth--;
  updateMonthNav();
  if (activeTab === 'overview') loadOverview();
  if (activeTab === 'transactions') loadTransactions();
});

bind('nextMonth', 'click', () => {
  if (isCurrentMonth()) return;
  if (viewMonth === 12) { viewMonth = 1; viewYear++; }
  else viewMonth++;
  updateMonthNav();
  if (activeTab === 'overview') loadOverview();
  if (activeTab === 'transactions') loadTransactions();
});

// ── Tab switching ──
let activeTab = 'overview';

function onTabShown(tab) {
  if (tab === 'overview') loadOverview();
  if (tab === 'transactions') { loadTransactions(); loadRecurring(); }
  if (tab === 'budget') loadBudgets();
  if (tab === 'goals') loadGoals();
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    activeTab = tab;
    onTabShown(tab);
  });
});

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  const panel = document.getElementById('tab-' + tab);
  if (panel) panel.classList.add('active');
  activeTab = tab;
  onTabShown(tab);
}

document.getElementById('quickAddIncome').addEventListener('click', () => {
  switchTab('transactions');
  setTxType('income');
  setTimeout(() => document.getElementById('txAmount').focus(), 100);
});

document.getElementById('quickAddExpense').addEventListener('click', () => {
  switchTab('transactions');
  setTxType('expense');
  setTimeout(() => document.getElementById('txAmount').focus(), 100);
});

function loadGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';
  const firstName = (currentUser?.name || '').split(' ')[0];
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  document.getElementById('greetingText').textContent = greeting;
  document.getElementById('greetingName').textContent = firstName;
  document.getElementById('greetingDate').textContent = date;
  document.getElementById('greetingAvatar').textContent = userInitial();
}

function txTileRow(tx) {
  const name = tx.description || tx.category;
  const color = tileColor(tx.category);
  const initial = tileInitial(name);
  const isIncome = tx.type === 'income';
  const amtClass = isIncome ? 'positive' : 'negative';
  const sign = isIncome ? '+' : '-';
  return `<div class="tile-row">
    <div class="tile-avatar" style="background:${color}">${initial}</div>
    <div class="tile-info">
      <div class="tile-name">${name}</div>
      <div class="tile-sub">${tx.category}</div>
    </div>
    <div class="tile-amount ${amtClass}">${sign}${fmt(tx.amount)}</div>
  </div>`;
}

async function loadRecentTxs() {
  const res = await apiFetch('/api/transactions');
  const txs = await res.json();
  const recent = txs.slice(0, 4);
  const card = document.getElementById('recentTxCard');
  if (!recent.length) { card.style.display = 'none'; return; }
  card.style.display = '';
  document.getElementById('recentTxList').innerHTML = recent.map(txTileRow).join('');
}

// Build an SVG path from a numeric series (matches design sparkline).
function sparkPath(points, w, h, pad) {
  if (!points.length) return '';
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  return points.map((v, i) => {
    const x = i * step;
    const y = pad + (h - pad * 2) * (1 - (v - min) / range);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
}

// Apple-Stocks-style sparkline: thin accent line with a gradient fade beneath.
let _sparkSeq = 0;
function drawSparkline(svgId, points, w, h, pad) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const line = sparkPath(points, w, h, pad);
  if (!line) { svg.innerHTML = ''; return; }
  const area = line + ` L${w},${h} L0,${h} Z`;
  const gid = 'spg' + (++_sparkSeq);
  const accent = cssVar('--accent');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML =
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0" stop-color="${accent}" stop-opacity="0.28"/>
       <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
     </linearGradient></defs>
     <path d="${area}" fill="url(#${gid})"/>
     <path d="${line}" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// Smooth count-up for key numerals (spring-ish ease-out).
function animateCount(el, to, fmtFn) {
  if (!el) return;
  const from = el._cv || 0;
  el._cv = to;
  if (from === to) { el.textContent = fmtFn(to); return; }
  const dur = 650, t0 = performance.now();
  const ease = x => 1 - Math.pow(1 - x, 3);
  function frame(now) {
    const p = Math.min(1, (now - t0) / dur);
    el.textContent = fmtFn(from + (to - from) * ease(p));
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Home hero: total balance, safe-to-spend split, spent/saved stat row.
async function loadHomeHero() {
  const [accRes, ovRes, recRes, trendsRes] = await Promise.all([
    apiFetch('/api/accounts'),
    apiFetch(`/api/overview?month=${monthStr()}`),
    apiFetch('/api/recurring'),
    apiFetch('/api/trends'),
  ]);
  const acc = await accRes.json();
  const ov = await ovRes.json();
  const rec = await recRes.json();
  const trends = await trendsRes.json();

  const checking = acc.checkingBalance || 0;
  const savings = acc.savingsBalance || 0;
  const totalBalance = checking + savings;

  animateCount(document.getElementById('homeBalanceVal'), totalBalance, fmt);

  // Sparkline from 6-month net-worth-ish proxy (running balance via trends net).
  const nets = trends.map(m => m.income - m.expenses);
  let running = totalBalance;
  const series = [];
  for (let i = nets.length - 1; i >= 0; i--) { series.unshift(running); running -= nets[i]; }
  series.push(totalBalance);
  const sparkPts = series.length >= 2 ? series : [totalBalance, totalBalance];
  drawSparkline('homeSpark', sparkPts, 96, 40, 5);

  // Balance change vs first point in series.
  const first = sparkPts[0] || 0;
  const changeEl = document.getElementById('homeBalanceChange');
  if (first > 0 && totalBalance !== first) {
    const pct = ((totalBalance - first) / first) * 100;
    const up = pct >= 0;
    changeEl.textContent = `${up ? '↑' : '↓'} ${Math.abs(pct).toFixed(1)}% recent trend`;
    changeEl.style.color = up ? 'var(--green)' : 'var(--muted)';
    changeEl.style.display = '';
  } else {
    changeEl.style.display = 'none';
  }

  // Bills reserved = sum of recurring expense amounts (obligations, incl. autopay).
  const billsReserved = (rec.recurring || [])
    .filter(r => r.type === 'expense')
    .reduce((s, r) => s + r.amount, 0);
  const safeToSpend = totalBalance - billsReserved;

  animateCount(document.getElementById('safeToSpendVal'), safeToSpend, fmt);
  document.getElementById('safeSpendAmt').textContent = fmt(Math.max(0, safeToSpend));
  document.getElementById('safeBillsAmt').textContent = fmt(billsReserved);

  const denom = totalBalance > 0 ? totalBalance : (Math.max(0, safeToSpend) + billsReserved) || 1;
  const spendPct = Math.max(0, Math.min(100, (Math.max(0, safeToSpend) / denom) * 100));
  const billsPct = Math.max(0, Math.min(100, (billsReserved / denom) * 100));
  document.getElementById('safeBarSpend').style.width = spendPct + '%';
  document.getElementById('safeBarBills').style.width = billsPct + '%';

  // Spent / saved this month.
  const spent = ov.expenses || 0;
  const saved = Math.max(0, ov.net || 0);
  document.getElementById('homeSpentVal').textContent = fmt(spent);
  document.getElementById('homeSavedVal').textContent = fmt(saved);
  const spentDenom = (ov.income || 0) > 0 ? ov.income : (spent || 1);
  document.getElementById('homeSpentBar').style.width = Math.min(100, (spent / spentDenom) * 100) + '%';
  document.getElementById('homeSavedBar').style.width = Math.min(100, (ov.income > 0 ? (saved / ov.income) * 100 : 0)) + '%';
}

// ── Activity filter segments ──
let txFilter = 'all';
document.querySelectorAll('#txFilterSegs .plan-seg').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#txFilterSegs .plan-seg').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    txFilter = btn.dataset.txfilter;
    loadTransactions();
  });
});

// ── More tab navigation ──
document.querySelectorAll('.more-row').forEach(row => {
  row.addEventListener('click', () => openMoreScreen(row.dataset.more));
});
document.querySelectorAll('.subscreen [data-back]').forEach(btn => {
  btn.addEventListener('click', closeMoreScreen);
});

function openMoreScreen(key) {
  document.getElementById('moreList').style.display = 'none';
  document.querySelectorAll('.subscreen').forEach(s => s.style.display = 'none');
  const el = document.getElementById('subscreen-' + key);
  if (!el) return;
  el.style.display = key === 'chat' ? 'flex' : 'block';

  if (key === 'bills') loadBillsSubscriptions();
  if (key === 'networth') loadNetWorth();
  if (key === 'debt') loadDebtPlanner();
  if (key === 'credit') loadCreditScores();
  if (key === 'tax') loadTaxEstimator();
  if (key === 'challenges') loadChallenges();
  if (key === 'shared') loadShared();
  if (key === 'calendar') { updateCalMonthLabel(); loadCalendar(); }
  if (key === 'settings') openSettingsScreen();
}

function closeMoreScreen() {
  document.querySelectorAll('.subscreen').forEach(s => s.style.display = 'none');
  document.getElementById('moreList').style.display = '';
}

// ── Helpers ──
function fmt(n) {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n) {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k';
  return fmt(n);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function pctColor(pct) {
  if (pct >= 1) return 'danger';
  if (pct >= 0.8) return 'warning';
  return '';
}

function groupByDate(txs) {
  const groups = {};
  txs.forEach(tx => {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!groups[key]) groups[key] = { label: dateLabel(d), items: [] };
    groups[key].items.push(tx);
  });
  return Object.values(groups);
}

function dateLabel(d) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

// ── Overview ──
async function loadOverview() {
  const [ovRes] = await Promise.all([
    apiFetch(`/api/overview?month=${monthStr()}`),
  ]);
  const data = await ovRes.json();

  const netEl = document.getElementById('overviewNet');
  netEl.textContent = (data.net >= 0 ? '+' : '-') + fmt(data.net);
  netEl.className = 'overview-net ' + (data.net >= 0 ? 'positive' : 'negative');

  document.getElementById('overviewIncome').textContent = fmtShort(data.income);
  document.getElementById('overviewExpenses').textContent = fmtShort(data.expenses);

  const savingsRate = data.income > 0 ? Math.round((data.net / data.income) * 100) : null;
  document.getElementById('overviewRate').textContent = savingsRate !== null ? savingsRate + '%' : '—';

  const vsEl = document.getElementById('overviewVs');
  if (data.lastExpenses > 0 && data.expenses > 0) {
    const diff = data.expenses - data.lastExpenses;
    const pct = Math.round(Math.abs(diff / data.lastExpenses) * 100);
    if (diff > 0) {
      vsEl.textContent = `↑ ${pct}% vs last month`;
      vsEl.className = 'overview-vs down';
    } else if (diff < 0) {
      vsEl.textContent = `↓ ${pct}% vs last month`;
      vsEl.className = 'overview-vs up';
    } else {
      vsEl.textContent = 'same as last month';
      vsEl.className = 'overview-vs flat';
    }
    vsEl.style.display = 'inline-block';
  } else {
    vsEl.style.display = 'none';
  }

  renderChart(data.byCategory);

  const bsList = document.getElementById('budgetStatusList');
  const bsCard = document.getElementById('budgetStatusCard');
  if (!data.budgetStatus.length) {
    bsCard.style.display = 'none';
    bsList.innerHTML = '';
  } else {
    bsCard.style.display = '';
    bsList.innerHTML = data.budgetStatus.map(b => {
      const pct = Math.min(b.spent / b.limit, 1);
      const over = b.spent > b.limit;
      const emoji = CATEGORY_EMOJI[b.category] || '📦';
      return `<div class="budget-status-item ${over ? 'over-budget' : ''}">
        <div class="budget-status-top">
          <span class="budget-status-cat">${emoji} ${b.category}${over ? '<span class="over-badge">OVER</span>' : ''}</span>
          <span class="budget-status-nums ${over ? 'over' : ''}">${fmt(b.spent)} / ${fmt(b.limit)}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill ${pctColor(pct)}" style="width:${(pct*100).toFixed(1)}%"></div></div>
      </div>`;
    }).join('');
  }

  const gsCard = document.getElementById('goalsStatusCard');
  const gsList = document.getElementById('goalsStatusList');
  if (!data.goals.length) {
    gsCard.style.display = 'none';
    gsList.innerHTML = '';
  } else {
    gsCard.style.display = '';
    gsList.innerHTML = data.goals.map(g => {
      const pct = g.target > 0 ? Math.min(g.current / g.target, 1) : 0;
      return `<div class="goal-status-item">
        <div class="goal-status-top">
          <span class="goal-status-name">${g.name}</span>
          <span class="goal-status-pct">${fmt(g.current)} / ${fmt(g.target)}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${(pct*100).toFixed(1)}%"></div></div>
      </div>`;
    }).join('');
  }

  loadInsights();
}

function renderChart(byCategory) {
  const chartBlock = document.getElementById('chartBlock');
  const entries = Object.entries(byCategory).sort(([, a], [, b]) => b - a);
  if (!entries.length) {
    chartBlock.innerHTML = '<div class="empty-state">No expenses logged yet.</div>';
    return;
  }
  const max = entries[0][1];
  chartBlock.innerHTML = entries.map(([cat, amt]) => {
    const pct = (amt / max) * 100;
    const color = CATEGORY_COLOR[cat] || '#9ca3af';
    const emoji = CATEGORY_EMOJI[cat] || '📦';
    return `<div class="chart-row" data-cat="${cat}">
      <div class="chart-cat"><span class="chart-emoji">${emoji}</span>${cat}</div>
      <div class="chart-bar-wrap"><div class="chart-bar" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>
      <div class="chart-amt">${fmt(amt)}</div>
    </div>`;
  }).join('');

  chartBlock.querySelectorAll('.chart-row').forEach(row => {
    row.addEventListener('click', () => openCategorySheet(row.dataset.cat));
  });
}

// ── Category sheet ──
const catSheet = document.getElementById('catSheet');
document.getElementById('catSheetBackdrop').addEventListener('click', closeCategorySheet);

function closeCategorySheet() {
  catSheet.classList.remove('open');
}

async function openCategorySheet(category) {
  document.getElementById('catSheetName').textContent = category;
  document.getElementById('catSheetTotal').textContent = '';
  document.getElementById('catSheetMonth').textContent = monthLabel(viewYear, viewMonth);
  document.getElementById('catSheetList').innerHTML = '<div class="cat-sheet-empty">Loading...</div>';

  catSheet.classList.add('open');

  const res = await apiFetch(`/api/transactions?month=${monthStr()}`);
  const txs = await res.json();
  const filtered = txs.filter(t => t.category === category && t.type === 'expense');
  const total = filtered.reduce((s, t) => s + t.amount, 0);

  document.getElementById('catSheetTotal').textContent = '-' + fmt(total);

  if (!filtered.length) {
    document.getElementById('catSheetList').innerHTML = '<div class="cat-sheet-empty">No transactions in this category.</div>';
    return;
  }

  document.getElementById('catSheetList').innerHTML = filtered.map(tx => {
    const label = tx.description || tx.category;
    return `<div class="cat-sheet-item">
      <div class="cat-sheet-info">
        <div class="cat-sheet-desc">${label}</div>
        <div class="cat-sheet-date">${fmtDate(tx.date)}</div>
      </div>
      <div class="cat-sheet-amt">-${fmt(tx.amount)}</div>
    </div>`;
  }).join('');
}

async function loadInsights() {
  const insightText = document.getElementById('insightText');
  insightText.innerHTML = '<span class="insight-loading" style="width:90%;display:block"></span><span class="insight-loading" style="width:65%;display:block"></span>';
  try {
    const res = await apiFetch('/api/insights', {
      method: 'POST',
      body: JSON.stringify({ month: monthStr() }),
    });
    const data = await res.json();
    insightText.textContent = data.insight || 'Add some transactions to get insights.';
  } catch {
    insightText.textContent = 'Add some transactions to get insights.';
  }
}

// ── Transactions ──
let txType = 'income';

document.getElementById('txTypeIncome').addEventListener('click', () => setTxType('income'));
document.getElementById('txTypeExpense').addEventListener('click', () => setTxType('expense'));

function setTxType(type) {
  txType = type;
  document.querySelectorAll('.tx-type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tx-type-btn[data-type="${type}"]`).classList.add('active');
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

document.getElementById('txDate').value = todayStr();

document.getElementById('txSubmitBtn').addEventListener('click', async () => {
  const amount = document.getElementById('txAmount').value;
  const category = document.getElementById('txCategory').value;
  const description = document.getElementById('txDesc').value;
  const recurring = document.getElementById('txRecurring').checked;
  const date = document.getElementById('txDate').value || todayStr();
  if (!amount || !category) return;

  const btn = document.getElementById('txSubmitBtn');
  btn.disabled = true;
  await apiFetch('/api/transactions', {
    method: 'POST',
    body: JSON.stringify({ type: txType, amount, category, description, recurring, date }),
  });
  btn.disabled = false;

  document.getElementById('txAmount').value = '';
  document.getElementById('txCategory').value = '';
  document.getElementById('txDesc').value = '';
  document.getElementById('txRecurring').checked = false;
  document.getElementById('txDate').value = todayStr();
  loadTransactions();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  window.location.href = `/api/export?month=${monthStr()}&token=${authToken}`;
});

async function loadTransactions() {
  const res = await apiFetch(`/api/transactions?month=${monthStr()}`);
  let txs = await res.json();
  const list = document.getElementById('txList');

  if (txFilter === 'income') txs = txs.filter(t => t.type === 'income');
  else if (txFilter === 'expenses') txs = txs.filter(t => t.type === 'expense');

  if (!txs.length) {
    list.innerHTML = '<div class="empty-state">No transactions this month.</div>';
    return;
  }

  const groups = groupByDate(txs);
  list.innerHTML = groups.map(group => `
    <div class="tx-date-group">
      <div class="day-group-label">${group.label}</div>
      <div class="tile-list">
        ${group.items.map(tx => {
          const name = tx.description || tx.category;
          const color = tileColor(tx.category);
          const initial = tileInitial(name);
          const isIncome = tx.type === 'income';
          const sign = isIncome ? '+' : '-';
          return `<div class="tile-row">
            <div class="tile-avatar" style="background:${color}">${initial}</div>
            <div class="tile-info">
              <div class="tile-name">${name}${tx.recurring ? ' <span class="tx-recurring-tag">Recurring</span>' : ''}</div>
              <div class="tile-sub">${tx.category}</div>
            </div>
            <div class="tile-amount ${isIncome ? 'positive' : 'negative'}">${sign}${fmt(tx.amount)}</div>
            <button class="tx-delete" data-id="${tx.id}" title="Delete">×</button>
          </div>`;
        }).join('')}
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.tx-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      await apiFetch(`/api/transactions/${btn.dataset.id}`, { method: 'DELETE' });
      loadTransactions();
    });
  });
}

// ── Budgets ──
document.getElementById('budgetBtn').addEventListener('click', async () => {
  const category = document.getElementById('budgetCategory').value;
  const limit = document.getElementById('budgetLimit').value;
  if (!category || !limit) return;

  await apiFetch('/api/budgets', {
    method: 'POST',
    body: JSON.stringify({ category, limit }),
  });

  document.getElementById('budgetCategory').value = '';
  document.getElementById('budgetLimit').value = '';
  loadBudgets();
});

async function loadBudgets() {
  const [bRes, oRes] = await Promise.all([
    apiFetch('/api/budgets'),
    apiFetch(`/api/overview?month=${monthStr()}`),
  ]);
  const budgets = await bRes.json();
  const overview = await oRes.json();

  const list = document.getElementById('budgetList');
  const ringCard = document.getElementById('budgetRingCard');
  if (!budgets.length) {
    list.innerHTML = '<div class="empty-state">No budgets set yet.</div>';
    if (ringCard) ringCard.style.display = 'none';
    return;
  }

  const spentMap = {};
  overview.budgetStatus.forEach(b => { spentMap[b.category] = b.spent; });

  // Summary ring: total spent / total budget.
  if (ringCard) {
    const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent = budgets.reduce((s, b) => s + (spentMap[b.category] || 0), 0);
    const ringPct = totalLimit > 0 ? Math.min(totalSpent / totalLimit, 1) : 0;
    const circ = 2 * Math.PI * 30;
    document.getElementById('budgetRingArc').setAttribute('stroke-dasharray', `${(ringPct * circ).toFixed(1)} ${circ.toFixed(1)}`);
    document.getElementById('budgetRingLabel').textContent = `Spent of ${fmt(totalLimit)} budget`;
    document.getElementById('budgetRingTotal').textContent = fmt(totalSpent);
    ringCard.style.display = 'flex';
  }

  list.innerHTML = budgets.map(b => {
    const spent = spentMap[b.category] || 0;
    const pct = Math.min(spent / b.limit, 1);
    const over = spent > b.limit;
    const remaining = b.limit - spent;
    const emoji = CATEGORY_EMOJI[b.category] || '📦';

    let remainingClass = 'ok';
    let remainingText = `${fmt(remaining)} remaining`;
    if (over) { remainingClass = 'over'; remainingText = `${fmt(Math.abs(remaining))} over budget`; }
    else if (pct >= 0.8) { remainingClass = 'warn'; }

    return `<div class="budget-item ${over ? 'over-budget' : ''}">
      <div class="budget-item-top">
        <span class="budget-item-cat">${emoji} ${b.category}</span>
        <div class="budget-item-right">
          <span class="budget-item-nums ${over ? 'over' : ''}">${fmt(spent)} / ${fmt(b.limit)}</span>
          <button class="budget-delete" data-cat="${b.category}" title="Delete">×</button>
        </div>
      </div>
      <div class="progress-bar"><div class="progress-fill ${pctColor(pct)}" style="width:${(pct*100).toFixed(1)}%"></div></div>
      <div class="budget-remaining ${remainingClass}">${remainingText}</div>
    </div>`;
  }).join('');

  list.querySelectorAll('.budget-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      await apiFetch(`/api/budgets/${encodeURIComponent(btn.dataset.cat)}`, { method: 'DELETE' });
      loadBudgets();
    });
  });
}

// ── Goals ──
document.getElementById('goalBtn').addEventListener('click', async () => {
  const name = document.getElementById('goalName').value.trim();
  const target = document.getElementById('goalTarget').value;
  if (!name || !target) return;

  await apiFetch('/api/goals', {
    method: 'POST',
    body: JSON.stringify({ name, target }),
  });

  document.getElementById('goalName').value = '';
  document.getElementById('goalTarget').value = '';
  loadGoals();
});

async function loadGoals() {
  const res = await apiFetch('/api/goals');
  const goals = await res.json();
  const list = document.getElementById('goalsList');

  if (!goals.length) {
    list.innerHTML = '<div class="empty-state">No goals yet.</div>';
    return;
  }

  list.innerHTML = goals.map(g => {
    const pct = g.target > 0 ? Math.min(g.current / g.target, 1) : 0;
    const done = g.current >= g.target;

    let eta = '';
    if (!done && g.deposits && g.deposits.length >= 2) {
      const avgDeposit = g.deposits.reduce((s, d) => s + d.amount, 0) / g.deposits.length;
      const remaining = g.target - g.current;
      const depositsNeeded = Math.ceil(remaining / avgDeposit);
      eta = `<div class="goal-eta">~${depositsNeeded} more deposit${depositsNeeded !== 1 ? 's' : ''} at current rate</div>`;
    }

    return `<div class="goal-item" data-id="${g.id}">
      <div class="goal-item-top">
        <span class="goal-item-name">${g.name}</span>
        <span class="goal-item-pct">${(pct * 100).toFixed(0)}%</span>
      </div>
      <div class="goal-item-amounts"><strong>${fmt(g.current)}</strong> of ${fmt(g.target)}</div>
      ${eta}
      <div class="goal-progress progress-bar">
        <div class="progress-fill" style="width:${(pct*100).toFixed(1)}%"></div>
      </div>
      ${done
        ? '<div class="goal-done-badge">✓ Goal reached!</div>'
        : `<div class="goal-deposit-row">
            <input class="goal-deposit-input" type="number" placeholder="Add amount ($)" min="0" step="1" />
            <button class="goal-deposit-btn">Add</button>
           </div>`
      }
      <button class="goal-delete" data-id="${g.id}">Remove goal</button>
    </div>`;
  }).join('');

  list.querySelectorAll('.goal-deposit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.goal-item');
      const id = row.dataset.id;
      const input = row.querySelector('.goal-deposit-input');
      const amount = input.value;
      if (!amount) return;
      btn.disabled = true;
      await apiFetch(`/api/goals/${id}/deposit`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      loadGoals();
    });
  });

  list.querySelectorAll('.goal-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      await apiFetch(`/api/goals/${btn.dataset.id}`, { method: 'DELETE' });
      loadGoals();
    });
  });
}

// ── Chat ──
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const messagesEl = document.getElementById('messages');

msgInput.addEventListener('input', () => {
  sendBtn.disabled = !msgInput.value.trim();
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
});

msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) sendMessage(); }
});

sendBtn.addEventListener('click', sendMessage);

document.querySelectorAll('.quick-ask').forEach(btn => {
  btn.addEventListener('click', () => {
    msgInput.value = btn.dataset.q;
    sendBtn.disabled = false;
    sendMessage();
  });
});

function addMsg(role, text) {
  const welcome = messagesEl.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  const div = document.createElement('div');
  div.className = `msg msg-${role}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  msgInput.value = '';
  msgInput.style.height = 'auto';
  sendBtn.disabled = true;

  addMsg('user', text);
  const botDiv = addMsg('assistant', '');
  let buffer = '';

  const res = await apiFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: text, month: monthStr() }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let partial = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    partial += decoder.decode(value, { stream: true });
    const lines = partial.split('\n');
    partial = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const evt = JSON.parse(line.slice(6));
        if (evt.type === 'chunk') {
          buffer += evt.text;
          botDiv.textContent = buffer;
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
      } catch {}
    }
  }

  sendBtn.disabled = false;
  msgInput.focus();
}

// ── Subscriptions ──
const SUB_COLORS = [APPLE.blue, APPLE.indigo, APPLE.purple, APPLE.pink, APPLE.orange, APPLE.teal, APPLE.green, APPLE.gray];

function subColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return SUB_COLORS[Math.abs(hash) % SUB_COLORS.length];
}

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

document.querySelectorAll('.sub-qp').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('subName').value = btn.dataset.name;
    document.getElementById('subAmount').value = btn.dataset.amount;
    document.getElementById('subCycle').value = btn.dataset.cycle;
    const next = new Date();
    next.setMonth(next.getMonth() + 1, 1);
    document.getElementById('subNextBilling').value = next.toISOString().split('T')[0];
    document.getElementById('subName').focus();
  });
});

document.getElementById('subSubmitBtn').addEventListener('click', async () => {
  const name = document.getElementById('subName').value.trim();
  const amount = document.getElementById('subAmount').value;
  const cycle = document.getElementById('subCycle').value;
  const nextBilling = document.getElementById('subNextBilling').value;
  if (!name || !amount) return;

  const btn = document.getElementById('subSubmitBtn');
  btn.disabled = true;
  await apiFetch('/api/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ name, amount, cycle, nextBilling }),
  });
  btn.disabled = false;

  document.getElementById('subName').value = '';
  document.getElementById('subAmount').value = '';
  document.getElementById('subNextBilling').value = '';
  loadSubscriptions();
});

// Bills & Subscriptions screen combines recurring expenses (bills, with
// autopay toggle) and tracked subscriptions.
async function loadBillsSubscriptions() {
  loadBills();
  loadSubscriptions();
}

async function loadBills() {
  const res = await apiFetch('/api/recurring');
  const { recurring } = await res.json();
  const bills = (recurring || []).filter(r => r.type === 'expense');
  const list = document.getElementById('billsList');

  if (!bills.length) {
    list.innerHTML = '<div class="empty-state">No bills yet. Add recurring expenses in Activity.</div>';
    return;
  }

  const sorted = [...bills].sort((a, b) => (a.nextDate || '').localeCompare(b.nextDate || ''));
  list.innerHTML = sorted.map(b => {
    const name = b.description || b.category;
    const color = tileColor(b.category);
    const initial = tileInitial(name);
    let due = '';
    if (b.nextDate) {
      const d = new Date(b.nextDate + 'T00:00:00');
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const days = daysUntil(b.nextDate);
      if (days < 0) due = `Due ${dateLabel} · overdue`;
      else if (days === 0) due = `Due ${dateLabel} · today`;
      else due = `Due ${dateLabel} · in ${days} day${days !== 1 ? 's' : ''}`;
    }
    return `<div class="tile-row">
      <div class="tile-avatar" style="background:${color}">${initial}</div>
      <div class="tile-info">
        <div class="tile-name">${name}</div>
        <div class="tile-sub">${due}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="tile-amount negative" style="margin-bottom:4px">${fmt(b.amount)}</div>
        <button class="pill-toggle ${b.autopay ? 'on' : ''}" data-bill="${b.id}" title="Autopay"><div class="knob"></div></button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.pill-toggle[data-bill]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.classList.toggle('on');
      await apiFetch(`/api/recurring/${btn.dataset.bill}/autopay`, { method: 'POST' });
      loadHomeHero();
    });
  });
}

async function loadSubscriptions() {
  const res = await apiFetch('/api/subscriptions');
  const { subscriptions, monthlyTotal } = await res.json();

  const summaryEl = document.getElementById('subSummary');
  if (monthlyTotal > 0) {
    summaryEl.style.display = '';
    document.getElementById('subMonthlyTotal').textContent = fmt(monthlyTotal);
    document.getElementById('subAnnualTotal').textContent = fmt(monthlyTotal * 12);
  } else {
    summaryEl.style.display = 'none';
  }

  const list = document.getElementById('subList');
  if (!subscriptions.length) {
    list.innerHTML = '<div class="empty-state">No subscriptions tracked yet.</div>';
    return;
  }

  const sorted = [...subscriptions].sort((a, b) => a.nextBilling.localeCompare(b.nextBilling));

  list.innerHTML = sorted.map(s => {
    const days = daysUntil(s.nextBilling);
    const d = new Date(s.nextBilling + 'T00:00:00');
    const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    let billingClass = '';
    let billingText = dateLabel;
    if (days === 0) { billingClass = 'today'; billingText = 'Bills today'; }
    else if (days < 0) { billingText = 'Past due'; billingClass = 'today'; }
    else if (days <= 5) { billingClass = 'soon'; billingText = `In ${days} day${days !== 1 ? 's' : ''}`; }
    else billingText = dateLabel;

    const monthly = s.cycle === 'yearly' ? s.amount / 12 : s.amount;
    const amtLabel = s.cycle === 'yearly'
      ? `$${s.amount.toFixed(2)}/yr`
      : `$${s.amount.toFixed(2)}/mo`;

    const color = subColor(s.name);
    const initial = s.name.charAt(0).toUpperCase();
    const cancelled = s.active === false;

    return `<div class="sub-item ${cancelled ? 'cancelled' : ''}">
      <div class="sub-avatar" style="background:${color}">${initial}</div>
      <div class="sub-info">
        <div class="sub-name">${s.name}</div>
        <div class="sub-meta">${amtLabel}${s.cycle === 'yearly' ? ` · $${monthly.toFixed(2)}/mo` : ''}</div>
      </div>
      <div class="sub-right">
        ${cancelled
          ? '<span class="sub-cancelled-badge">Cancelled</span>'
          : `<div class="sub-billing ${billingClass}">${billingText}</div>`
        }
        <div class="sub-actions">
          ${!cancelled ? `<button class="sub-action-btn" data-action="cancel" data-id="${s.id}">Cancel</button>` : ''}
          <button class="sub-action-btn" data-action="delete" data-id="${s.id}">Remove</button>
        </div>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.sub-action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { action, id } = btn.dataset;
      if (action === 'delete') {
        await apiFetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      } else if (action === 'cancel') {
        await apiFetch(`/api/subscriptions/${id}/cancel`, { method: 'POST' });
      }
      loadSubscriptions();
    });
  });
}

// ── Health score ──
async function loadHealthScore() {
  const res = await apiFetch('/api/score');
  const data = await res.json();
  const card = document.getElementById('scoreCard');
  const gradeColors = { A: APPLE.green, B: APPLE.green, C: APPLE.blue, D: APPLE.orange, F: APPLE.red };

  if (!data.ready) {
    card.innerHTML = `<div class="score-unlock">
      <div class="score-unlock-title">Your score is building</div>
      <div class="score-unlock-body">Log your income and expenses this month to unlock your financial health score.</div>
      <button class="score-unlock-btn" onclick="switchTab('transactions')">Add your first transaction</button>
    </div>`;
    return;
  }

  card.innerHTML = `
    <div class="score-left">
      <div class="score-number">${data.score}</div>
      <div class="score-label">Financial health</div>
    </div>
    <div class="score-grade" style="color:${gradeColors[data.grade] || APPLE.gray}">${data.grade}</div>
    <div class="score-bars">
      ${Object.values(data.components).map(c => {
        const pct = (c.score / c.max) * 100;
        return `<div class="score-bar-row">
          <div class="score-bar-label">${c.label}</div>
          <div class="score-bar-track"><div class="score-bar-fill" style="width:${pct.toFixed(0)}%"></div></div>
          <div class="score-bar-pts">${c.score}/${c.max}</div>
        </div>`;
      }).join('')}
    </div>`;
}

// ── Cash flow forecast (card removed from Home; handlers kept null-safe) ──
bind('forecastSetBtn', 'click', () => {
  const row = document.getElementById('forecastSetRow');
  if (row) row.style.display = row.style.display === 'none' ? '' : 'none';
});

bind('forecastSaveBtn', 'click', async () => {
  const balance = document.getElementById('forecastBalanceInput').value;
  if (!balance) return;
  await apiFetch('/api/forecast/balance', {
    method: 'POST',
    body: JSON.stringify({ balance }),
  });
  document.getElementById('forecastSetRow').style.display = 'none';
  loadForecast();
});

async function loadForecast() {
  const res = await apiFetch('/api/forecast');
  const data = await res.json();

  const cpEl = document.getElementById('forecastCheckpoints');
  if (data.currentBalance === null || data.currentBalance === 0 && !data.events.length) {
    cpEl.innerHTML = '<div class="empty-state" style="padding:12px 0">Set your current balance to see a forecast.</div>';
    document.getElementById('forecastEvents').innerHTML = '';
    return;
  }

  cpEl.innerHTML = data.checkpoints.map(cp => {
    const cls = cp.balance < 0 ? 'negative' : 'positive';
    const sign = cp.balance >= 0 ? '+' : '';
    return `<div class="forecast-cp ${cls}">
      <div class="forecast-cp-days">${cp.days}d</div>
      <div class="forecast-cp-val">${sign}${fmt(cp.balance)}</div>
    </div>`;
  }).join('');

  const evEl = document.getElementById('forecastEvents');
  if (!data.events.length) { evEl.innerHTML = ''; return; }
  evEl.innerHTML = data.events.map(e => {
    const d = new Date(e.date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const cls = e.amount >= 0 ? 'income' : 'expense';
    const sign = e.amount >= 0 ? '+' : '-';
    return `<div class="forecast-event">
      <div class="forecast-event-date">${dateStr}</div>
      <div class="forecast-event-label">${e.label}</div>
      <div class="forecast-event-amt ${cls}">${sign}${fmt(Math.abs(e.amount))}</div>
    </div>`;
  }).join('');
}

// ── Net worth ──
const ASSET_LABEL = { liquid: 'Cash', investment: 'Investment', property: 'Property', vehicle: 'Vehicle', other: 'Other' };

async function loadNetWorth() {
  const res = await apiFetch('/api/networth');
  const data = await res.json();

  document.getElementById('nwAssets').textContent = fmt(data.totalAssets);
  document.getElementById('nwLiabilities').textContent = fmt(data.totalLiabilities);
  const nwEl = document.getElementById('nwNet');
  nwEl.textContent = (data.netWorth >= 0 ? '+' : '-') + fmt(Math.abs(data.netWorth));
  nwEl.style.color = data.netWorth >= 0 ? 'var(--accent-dark)' : 'var(--red)';

  const aList = document.getElementById('assetList');
  aList.innerHTML = data.assets.length ? data.assets.map(a => `
    <div class="nw-item">
      <div class="nw-item-info">
        <div class="nw-item-name">${a.name}</div>
        <div class="nw-item-type">${ASSET_LABEL[a.type] || a.type}</div>
      </div>
      <div class="nw-item-val asset">${fmt(a.value)}</div>
      <button class="nw-delete" data-type="assets" data-id="${a.id}">×</button>
    </div>`).join('') : '<div class="empty-state">No assets added yet.</div>';

  const lList = document.getElementById('liabList');
  lList.innerHTML = data.liabilities.length ? data.liabilities.map(l => `
    <div class="nw-item">
      <div class="nw-item-icon">💳</div>
      <div class="nw-item-info">
        <div class="nw-item-name">${l.name}</div>
        <div class="nw-item-type">${l.interestRate}% · $${l.minPayment}/mo min</div>
      </div>
      <div class="nw-item-val liability">-${fmt(l.balance)}</div>
      <button class="nw-delete" data-type="liabilities" data-id="${l.id}">×</button>
    </div>`).join('') : '<div class="empty-state">No liabilities added yet.</div>';

  document.querySelectorAll('.nw-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      await apiFetch(`/api/${btn.dataset.type}/${btn.dataset.id}`, { method: 'DELETE' });
      loadNetWorth();
    });
  });
}

document.getElementById('addAssetBtn').addEventListener('click', async () => {
  const name = document.getElementById('assetName').value.trim();
  const type = document.getElementById('assetType').value;
  const value = document.getElementById('assetValue').value;
  if (!name || !value) return;
  await apiFetch('/api/assets', {
    method: 'POST',
    body: JSON.stringify({ name, type, value }),
  });
  document.getElementById('assetName').value = '';
  document.getElementById('assetValue').value = '';
  loadNetWorth();
});

document.getElementById('addLiabBtn').addEventListener('click', async () => {
  const name = document.getElementById('liabName').value.trim();
  const balance = document.getElementById('liabBalance').value;
  const interestRate = document.getElementById('liabRate').value;
  const minPayment = document.getElementById('liabMinPayment').value;
  if (!name || !balance) return;
  await apiFetch('/api/liabilities', {
    method: 'POST',
    body: JSON.stringify({ name, balance, interestRate, minPayment }),
  });
  document.getElementById('liabName').value = '';
  document.getElementById('liabBalance').value = '';
  document.getElementById('liabRate').value = '';
  document.getElementById('liabMinPayment').value = '';
  loadNetWorth();
});

// ── Debt payoff planner ──
function simulatePayoff(debts, extra) {
  if (!debts.length) return { months: 0, totalInterest: 0 };
  const balances = debts.map(d => ({ ...d, bal: d.balance }));
  let months = 0, totalInterest = 0;
  const totalMin = balances.reduce((s, d) => s + (d.minPayment || 0), 0);

  while (balances.some(d => d.bal > 0.01) && months < 600) {
    months++;
    let extra2 = extra;
    balances.forEach(d => {
      if (d.bal <= 0) return;
      const interest = d.bal * (d.interestRate / 100 / 12);
      totalInterest += interest;
      d.bal += interest;
      const pay = Math.min(d.minPayment || 0, d.bal);
      d.bal -= pay;
      if (d.bal < 0) { extra2 += Math.abs(d.bal); d.bal = 0; }
    });
    for (const d of balances) {
      if (d.bal <= 0.01) continue;
      const apply = Math.min(extra2, d.bal);
      d.bal -= apply; extra2 -= apply;
      if (extra2 <= 0) break;
    }
  }
  return { months, totalInterest };
}

async function loadDebtPlanner() {
  const res = await apiFetch('/api/networth');
  const data = await res.json();
  const debts = data.liabilities;

  if (!debts.length) {
    document.getElementById('debtNoDebts').style.display = '';
    document.getElementById('debtResults').style.display = 'none';
    return;
  }
  document.getElementById('debtNoDebts').style.display = 'none';
}

document.getElementById('debtCalcBtn').addEventListener('click', async () => {
  const extra = parseFloat(document.getElementById('debtExtraPayment').value) || 0;
  const res = await apiFetch('/api/networth');
  const data = await res.json();
  const debts = data.liabilities;

  if (!debts.length) {
    document.getElementById('debtNoDebts').style.display = '';
    document.getElementById('debtResults').style.display = 'none';
    return;
  }

  const avalancheOrder = [...debts].sort((a, b) => b.interestRate - a.interestRate);
  const snowballOrder = [...debts].sort((a, b) => a.balance - b.balance);

  const av = simulatePayoff(avalancheOrder, extra);
  const sw = simulatePayoff(snowballOrder, extra);

  function monthsLabel(m) {
    if (m >= 600) return 'Over 50 years';
    const y = Math.floor(m / 12), mo = m % 12;
    return y > 0 ? `${y}y ${mo}mo` : `${mo} months`;
  }

  document.getElementById('avalancheStats').innerHTML = `
    <div class="debt-stat"><strong>${monthsLabel(av.months)}</strong>Time to debt-free</div>
    <div class="debt-stat"><strong>$${av.totalInterest.toFixed(0)}</strong>Total interest paid</div>`;

  document.getElementById('snowballStats').innerHTML = `
    <div class="debt-stat"><strong>${monthsLabel(sw.months)}</strong>Time to debt-free</div>
    <div class="debt-stat"><strong>$${sw.totalInterest.toFixed(0)}</strong>Total interest paid</div>`;

  document.getElementById('debtOrderList').innerHTML = avalancheOrder.map((d, i) => `
    <div class="debt-order-item">
      <div class="debt-order-num">${i + 1}</div>
      <div class="debt-order-name">${d.name}</div>
      <div class="debt-order-rate">${d.interestRate}%</div>
      <div class="debt-order-bal">-${fmt(d.balance)}</div>
    </div>`).join('');

  document.getElementById('debtResults').style.display = '';
  document.getElementById('debtNoDebts').style.display = 'none';
});

// ── Calendar ──
let calYear = now.getFullYear();
let calMonth = now.getMonth(); // 0-indexed
let calPaydayDays = [];
let calScheduleType = '';
let calIsCustom = false;

function calMonthStr() {
  return `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
}

function updateCalMonthLabel() {
  document.getElementById('calMonthLabel').textContent =
    new Date(calYear, calMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  document.getElementById('calNext').disabled =
    calYear === now.getFullYear() && calMonth === now.getMonth();
}

document.getElementById('calPrev').addEventListener('click', () => {
  if (calMonth === 0) { calMonth = 11; calYear--; } else calMonth--;
  updateCalMonthLabel();
  loadCalendar();
});

document.getElementById('calNext').addEventListener('click', () => {
  if (calMonth === 11) { calMonth = 0; calYear++; } else calMonth++;
  updateCalMonthLabel();
  loadCalendar();
});

async function loadCalendar() {
  const res = await apiFetch(`/api/paydays?month=${calMonthStr()}`);
  const data = await res.json();
  calPaydayDays = data.days || [];
  renderCalendarGrid(calPaydayDays);
  renderPaydayBanner(data.next);
  if (data.schedule) populateScheduleForm(data.schedule);
}

function renderPaydayBanner(next) {
  const banner = document.getElementById('paydayBanner');
  const bannerEmpty = document.getElementById('paydayBannerEmpty');
  if (!next) {
    banner.style.display = 'none';
    bannerEmpty.style.display = '';
    return;
  }
  banner.style.display = '';
  bannerEmpty.style.display = 'none';

  const d = new Date(next.date + 'T00:00:00');
  document.getElementById('paydayDate').textContent =
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const cd = document.getElementById('paydayCountdown');
  if (next.daysUntil === 0) {
    cd.innerHTML = `<span>Today!</span>`;
  } else {
    cd.innerHTML = `${next.daysUntil}<span> day${next.daysUntil !== 1 ? 's' : ''}</span>`;
  }
}

function renderCalendarGrid(paydayDays) {
  const today = new Date();
  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const headers = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    .map(d => `<div class="cal-day-header">${d}</div>`).join('');

  const blanks = Array(firstDow).fill('<div class="cal-cell cal-empty"></div>').join('');

  const cells = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const isToday = today.getDate() === day && today.getMonth() === calMonth && today.getFullYear() === calYear;
    const isPayday = paydayDays.includes(day);
    const isPast = new Date(calYear, calMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isClickable = calIsCustom;

    const classes = [
      'cal-cell',
      isClickable ? 'cal-clickable' : '',
      isToday ? 'cal-today' : '',
      isPayday ? 'cal-payday' : '',
      (!isToday && !isPayday && isPast) ? 'cal-past' : '',
    ].filter(Boolean).join(' ');

    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return `<div class="${classes}" data-date="${dateStr}">${day}</div>`;
  }).join('');

  const grid = document.getElementById('calGrid');
  grid.innerHTML = headers + blanks + cells;

  if (calIsCustom) {
    grid.querySelectorAll('.cal-cell.cal-clickable').forEach(cell => {
      cell.addEventListener('click', async () => {
        const res = await apiFetch('/api/paydays/toggle', {
          method: 'POST',
          body: JSON.stringify({ date: cell.dataset.date }),
        });
        const data = await res.json();
        calPaydayDays = data.days || [];
        renderCalendarGrid(calPaydayDays);
        renderPaydayBanner(data.next);
      });
    });
  }
}

function populateScheduleForm(schedule) {
  if (!schedule) return;
  calScheduleType = schedule.type;
  const sel = document.getElementById('scheduleType');
  sel.value = schedule.type;
  showScheduleOpts(schedule.type);

  if (schedule.type === 'biweekly' && schedule.startDate) {
    document.getElementById('scheduleBiweeklyStart').value = schedule.startDate;
  }
  if (schedule.type === 'monthly' && schedule.monthlyDay) {
    document.getElementById('scheduleMonthlyDay').value = schedule.monthlyDay;
  }
  if (schedule.type === 'semimonthly' && schedule.semimonthlyDays) {
    document.getElementById('scheduleSemiD1').value = schedule.semimonthlyDays[0] || '';
    document.getElementById('scheduleSemiD2').value = schedule.semimonthlyDays[1] || '';
  }
  if (schedule.type === 'weekly' && schedule.startDate) {
    const dow = new Date(schedule.startDate + 'T00:00:00').getDay();
    document.getElementById('scheduleWeekDay').value = dow;
  }
}

function showScheduleOpts(type) {
  calIsCustom = type === 'custom';
  document.getElementById('scheduleWeeklyOpts').style.display = type === 'weekly' ? '' : 'none';
  document.getElementById('scheduleBiweeklyOpts').style.display = type === 'biweekly' ? '' : 'none';
  document.getElementById('scheduleSemimonthlyOpts').style.display = type === 'semimonthly' ? '' : 'none';
  document.getElementById('scheduleMonthlyOpts').style.display = type === 'monthly' ? '' : 'none';
  document.getElementById('scheduleCustomNote').style.display = type === 'custom' ? '' : 'none';
}

document.getElementById('scheduleType').addEventListener('change', e => {
  showScheduleOpts(e.target.value);
  if (e.target.value === 'custom') renderCalendarGrid(calPaydayDays);
  else { calIsCustom = false; renderCalendarGrid(calPaydayDays); }
});

document.getElementById('scheduleSaveBtn').addEventListener('click', async () => {
  const type = document.getElementById('scheduleType').value;
  if (!type) return;

  let schedule = { type };

  if (type === 'biweekly') {
    schedule.startDate = document.getElementById('scheduleBiweeklyStart').value;
  } else if (type === 'monthly') {
    schedule.monthlyDay = parseInt(document.getElementById('scheduleMonthlyDay').value);
  } else if (type === 'semimonthly') {
    schedule.semimonthlyDays = [
      parseInt(document.getElementById('scheduleSemiD1').value) || 1,
      parseInt(document.getElementById('scheduleSemiD2').value) || 15,
    ].sort((a, b) => a - b);
  } else if (type === 'weekly') {
    const dow = parseInt(document.getElementById('scheduleWeekDay').value);
    const ref = new Date();
    const diff = (dow - ref.getDay() + 7) % 7;
    ref.setDate(ref.getDate() - (7 - diff) % 7);
    schedule.startDate = `${ref.getFullYear()}-${String(ref.getMonth()+1).padStart(2,'0')}-${String(ref.getDate()).padStart(2,'0')}`;
  } else if (type === 'custom') {
    const existing = await apiFetch('/api/paydays').then(r => r.json());
    schedule.customDates = existing.schedule?.customDates || [];
  }

  const btn = document.getElementById('scheduleSaveBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  const res = await apiFetch('/api/paydays', {
    method: 'POST',
    body: JSON.stringify({ schedule }),
  });
  const data = await res.json();
  btn.disabled = false;
  btn.textContent = 'Save schedule';
  calPaydayDays = data.days || [];
  calIsCustom = type === 'custom';
  renderCalendarGrid(calPaydayDays);
  renderPaydayBanner(data.next);
});

// ── Alerts (Feature 2 integrated) ──
async function loadAlerts() {
  const [alertRes, anomalyRes] = await Promise.all([
    apiFetch('/api/alerts'),
    apiFetch('/api/anomalies'),
  ]);
  const alerts = await alertRes.json();
  const anomalies = await anomalyRes.json();

  const block = document.getElementById('alertsBlock');
  let html = '';

  if (alerts.length) {
    html += alerts.map(a => {
      const emoji = CATEGORY_EMOJI[a.category] || '📦';
      const over = a.level === 'over';
      const msg = over
        ? `${emoji} ${a.category} is $${(a.spent - a.limit).toFixed(0)} over budget`
        : `${emoji} ${a.category} is at ${Math.round(a.pct * 100)}% of budget`;
      return `<div class="alert-card alert-card--${a.level}">${msg}</div>`;
    }).join('');
  }

  if (anomalies.length) {
    html += anomalies.map(a => {
      const emoji = CATEGORY_EMOJI[a.category] || '📦';
      return `<div class="alert-card alert-card--anomaly"><span class="alert-icon">🔍</span>${emoji} ${a.category} up ${a.pctAbove}% vs your avg</div>`;
    }).join('');
  }

  block.innerHTML = html;
}

// ── Upcoming bills ──
async function loadUpcoming() {
  const res = await apiFetch('/api/upcoming');
  const bills = await res.json();
  const card = document.getElementById('upcomingCard');
  const list = document.getElementById('upcomingList');
  if (!bills.length) { card.style.display = 'none'; return; }
  card.style.display = '';
  const today = new Date().toISOString().split('T')[0];
  list.innerHTML = bills.map(b => {
    const d = new Date(b.nextDate + 'T00:00:00');
    const isToday = b.nextDate === today;
    const mon = d.toLocaleString('default', { month: 'short' });
    const emoji = CATEGORY_EMOJI[b.category] || '📦';
    return `<div class="upcoming-item">
      <div class="upcoming-date-badge ${isToday ? 'due-today' : ''}">
        <div class="upcoming-date-day">${d.getDate()}</div>
        <div class="upcoming-date-mon">${mon}</div>
      </div>
      <div class="upcoming-info">
        <div class="upcoming-name">${b.description || b.category}</div>
        <div class="upcoming-cat">${emoji} ${b.category}</div>
      </div>
      <div class="upcoming-amt">-${fmt(b.amount)}</div>
    </div>`;
  }).join('');
}

// ── Trends chart ──
async function loadTrends() {
  const res = await apiFetch('/api/trends');
  const months = await res.json();
  const el = document.getElementById('trendsChart');
  const hasData = months.some(m => m.income > 0 || m.expenses > 0);
  if (!hasData) { el.innerHTML = '<div class="empty-state" style="padding:12px 0">No history yet.</div>'; return; }

  const barAccent = cssVar('--accent');
  const barMuted = cssVar('--surface-3');
  const barLabel = cssVar('--muted');
  const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expenses)), 1);
  const H = 80, barW = 9, gapBetween = 4, groupGap = 10;
  const groupW = barW * 2 + gapBetween + groupGap;
  const totalW = groupW * months.length - groupGap;

  const bars = months.map((m, i) => {
    const x = i * groupW;
    const incH = (m.income / maxVal) * H;
    const expH = (m.expenses / maxVal) * H;
    return `
      <rect x="${x}" y="${(H - incH).toFixed(1)}" width="${barW}" height="${incH.toFixed(1)}" fill="${barAccent}" rx="3"/>
      <rect x="${x + barW + gapBetween}" y="${(H - expH).toFixed(1)}" width="${barW}" height="${expH.toFixed(1)}" fill="${barMuted}" rx="3"/>
      <text x="${(x + barW + gapBetween / 2).toFixed(1)}" y="${H + 14}" text-anchor="middle" font-size="9" fill="${barLabel}" font-family="inherit">${m.label}</text>`;
  }).join('');

  el.innerHTML = `<svg class="trends-svg" viewBox="-2 0 ${totalW + 4} ${H + 20}" width="100%" preserveAspectRatio="none">${bars}</svg>`;
}

// ── Scan check/receipt ──
document.getElementById('scanBtn').addEventListener('click', () => {
  document.getElementById('scanInput').click();
});

document.getElementById('scanInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const btn = document.getElementById('scanBtn');
  const status = document.getElementById('scanStatus');
  btn.classList.add('loading');
  btn.textContent = 'Analyzing...';
  status.textContent = '';

  const reader = new FileReader();
  reader.onload = async (ev) => {
    const dataUrl = ev.target.result;
    const base64 = dataUrl.split(',')[1];
    const mediaType = file.type || 'image/jpeg';

    try {
      const res = await apiFetch('/api/analyze-check', {
        method: 'POST',
        body: JSON.stringify({ image: base64, mediaType }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTxType(data.type || 'expense');
      if (data.amount) document.getElementById('txAmount').value = data.amount;
      if (data.category) document.getElementById('txCategory').value = data.category;
      if (data.description) document.getElementById('txDesc').value = data.description;

      status.textContent = '✓ Filled from photo';
      status.style.color = 'var(--accent-dark)';
    } catch (err) {
      status.textContent = err.message || 'Could not read photo';
      status.style.color = 'var(--red)';
    }

    btn.classList.remove('loading');
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Scan check or receipt`;
    e.target.value = '';
  };
  reader.readAsDataURL(file);
});

// ── Recurring transactions ──
let recType = 'income';

document.getElementById('recTypeIncome').addEventListener('click', () => setRecType('income'));
document.getElementById('recTypeExpense').addEventListener('click', () => setRecType('expense'));

function setRecType(type) {
  recType = type;
  document.querySelectorAll('#tab-transactions .recurring-form .tx-type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`#tab-transactions .recurring-form .tx-type-btn[data-type="${type}"]`).classList.add('active');
}

document.getElementById('recSubmitBtn').addEventListener('click', async () => {
  const amount = document.getElementById('recAmount').value;
  const category = document.getElementById('recCategory').value;
  const description = document.getElementById('recDesc').value;
  const frequency = document.getElementById('recFrequency').value;
  const startDate = document.getElementById('recStartDate').value;
  if (!amount || !category || !frequency) return;

  await apiFetch('/api/recurring', {
    method: 'POST',
    body: JSON.stringify({ type: recType, amount, category, description, frequency, startDate }),
  });

  document.getElementById('recAmount').value = '';
  document.getElementById('recCategory').value = '';
  document.getElementById('recDesc').value = '';
  document.getElementById('recFrequency').value = '';
  document.getElementById('recStartDate').value = '';
  loadRecurring();
});

async function loadRecurring() {
  const res = await apiFetch('/api/recurring');
  const { recurring, due } = await res.json();

  const banner = document.getElementById('dueBanner');
  const bannerText = document.getElementById('dueBannerText');
  if (due.length) {
    banner.style.display = '';
    bannerText.textContent = `${due.length} recurring item${due.length !== 1 ? 's' : ''} due — log them now?`;
  } else {
    banner.style.display = 'none';
  }

  const list = document.getElementById('recurringList');
  if (!recurring.length) {
    list.innerHTML = '<div class="empty-state">No recurring items yet.</div>';
    return;
  }

  const FREQ_LABEL = { weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly', yearly: 'Yearly' };
  list.innerHTML = recurring.map(r => {
    const emoji = CATEGORY_EMOJI[r.category] || '📦';
    const d = new Date(r.nextDate + 'T00:00:00');
    const nextLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `<div class="rec-item">
      <div class="rec-icon">${emoji}</div>
      <div class="rec-info">
        <div class="rec-name">${r.description || r.category}</div>
        <div class="rec-meta">${FREQ_LABEL[r.frequency] || r.frequency} · next ${nextLabel}</div>
      </div>
      <div class="rec-right">
        <div class="rec-amt ${r.type}">${r.type === 'income' ? '+' : '-'}${fmt(r.amount)}</div>
        <button class="rec-delete" data-id="${r.id}">×</button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.rec-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      await apiFetch(`/api/recurring/${btn.dataset.id}`, { method: 'DELETE' });
      loadRecurring();
    });
  });
}

document.getElementById('dueBannerBtn').addEventListener('click', async () => {
  await apiFetch('/api/recurring/log', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  loadRecurring();
  loadTransactions();
});

// ── Savings ──
async function loadSavings() {
  const [ovRes, trendsRes] = await Promise.all([
    apiFetch(`/api/overview?month=${monthStr()}`),
    apiFetch('/api/trends'),
  ]);
  const ov = await ovRes.json();
  const trends = await trendsRes.json();

  const rate = ov.income > 0 ? ov.net / ov.income : 0;
  const ratePct = Math.round(rate * 100);

  const amtEl = document.getElementById('savingsAmt');
  const amtLabelEl = document.getElementById('savingsAmtLabel');
  if (ov.net >= 0) {
    amtEl.textContent = fmt(ov.net);
    amtEl.className = 'savings-amt positive';
    amtLabelEl.textContent = 'saved this month';
  } else {
    amtEl.textContent = fmt(Math.abs(ov.net));
    amtEl.className = 'savings-amt negative';
    amtLabelEl.textContent = 'deficit this month';
  }

  const ratePctEl = document.getElementById('savingsRatePct');
  if (ov.income > 0) {
    ratePctEl.textContent = ratePct + '%';
    ratePctEl.className = 'savings-rate-pct ' + (ratePct >= 20 ? 'on-target' : ratePct < 0 ? 'negative' : '');
  } else {
    ratePctEl.textContent = '—';
    ratePctEl.className = 'savings-rate-pct';
  }

  const fillPct = Math.min(Math.max((ratePct / 30) * 100, 0), 100);
  const fillEl = document.getElementById('savingsRateFill');
  fillEl.style.width = fillPct + '%';
  fillEl.className = 'savings-bar-fill ' + (ratePct >= 20 ? 'on-target' : '');

  const nets = trends.map(m => m.income - m.expenses);
  const avgNet = nets.length > 0 ? nets.reduce((s, n) => s + n, 0) / nets.length : 0;
  const projected = avgNet * 12;

  document.getElementById('savingsAvg').textContent = avgNet > 0 ? fmtShort(avgNet) : '—';
  document.getElementById('savingsProjected').textContent = projected > 0 ? fmtShort(projected) : '—';

  let streak = 0;
  for (let i = nets.length - 1; i >= 0; i--) {
    if (nets[i] > 0) streak++;
    else break;
  }
  const streakEl = document.getElementById('savingsStreak');
  if (streak >= 2) {
    streakEl.textContent = `${streak} mo streak`;
    streakEl.style.display = '';
  } else {
    streakEl.style.display = 'none';
  }
}

// ── Feature 1: Emergency Fund ──
async function loadEmergency() {
  const res = await apiFetch('/api/emergency');
  const d = await res.json();
  const el = document.getElementById('emergencyContent');

  if (!d.hasBal) {
    el.innerHTML = `<div class="empty-state" style="padding:10px 0;text-align:left;color:var(--sub)">Set your balance in Cash Flow Forecast to see runway.</div>`;
    return;
  }

  const color = d.months >= 3 ? 'var(--accent-dark)' : d.months >= 1 ? 'var(--yellow)' : 'var(--red)';
  const pct = Math.min((d.months / 6) * 100, 100);

  el.innerHTML = `
    <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px">
      <span style="font-size:32px;font-weight:800;letter-spacing:-1.5px;color:${color}">${d.months}</span>
      <span style="font-size:14px;color:var(--sub)">months runway</span>
    </div>
    <div class="progress-bar" style="margin-bottom:6px">
      <div class="progress-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
    </div>
    <div style="font-size:12px;color:var(--muted)">Toward 6-month goal · Based on ${fmt(d.avgMonthlyExpenses)} avg monthly expenses</div>
  `;
}

// ── Feature 3: Financial Freedom ──
async function loadFreedom() {
  const res = await apiFetch('/api/freedom');
  const d = await res.json();

  const setArea = document.getElementById('freedomSetArea');
  const result = document.getElementById('freedomResult');
  const changeBtn = document.getElementById('freedomChangeBtn');

  if (!d.hasTarget) {
    setArea.style.display = '';
    result.style.display = 'none';
    changeBtn.style.display = 'none';
    return;
  }

  setArea.style.display = 'none';
  result.style.display = '';
  changeBtn.style.display = '';

  document.getElementById('freedomFiNum').textContent = fmt(d.fiNumber);

  const pct = d.fiNumber > 0 ? Math.min((d.netWorth / d.fiNumber) * 100, 100) : 0;
  document.getElementById('freedomProgressFill').style.width = pct.toFixed(1) + '%';
  document.getElementById('freedomNetWorthLabel').textContent = `Net worth: ${d.netWorth >= 0 ? '' : '-'}${fmt(Math.abs(d.netWorth))}`;
  document.getElementById('freedomPctLabel').textContent = pct.toFixed(0) + '%';

  if (d.yearsToFI !== null && d.freedomDate) {
    const yearsText = d.yearsToFI === 0 ? 'You\'re there!' : `Free in ~${d.yearsToFI} years`;
    document.getElementById('freedomEta').textContent = `${yearsText} · Est. ${d.freedomDate}`;
  } else if (d.annualSavings <= 0) {
    document.getElementById('freedomEta').textContent = 'Increase your savings rate to calculate a date.';
  } else {
    document.getElementById('freedomEta').textContent = '';
  }
}

bind('freedomSaveBtn', 'click', async () => {
  const val = document.getElementById('freedomTargetInput').value;
  if (!val) return;
  await apiFetch('/api/freedom/target', {
    method: 'POST',
    body: JSON.stringify({ targetAnnualSpend: val }),
  });
  document.getElementById('freedomTargetInput').value = '';
  loadFreedom();
});

bind('freedomChangeBtn', 'click', () => {
  document.getElementById('freedomSetArea').style.display = '';
  document.getElementById('freedomResult').style.display = 'none';
  document.getElementById('freedomChangeBtn').style.display = 'none';
});

// ── Feature 6: Weekly Digest (card removed from Home; handler null-safe) ──
let digestLoaded = false;
bind('digestBtn', 'click', async () => {
  const area = document.getElementById('digestArea');
  const content = document.getElementById('digestContent');
  const btn = document.getElementById('digestBtn');

  if (area.style.display !== 'none' && digestLoaded) {
    area.style.display = 'none';
    btn.textContent = 'Weekly digest';
    return;
  }

  area.style.display = '';
  content.innerHTML = '<span class="insight-loading" style="width:90%;display:block;margin-bottom:5px"></span><span class="insight-loading" style="width:70%;display:block"></span>';
  btn.textContent = 'Loading...';
  btn.disabled = true;

  try {
    const res = await apiFetch('/api/digest', {
      method: 'POST',
      body: JSON.stringify({ month: monthStr() }),
    });
    const data = await res.json();
    content.textContent = data.digest || 'Add transactions to get a digest.';
    digestLoaded = true;
    btn.textContent = 'Refresh';
  } catch {
    content.textContent = 'Could not load digest.';
    btn.textContent = 'Retry';
  }
  btn.disabled = false;
});

// ── Feature 4: Credit Scores ──
async function loadCreditScores() {
  const res = await apiFetch('/api/creditscore');
  const scores = await res.json();

  const latestEl = document.getElementById('creditLatest');
  const listEl = document.getElementById('creditList');

  if (!scores.length) {
    latestEl.style.display = 'none';
    listEl.innerHTML = '<div class="empty-state">No scores logged yet.</div>';
    return;
  }

  const latest = scores[0];
  const { color, label } = creditScoreInfo(latest.score);
  latestEl.style.display = '';
  latestEl.innerHTML = `
    <div style="text-align:center;padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)">
      <div style="font-size:48px;font-weight:800;letter-spacing:-2px;color:${color}">${latest.score}</div>
      <div style="font-size:13px;font-weight:700;color:${color};margin-top:2px">${label}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px">${fmtDate(latest.date + 'T00:00:00')}</div>
    </div>
  `;

  listEl.innerHTML = scores.map(s => {
    const info = creditScoreInfo(s.score);
    return `<div class="nw-item" style="margin-bottom:6px">
      <div style="width:10px;height:10px;border-radius:50%;background:${info.color};flex-shrink:0"></div>
      <div class="nw-item-info">
        <div class="nw-item-name" style="color:${info.color}">${s.score} — ${info.label}</div>
        <div class="nw-item-type">${fmtDate(s.date + 'T00:00:00')}</div>
      </div>
      <button class="nw-delete" data-id="${s.id}">×</button>
    </div>`;
  }).join('');

  listEl.querySelectorAll('.nw-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      await apiFetch(`/api/creditscore/${btn.dataset.id}`, { method: 'DELETE' });
      loadCreditScores();
    });
  });
}

function creditScoreInfo(score) {
  if (score >= 800) return { color: '#16a34a', label: 'Exceptional' };
  if (score >= 750) return { color: APPLE.green, label: 'Very Good' };
  if (score >= 670) return { color: '#f59e0b', label: 'Good' };
  if (score >= 580) return { color: '#f97316', label: 'Fair' };
  return { color: '#ef4444', label: 'Poor' };
}

document.getElementById('creditAddBtn').addEventListener('click', async () => {
  const score = document.getElementById('creditScoreInput').value;
  const date = document.getElementById('creditDateInput').value;
  if (!score) return;
  await apiFetch('/api/creditscore', {
    method: 'POST',
    body: JSON.stringify({ score, date }),
  });
  document.getElementById('creditScoreInput').value = '';
  document.getElementById('creditDateInput').value = '';
  loadCreditScores();
});

// ── Feature 5: Tax Estimator ──
function initTaxYears() {
  const sel = document.getElementById('taxYearSelect');
  const yr = now.getFullYear();
  sel.innerHTML = '';
  for (let y = yr; y >= yr - 3; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    sel.appendChild(opt);
  }
}

async function loadTaxEstimator() {
  initTaxYears();
}

document.getElementById('taxCalcBtn').addEventListener('click', async () => {
  const year = document.getElementById('taxYearSelect').value;
  const res = await apiFetch(`/api/tax?year=${year}`);
  const d = await res.json();
  const el = document.getElementById('taxResults');
  el.style.display = '';

  el.innerHTML = `
    <div class="tax-card">
      <div class="tax-row">
        <span class="tax-label">W2 Income (Salary)</span>
        <span class="tax-val">${fmt(d.w2Income)}</span>
      </div>
      <div class="tax-row">
        <span class="tax-label">Self-Employment (Freelance/Business)</span>
        <span class="tax-val">${fmt(d.selfIncome)}</span>
      </div>
      <div class="tax-row">
        <span class="tax-label">Total Income</span>
        <span class="tax-val tax-bold">${fmt(d.totalIncome)}</span>
      </div>
      <div class="tax-row tax-row--deduct">
        <span class="tax-label">Standard Deduction</span>
        <span class="tax-val">-${fmt(d.standardDeduction)}</span>
      </div>
      <div class="tax-row">
        <span class="tax-label">Taxable Income</span>
        <span class="tax-val tax-bold">${fmt(d.taxableIncome)}</span>
      </div>
      <div class="tax-divider"></div>
      <div class="tax-row">
        <span class="tax-label">Federal Tax</span>
        <span class="tax-val">${fmt(d.federalTax)}</span>
      </div>
      ${d.seTax > 0 ? `<div class="tax-row">
        <span class="tax-label">Self-Employment Tax</span>
        <span class="tax-val">${fmt(d.seTax)}</span>
      </div>` : ''}
      <div class="tax-row tax-row--total">
        <span class="tax-label">Total Estimated Tax</span>
        <span class="tax-val tax-total">${fmt(d.totalTax)}</span>
      </div>
      <div class="tax-row">
        <span class="tax-label">Quarterly Payment</span>
        <span class="tax-val">${fmt(d.quarterlyPayment)}</span>
      </div>
      <div class="tax-row">
        <span class="tax-label">Effective Rate</span>
        <span class="tax-val">${d.effectiveRate}%</span>
      </div>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:8px">Estimate only. Based on 2026 standard deduction and approximate brackets. Consult a tax professional.</div>
  `;
});

// ── Feature 7: Savings Challenges ──
async function loadChallenges() {
  const [challengeRes, roundupRes, nospendRes] = await Promise.all([
    apiFetch('/api/challenges'),
    apiFetch('/api/challenges/roundup'),
    apiFetch('/api/challenges/nospend'),
  ]);
  const challenges = await challengeRes.json();
  const { roundupTotal } = await roundupRes.json();
  const { streak } = await nospendRes.json();

  const weeks52 = challenges.weeks52 || {};

  // 52-week grid
  let totalSaved = 0;
  for (let w = 1; w <= 52; w++) {
    if (weeks52[String(w)]) totalSaved += w;
  }
  const maxTotal = 1378; // 1+2+...+52

  document.getElementById('challenge52Saved').textContent = `${fmt(totalSaved)} saved`;
  document.getElementById('challenge52Fill').style.width = ((totalSaved / maxTotal) * 100).toFixed(1) + '%';

  const grid = document.getElementById('challenge52Grid');
  grid.innerHTML = '';
  for (let w = 1; w <= 52; w++) {
    const done = !!weeks52[String(w)];
    const box = document.createElement('div');
    box.className = 'challenge-week-box' + (done ? ' done' : '');
    box.title = `Week ${w}: $${w}`;
    box.dataset.week = w;
    box.textContent = w;
    box.addEventListener('click', async () => {
      await apiFetch('/api/challenges/52week', {
        method: 'POST',
        body: JSON.stringify({ week: w, completed: !done }),
      });
      loadChallenges();
    });
    grid.appendChild(box);
  }

  // No-spend streak
  document.getElementById('nospendCount').textContent = streak + ' days';

  // Round-up
  document.getElementById('roundupAmt').textContent = '$' + roundupTotal.toFixed(2);
}

// ── Feature 8: Milestones ──
async function loadMilestones() {
  const res = await apiFetch('/api/milestones');
  const badges = await res.json();
  const strip = document.getElementById('milestonesStrip');
  const inner = document.getElementById('milestonesInner');

  if (!badges.length) {
    strip.style.display = 'none';
    return;
  }

  strip.style.display = '';
  inner.innerHTML = badges.map(b => `
    <div class="milestone-chip" title="${b.description}">
      <span class="milestone-emoji">${b.emoji}</span>
      <span class="milestone-label">${b.label}</span>
    </div>
  `).join('');
}

// ── Feature 9: Shared Expenses ──
let sharedPaidBy = 'me';
document.getElementById('sharedPaidMe').addEventListener('click', () => {
  sharedPaidBy = 'me';
  document.getElementById('sharedPaidMe').classList.add('active');
  document.getElementById('sharedPaidThem').classList.remove('active');
});
document.getElementById('sharedPaidThem').addEventListener('click', () => {
  sharedPaidBy = 'them';
  document.getElementById('sharedPaidThem').classList.add('active');
  document.getElementById('sharedPaidMe').classList.remove('active');
});

document.getElementById('sharedAddBtn').addEventListener('click', async () => {
  const person = document.getElementById('sharedPerson').value.trim();
  const amount = document.getElementById('sharedAmount').value;
  const description = document.getElementById('sharedDesc').value.trim();
  const date = document.getElementById('sharedDate').value;
  if (!person || !amount) return;

  await apiFetch('/api/shared', {
    method: 'POST',
    body: JSON.stringify({ person, amount, description, date, paidBy: sharedPaidBy }),
  });

  document.getElementById('sharedPerson').value = '';
  document.getElementById('sharedAmount').value = '';
  document.getElementById('sharedDesc').value = '';
  document.getElementById('sharedDate').value = '';
  loadShared();
});

document.getElementById('sharedShowSettled').addEventListener('change', loadShared);

const PERSON_COLORS = [APPLE.blue, APPLE.indigo, APPLE.purple, APPLE.pink, APPLE.orange, APPLE.teal, APPLE.green, APPLE.gray];
function personColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PERSON_COLORS[Math.abs(hash) % PERSON_COLORS.length];
}

async function loadShared() {
  const res = await apiFetch('/api/shared');
  const items = await res.json();
  const showSettled = document.getElementById('sharedShowSettled').checked;

  // Summary
  let owedToMe = 0, youOwe = 0;
  items.filter(i => !i.settled).forEach(i => {
    // If I paid → they owe me half (but we track full amount for now)
    if (i.paidBy === 'me') owedToMe += i.amount / 2;
    else youOwe += i.amount / 2;
  });

  const summaryEl = document.getElementById('sharedSummary');
  if (items.length > 0) {
    summaryEl.style.display = '';
    document.getElementById('sharedOwedToMe').textContent = fmt(owedToMe);
    document.getElementById('sharedYouOwe').textContent = fmt(youOwe);
  } else {
    summaryEl.style.display = 'none';
  }

  const listEl = document.getElementById('sharedList');
  const filtered = showSettled ? items : items.filter(i => !i.settled);

  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state">${items.length > 0 ? 'No unsettled expenses. Check "Show settled" to see all.' : 'No shared expenses yet.'}</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(i => {
    const color = personColor(i.person);
    const initial = i.person.charAt(0).toUpperCase();
    const paidLabel = i.paidBy === 'me' ? 'You paid' : `${i.person} paid`;
    return `<div class="shared-item ${i.settled ? 'settled' : ''}">
      <div class="shared-avatar" style="background:${color}">${initial}</div>
      <div class="shared-info">
        <div class="shared-person">${i.person}</div>
        <div class="shared-desc">${i.description || '—'}</div>
        <div class="shared-meta">${paidLabel} · ${fmtDate(i.date + 'T00:00:00')}</div>
      </div>
      <div class="shared-right">
        <div class="shared-amt">${fmt(i.amount)}</div>
        <div class="shared-actions">
          <button class="sub-action-btn" data-action="settle" data-id="${i.id}">${i.settled ? 'Unsettle' : 'Settle'}</button>
          <button class="sub-action-btn" data-action="delete" data-id="${i.id}">Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');

  listEl.querySelectorAll('.sub-action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { action, id } = btn.dataset;
      if (action === 'settle') {
        await apiFetch(`/api/shared/${id}/settle`, { method: 'POST' });
      } else if (action === 'delete') {
        await apiFetch(`/api/shared/${id}`, { method: 'DELETE' });
      }
      loadShared();
    });
  });
}

// ── Account balances ──
async function loadAccounts() {
  const res = await apiFetch('/api/accounts');
  const data = await res.json();
  const fmt = v => v !== null ? '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  document.getElementById('checkingDisplay').textContent = fmt(data.checkingBalance);
  document.getElementById('savingsDisplay').textContent = fmt(data.savingsBalance);
  const total = (data.checkingBalance ?? 0) + (data.savingsBalance ?? 0);
  document.getElementById('accountsTotalDisplay').textContent =
    (data.checkingBalance !== null || data.savingsBalance !== null) ? '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  if (data.checkingBalance !== null) document.getElementById('checkingInput').value = data.checkingBalance;
  if (data.savingsBalance !== null) document.getElementById('savingsInput').value = data.savingsBalance;
}

bind('accountsSaveBtn', 'click', async () => {
  const checking = document.getElementById('checkingInput').value;
  const savings = document.getElementById('savingsInput').value;
  await apiFetch('/api/accounts', {
    method: 'POST',
    body: JSON.stringify({ checkingBalance: checking, savingsBalance: savings }),
  });
  loadAccounts();
  loadHomeHero();
});

// Home now shows only greeting, balance, safe-to-spend, stat row, and
// recent activity. The remaining analytics modules were removed; the
// account-balance editor lives in Settings.
loadOverview = async function () {
  loadGreeting();
  loadHomeHero();
  loadRecentTxs();
};

// ── Auth handlers ──
document.getElementById('showRegister').addEventListener('click', () => {
  document.getElementById('authLogin').style.display = 'none';
  document.getElementById('authRegister').style.display = '';
});
document.getElementById('showLogin').addEventListener('click', () => {
  document.getElementById('authRegister').style.display = 'none';
  document.getElementById('authLogin').style.display = '';
});

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('clarity_token', authToken);
    showApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = '';
  }
});

document.getElementById('registerBtn').addEventListener('click', async () => {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const errEl = document.getElementById('regError');
  errEl.style.display = 'none';
  if (!name || !email || !password) { errEl.textContent = 'All fields required'; errEl.style.display = ''; return; }
  try {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('clarity_token', authToken);
    showApp(true);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = '';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('clarity_token');
  authToken = null;
  currentUser = null;
  document.getElementById('authLogin').style.display = '';
  document.getElementById('authRegister').style.display = 'none';
  closeMoreScreen();
  showAuth();
});

// ── Settings screen ──
function openSettingsScreen() {
  if (!currentUser) return;
  document.getElementById('profileName').value = currentUser.name || '';
  document.getElementById('profileIncomeGoal').value = currentUser.monthlyIncomeGoal || '';
  document.getElementById('profileSavingsRate').value = currentUser.targetSavingsRate || 20;
  document.getElementById('profileBigAvatar').textContent = userInitial();
  document.getElementById('settingsProfileName').textContent = currentUser.name || '';
  document.getElementById('settingsProfileEmail').textContent = currentUser.email || '';
  loadAccounts();
  // Client-only preference toggles.
  const alerts = localStorage.getItem('clarity_pref_alerts') !== '0';
  const biometric = localStorage.getItem('clarity_pref_biometric') === '1';
  document.getElementById('toggleAlerts').classList.toggle('on', alerts);
  document.getElementById('toggleBiometric').classList.toggle('on', biometric);
  loadPlaidSettings();
}

// Render the linked-accounts (Plaid) section in Settings.
async function loadPlaidSettings() {
  const section = document.getElementById('plaidSettingsSection');
  let status;
  try {
    const res = await apiFetch('/api/plaid/status');
    status = await res.json();
  } catch { status = { enabled: false }; }

  if (!status.enabled) { section.style.display = 'none'; return; }
  section.style.display = '';

  const body = document.getElementById('plaidStatusBody');
  const actions = document.getElementById('plaidActionRow');

  if (!status.linked) {
    body.innerHTML = `<div class="tile-sub" style="font-size:13px;color:var(--text-55)">No bank linked yet.</div>`;
    actions.innerHTML = `<button class="primary-btn" id="plaidLinkBtn" style="margin-top:12px">Connect a bank account</button>`;
    document.getElementById('plaidLinkBtn').addEventListener('click', () => linkFromSettings());
    return;
  }

  const acctRows = (status.accounts || []).map(a =>
    `<div class="settings-row" style="padding:8px 0">
      <div class="settings-label" style="font-weight:400">${a.name}${a.mask ? ' ····' + a.mask : ''}</div>
      <div class="settings-detail">${fmt(a.balance || 0)}</div>
    </div>`).join('');
  const last = status.lastSync ? new Date(status.lastSync).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
  body.innerHTML = `
    <div style="font-size:14px;font-weight:500;color:var(--text);margin-bottom:2px">${status.institution || 'Linked bank'}</div>
    <div class="tile-sub" style="font-size:12px;color:var(--text-45);margin-bottom:8px">Last synced ${last}</div>
    ${acctRows}`;
  actions.innerHTML = `
    <div style="display:flex;gap:10px;margin-top:12px">
      <button class="primary-btn" id="plaidSyncBtn" style="flex:1">Sync now</button>
      <button class="primary-btn" id="plaidUnlinkBtn" style="flex:1;border-color:var(--neutral-700);color:var(--text-70)">Unlink</button>
    </div>`;
  document.getElementById('plaidSyncBtn').addEventListener('click', async () => {
    const b = document.getElementById('plaidSyncBtn');
    b.disabled = true; b.textContent = 'Syncing...';
    await apiFetch('/api/plaid/sync', { method: 'POST' });
    await loadPlaidSettings();
    loadOverview();
  });
  document.getElementById('plaidUnlinkBtn').addEventListener('click', async () => {
    await apiFetch('/api/plaid/unlink', { method: 'POST' });
    await loadPlaidSettings();
    loadOverview();
  });
}

// Launch Plaid Link from the Settings screen (re-link after onboarding skip).
async function linkFromSettings() {
  const btn = document.getElementById('plaidLinkBtn');
  btn.disabled = true; btn.textContent = 'Opening Plaid...';
  try {
    const res = await apiFetch('/api/plaid/create_link_token', { method: 'POST' });
    const { link_token } = await res.json();
    if (!link_token || typeof Plaid === 'undefined') throw new Error('no link');
    Plaid.create({
      token: link_token,
      onSuccess: async (public_token, metadata) => {
        await apiFetch('/api/plaid/exchange_public_token', {
          method: 'POST',
          body: JSON.stringify({ public_token, institution: metadata.institution ? metadata.institution.name : null }),
        });
        await loadPlaidSettings();
        loadOverview();
      },
      onExit: () => { btn.disabled = false; btn.textContent = 'Connect a bank account'; },
    }).open();
  } catch {
    btn.disabled = false; btn.textContent = 'Connect a bank account';
  }
}

document.querySelectorAll('.pill-toggle[data-pref]').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('on');
    const on = btn.classList.contains('on');
    localStorage.setItem('clarity_pref_' + btn.dataset.pref, on ? '1' : '0');
  });
});

document.getElementById('saveProfileBtn').addEventListener('click', async () => {
  const name = document.getElementById('profileName').value.trim();
  const monthlyIncomeGoal = parseFloat(document.getElementById('profileIncomeGoal').value) || 0;
  const targetSavingsRate = parseFloat(document.getElementById('profileSavingsRate').value) || 20;

  const btn = document.getElementById('saveProfileBtn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const res = await apiFetch('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ name, monthlyIncomeGoal, targetSavingsRate }),
  });
  const updated = await res.json();
  currentUser = { ...currentUser, ...updated };
  btn.disabled = false; btn.textContent = 'Save profile';
  document.getElementById('settingsProfileName').textContent = name;
  document.getElementById('greetingName').textContent = (name || '').split(' ')[0];
  document.getElementById('greetingAvatar').textContent = userInitial();
  document.getElementById('profileBigAvatar').textContent = userInitial();
});

// ══════════════════════════════════════════════
// Onboarding (intro slides + Plaid-style bank connect)
// ══════════════════════════════════════════════
const BANKS = [
  'Chase','Bank of America','Wells Fargo','Citibank','Capital One','U.S. Bank',
  'PNC Bank','Truist','TD Bank','Fifth Third Bank','Ally Bank','Chime',
  'American Express','Discover Bank','Charles Schwab Bank','USAA',
  'Navy Federal Credit Union','SoFi','Regions Bank','KeyBank','Huntington Bank',
  'Citizens Bank','M&T Bank','BMO Bank','Santander Bank','VyStar Credit Union',
];
let obStep = 0;
let obSelectedBanks = [];

function renderBankList() {
  const query = document.getElementById('obBankSearch').value.trim().toLowerCase();
  const pool = query ? BANKS.filter(b => b.toLowerCase().includes(query)) : BANKS;
  const listEl = document.getElementById('obBankList');
  if (!pool.length) {
    listEl.innerHTML = '<div class="ob-bank-empty">No bank matched. Try a different name.</div>';
    return;
  }
  listEl.innerHTML = pool.map(name => {
    const selected = obSelectedBanks.includes(name);
    return `<div class="ob-bank-row ${selected ? 'selected' : ''}" data-bank="${name}">
      <div class="ob-bank-logo">${name.charAt(0)}</div>
      <div class="ob-bank-name">${name}</div>
      <div class="ob-bank-check"></div>
    </div>`;
  }).join('');
  listEl.querySelectorAll('.ob-bank-row').forEach(row => {
    row.addEventListener('click', () => {
      const b = row.dataset.bank;
      if (obSelectedBanks.includes(b)) obSelectedBanks = obSelectedBanks.filter(x => x !== b);
      else obSelectedBanks.push(b);
      row.classList.toggle('selected');
      document.getElementById('obContinueBtn').disabled = obSelectedBanks.length === 0;
    });
  });
}

async function showObStep(step) {
  obStep = step;
  document.querySelectorAll('.ob-slide').forEach(s => s.classList.remove('active'));
  document.getElementById('obConnect').classList.remove('active');
  if (step < 3) {
    document.getElementById('obSlide' + step).classList.add('active');
  } else {
    document.getElementById('obConnect').classList.add('active');
    await setupConnectStep();
  }
}

// Decide between real Plaid Link and the mock bank list based on server config.
async function setupConnectStep() {
  const real = document.getElementById('obPlaidReal');
  const mock = document.getElementById('obMockConnect');
  let enabled = false;
  try {
    const res = await apiFetch('/api/plaid/status');
    enabled = (await res.json()).enabled;
  } catch {}
  if (enabled && typeof Plaid !== 'undefined') {
    real.style.display = 'flex';
    mock.style.display = 'none';
  } else {
    real.style.display = 'none';
    mock.style.display = 'flex';
    renderBankList();
  }
}

// Launch the real Plaid Link flow, then exchange + sync and enter the app.
async function launchPlaidLink() {
  const btn = document.getElementById('obPlaidBtn');
  btn.disabled = true; btn.textContent = 'Opening Plaid...';
  try {
    const res = await apiFetch('/api/plaid/create_link_token', { method: 'POST' });
    const { link_token, error } = await res.json();
    if (!link_token) throw new Error(error || 'no link token');
    const handler = Plaid.create({
      token: link_token,
      onSuccess: async (public_token, metadata) => {
        btn.textContent = 'Linking accounts...';
        await apiFetch('/api/plaid/exchange_public_token', {
          method: 'POST',
          body: JSON.stringify({
            public_token,
            institution: metadata.institution ? metadata.institution.name : null,
          }),
        });
        finishOnboarding();
      },
      onExit: () => {
        btn.disabled = false; btn.textContent = 'Connect a bank account';
      },
    });
    handler.open();
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Connect a bank account';
    alert('Could not start Plaid. Please try again.');
  }
}

function startOnboarding() {
  obStep = 0;
  obSelectedBanks = [];
  document.getElementById('obBankSearch').value = '';
  document.getElementById('obContinueBtn').disabled = true;
  showObStep(0);
  document.getElementById('onboardingOverlay').classList.add('open');
}

function finishOnboarding() {
  document.getElementById('onboardingOverlay').classList.remove('open');
  localStorage.setItem('clarity_onboarded', '1');
  enterApp();
}

document.querySelectorAll('.ob-next-btn').forEach(btn => {
  btn.addEventListener('click', () => showObStep(obStep + 1));
});
['obSkip', 'obSkip1', 'obSkip2'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', () => showObStep(3));
});
document.getElementById('obBankSearch').addEventListener('input', renderBankList);
document.getElementById('obContinueBtn').addEventListener('click', () => {
  if (obSelectedBanks.length > 0) finishOnboarding();
});
document.getElementById('obPlaidBtn').addEventListener('click', launchPlaidLink);
document.getElementById('obPlaidSkip').addEventListener('click', finishOnboarding);

// ── Init ──
async function initApp() {
  if (!authToken) {
    showAuth();
    return;
  }
  try {
    const res = await fetch('/auth/me', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (!res.ok) throw new Error('invalid');
    currentUser = await res.json();
    showApp();
  } catch {
    localStorage.removeItem('clarity_token');
    authToken = null;
    showAuth();
  }
}

function showAuth() {
  document.getElementById('authOverlay').style.display = 'flex';
}

function userInitial() {
  return (currentUser?.name || '?').charAt(0).toUpperCase();
}

// Enter the main app UI (post-auth, post-onboarding).
function enterApp() {
  document.getElementById('authOverlay').style.display = 'none';
  updateMonthNav();
  updateCalMonthLabel();
  switchTab('overview');
}

function showApp(isNew = false) {
  document.getElementById('authOverlay').style.display = 'none';
  if (isNew && localStorage.getItem('clarity_onboarded') !== '1') {
    startOnboarding();
  } else {
    enterApp();
  }
}

initApp();
