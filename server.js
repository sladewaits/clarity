require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const DATA_FILE = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'data.json')
  : path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(__dirname));

function load() {
  const defaults = {
    transactions: [], budgets: [], goals: [], messages: [],
    paydaySchedule: null, recurring: [], subscriptions: [],
    assets: [], liabilities: [], currentBalance: null,
    creditScores: [], challenges: {}, shared: [], milestones: [],
    freedomTarget: null,
  };
  if (!fs.existsSync(DATA_FILE)) return defaults;
  try {
    const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      ...defaults, ...d,
      recurring: d.recurring || [],
      subscriptions: d.subscriptions || [],
      assets: d.assets || [],
      liabilities: d.liabilities || [],
      currentBalance: d.currentBalance ?? null,
      creditScores: d.creditScores || [],
      challenges: d.challenges || {},
      shared: d.shared || [],
      milestones: d.milestones || [],
      freedomTarget: d.freedomTarget ?? null,
    };
  } catch { return defaults; }
}

// Advance a recurring item's nextDate by its frequency
function advanceNextDate(rec) {
  const d = new Date(rec.nextDate + 'T00:00:00');
  if (rec.frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (rec.frequency === 'biweekly') d.setDate(d.getDate() + 14);
  else if (rec.frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (rec.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
  rec.nextDate = d.toISOString().split('T')[0];
}

// Items due on or before today
function getDueRecurring(data) {
  const today = new Date().toISOString().split('T')[0];
  return data.recurring.filter(r => r.nextDate <= today);
}

// Returns day-of-month numbers that are paydays for a given year/month
function getPaydaysForMonth(schedule, year, month) {
  if (!schedule || !schedule.type) return [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = new Set();

  if (schedule.type === 'monthly') {
    const d = parseInt(schedule.monthlyDay) || 1;
    if (d <= daysInMonth) days.add(d);
  } else if (schedule.type === 'semimonthly') {
    const [d1, d2] = (schedule.semimonthlyDays || [1, 15]).map(Number);
    if (d1 <= daysInMonth) days.add(d1);
    if (d2 <= daysInMonth) days.add(d2);
  } else if (schedule.type === 'biweekly') {
    if (!schedule.startDate) return [];
    const start = new Date(schedule.startDate + 'T00:00:00');
    const first = new Date(year, month, 1);
    const last = new Date(year, month, daysInMonth);
    let cur = new Date(start);
    while (cur < first) cur.setDate(cur.getDate() + 14);
    while (cur <= last) {
      days.add(cur.getDate());
      cur.setDate(cur.getDate() + 14);
    }
    cur = new Date(start);
    while (cur > first) cur.setDate(cur.getDate() - 14);
    while (cur <= last) {
      if (cur >= first) days.add(cur.getDate());
      cur.setDate(cur.getDate() + 14);
    }
  } else if (schedule.type === 'weekly') {
    if (!schedule.startDate) return [];
    const start = new Date(schedule.startDate + 'T00:00:00');
    const dow = start.getDay();
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month, d).getDay() === dow) days.add(d);
    }
  } else if (schedule.type === 'custom') {
    (schedule.customDates || []).forEach(ds => {
      const d = new Date(ds + 'T00:00:00');
      if (d.getMonth() === month && d.getFullYear() === year) days.add(d.getDate());
    });
  }

  return [...days].sort((a, b) => a - b);
}

function getNextPayday(schedule) {
  if (!schedule || !schedule.type) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i <= 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const paydays = getPaydaysForMonth(schedule, d.getFullYear(), d.getMonth());
    if (paydays.includes(d.getDate())) {
      return {
        date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
        daysUntil: i,
      };
    }
  }
  return null;
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/^[-•]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseMonth(str) {
  if (str) {
    const [y, m] = str.split('-').map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function filterByMonth(txs, year, month) {
  return txs.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

function buildSystem(data, monthStr) {
  const { year, month } = parseMonth(monthStr);
  const monthLabel = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const thisMonth = filterByMonth(data.transactions, year, month);
  const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expenses;
  const savingsRate = income > 0 ? ((net / income) * 100).toFixed(0) : 0;

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const lastMonth = filterByMonth(data.transactions, prevYear, prevMonth);
  const lastExpenses = lastMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const byCategory = {};
  thisMonth.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });

  const budgetSummary = data.budgets.map(b => {
    const spent = byCategory[b.category] || 0;
    const pct = b.limit > 0 ? ((spent / b.limit) * 100).toFixed(0) : 0;
    return `${b.category}: $${spent.toFixed(2)} of $${b.limit.toFixed(2)} (${pct}%)`;
  }).join('\n');

  const goalSummary = data.goals.map(g => {
    const pct = g.target > 0 ? ((g.current / g.target) * 100).toFixed(0) : 0;
    return `${g.name}: $${g.current.toFixed(2)} of $${g.target.toFixed(2)} (${pct}%)`;
  }).join('\n');

  const topCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
    .join(', ');

  return `Your name is Clarity. You're Slade's personal finance assistant — direct, sharp, and focused on helping him actually understand and improve his money situation.

Slade's financial data for ${monthLabel}:
- Income: $${income.toFixed(2)}
- Expenses: $${expenses.toFixed(2)}
- Net: ${net >= 0 ? '+' : ''}$${net.toFixed(2)}
- Savings rate: ${savingsRate}%
- vs last month expenses: $${lastExpenses.toFixed(2)}
${topCategories ? '- Top spending: ' + topCategories : ''}
${budgetSummary ? '\nBudget status:\n' + budgetSummary : ''}
${goalSummary ? '\nSavings goals:\n' + goalSummary : ''}

Be conversational, not financial-advisor-formal. Don't lecture. Give concrete, actionable takes. If something looks off, say so directly. If he's doing well, acknowledge it. Keep responses short — 3-4 sentences max unless walking through something complex.

Format: plain text only. No markdown. No pound-sign headers, no asterisk bold, no bullet dashes. Write in short paragraphs. Real words, direct sentences.`;
}

// Transactions
app.get('/api/transactions', (req, res) => {
  const data = load();
  let txs = data.transactions.slice().reverse();
  if (req.query.month) {
    const { year, month } = parseMonth(req.query.month);
    txs = txs.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }
  res.json(txs);
});

app.post('/api/transactions', (req, res) => {
  const { type, amount, category, description, recurring } = req.body;
  if (!type || !amount || !category) return res.status(400).json({ error: 'Missing fields' });
  const data = load();
  const tx = {
    id: Date.now().toString(),
    type,
    amount: parseFloat(amount),
    category,
    description: description || '',
    recurring: !!recurring,
    date: new Date().toISOString(),
  };
  data.transactions.push(tx);
  save(data);
  res.json(tx);
});

app.delete('/api/transactions/:id', (req, res) => {
  const data = load();
  data.transactions = data.transactions.filter(t => t.id !== req.params.id);
  save(data);
  res.json({ ok: true });
});

// Budgets
app.get('/api/budgets', (req, res) => {
  res.json(load().budgets);
});

app.post('/api/budgets', (req, res) => {
  const { category, limit } = req.body;
  if (!category || !limit) return res.status(400).json({ error: 'Missing fields' });
  const data = load();
  const existing = data.budgets.findIndex(b => b.category === category);
  if (existing >= 0) {
    data.budgets[existing].limit = parseFloat(limit);
  } else {
    data.budgets.push({ category, limit: parseFloat(limit) });
  }
  save(data);
  res.json({ ok: true });
});

app.delete('/api/budgets/:category', (req, res) => {
  const data = load();
  data.budgets = data.budgets.filter(b => b.category !== decodeURIComponent(req.params.category));
  save(data);
  res.json({ ok: true });
});

// Goals
app.get('/api/goals', (req, res) => {
  res.json(load().goals);
});

app.post('/api/goals', (req, res) => {
  const { name, target } = req.body;
  if (!name || !target) return res.status(400).json({ error: 'Missing fields' });
  const data = load();
  const goal = { id: Date.now().toString(), name, target: parseFloat(target), current: 0, deposits: [] };
  data.goals.push(goal);
  save(data);
  res.json(goal);
});

app.post('/api/goals/:id/deposit', (req, res) => {
  const { amount } = req.body;
  if (!amount) return res.status(400).json({ error: 'Missing amount' });
  const data = load();
  const goal = data.goals.find(g => g.id === req.params.id);
  if (!goal) return res.status(404).json({ error: 'Not found' });
  const deposit = parseFloat(amount);
  goal.current = Math.min(goal.current + deposit, goal.target);
  if (!goal.deposits) goal.deposits = [];
  goal.deposits.push({ amount: deposit, date: new Date().toISOString() });
  save(data);
  res.json(goal);
});

app.delete('/api/goals/:id', (req, res) => {
  const data = load();
  data.goals = data.goals.filter(g => g.id !== req.params.id);
  save(data);
  res.json({ ok: true });
});

// Months with data
app.get('/api/months', (req, res) => {
  const data = load();
  const months = new Set();
  data.transactions.forEach(t => {
    const d = new Date(t.date);
    months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  });
  const now = new Date();
  months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  res.json([...months].sort().reverse());
});

// Overview stats
app.get('/api/overview', (req, res) => {
  const data = load();
  const { year, month } = parseMonth(req.query.month);

  const thisMonth = filterByMonth(data.transactions, year, month);
  const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const lastMonth = filterByMonth(data.transactions, prevYear, prevMonth);
  const lastIncome = lastMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const lastExpenses = lastMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const byCategory = {};
  thisMonth.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });

  const budgetStatus = data.budgets.map(b => ({
    category: b.category,
    limit: b.limit,
    spent: byCategory[b.category] || 0,
  }));

  res.json({
    income, expenses, net: income - expenses,
    lastIncome, lastExpenses,
    budgetStatus, goals: data.goals,
    byCategory,
  });
});

// AI Insights
app.post('/api/insights', async (req, res) => {
  const data = load();
  const system = buildSystem(data, req.body.month);
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 180,
      system,
      messages: [{ role: 'user', content: 'Give me one sharp, direct insight about my finances right now — the most important thing I should know or act on. 2-3 sentences, no fluff.' }],
    });
    res.json({ insight: stripMarkdown(msg.content[0].text) });
  } catch {
    res.json({ insight: null });
  }
});

// CSV Export
app.get('/api/export', (req, res) => {
  const data = load();
  let txs = data.transactions;
  if (req.query.month) {
    const { year, month } = parseMonth(req.query.month);
    txs = txs.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }
  const rows = ['Date,Type,Category,Description,Amount'];
  txs.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
    const d = new Date(t.date).toLocaleDateString('en-US');
    const sign = t.type === 'expense' ? '-' : '';
    const desc = (t.description || '').replace(/"/g, '""');
    rows.push(`${d},${t.type},${t.category},"${desc}",${sign}${t.amount.toFixed(2)}`);
  });
  const label = req.query.month || 'all';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="clarity-${label}.csv"`);
  res.send(rows.join('\n'));
});

// Chat
app.post('/api/chat', async (req, res) => {
  const { message, month } = req.body;
  if (!message) return res.status(400).json({ error: 'No message' });

  const data = load();
  data.messages.push({ role: 'user', content: message });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = obj => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: buildSystem(data, month),
      messages: data.messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
    });

    let full = '', lineBuf = '';
    function flushLine(line) {
      const clean = line
        .replace(/^#{1,6}\s+/, '')
        .replace(/^[-*_]{3,}\s*$/, '')
        .replace(/^[-•]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/\*\*([^*]*)\*\*/g, '$1')
        .replace(/\*([^*]*)\*/g, '$1');
      if (clean !== '') send({ type: 'chunk', text: clean });
    }

    stream.on('text', chunk => {
      full += chunk; lineBuf += chunk;
      const lines = lineBuf.split('\n');
      lineBuf = lines.pop();
      for (const line of lines) { flushLine(line); send({ type: 'chunk', text: '\n' }); }
    });

    await stream.finalMessage();
    if (lineBuf) flushLine(lineBuf);

    const cleanFull = stripMarkdown(full);
    data.messages.push({ role: 'assistant', content: cleanFull });
    save(data);
    send({ type: 'done' });
    res.end();
  } catch (err) {
    console.error(err);
    send({ type: 'error', text: 'Something went wrong. Try again.' });
    res.end();
  }
});

// ── Recurring transactions ──
app.get('/api/recurring', (req, res) => {
  const data = load();
  res.json({ recurring: data.recurring, due: getDueRecurring(data) });
});

app.post('/api/recurring', (req, res) => {
  const { type, amount, category, description, frequency, startDate } = req.body;
  if (!type || !amount || !category || !frequency) return res.status(400).json({ error: 'Missing fields' });
  const data = load();
  const item = {
    id: Date.now().toString(),
    type, amount: parseFloat(amount), category,
    description: description || '', frequency,
    nextDate: startDate || new Date().toISOString().split('T')[0],
  };
  data.recurring.push(item);
  save(data);
  res.json(item);
});

app.delete('/api/recurring/:id', (req, res) => {
  const data = load();
  data.recurring = data.recurring.filter(r => r.id !== req.params.id);
  save(data);
  res.json({ ok: true });
});

// Log all due recurring items as real transactions
app.post('/api/recurring/log', (req, res) => {
  const { ids } = req.body;
  const data = load();
  const today = new Date().toISOString().split('T')[0];
  const toLog = ids
    ? data.recurring.filter(r => ids.includes(r.id))
    : getDueRecurring(data);

  const logged = [];
  toLog.forEach(rec => {
    const tx = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      type: rec.type, amount: rec.amount, category: rec.category,
      description: rec.description, recurring: true,
      date: new Date().toISOString(),
    };
    data.transactions.push(tx);
    logged.push(tx);
    advanceNextDate(rec);
  });
  save(data);
  res.json({ logged, due: getDueRecurring(data) });
});

// ── Monthly trends (last 6 months) ──
app.get('/api/trends', (req, res) => {
  const data = load();
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const label = d.toLocaleString('default', { month: 'short' });
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const txs = data.transactions.filter(t => {
      const td = new Date(t.date);
      return td.getFullYear() === year && td.getMonth() === month;
    });
    months.push({
      key, label,
      income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expenses: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    });
  }
  res.json(months);
});

// ── Upcoming bills (recurring expenses in next 14 days) ──
app.get('/api/upcoming', (req, res) => {
  const data = load();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + 14);
  const upcoming = data.recurring
    .filter(r => r.type === 'expense')
    .map(r => ({ ...r, nextDate: r.nextDate }))
    .filter(r => {
      const d = new Date(r.nextDate + 'T00:00:00');
      return d >= today && d <= cutoff;
    })
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  res.json(upcoming);
});

// ── Budget alerts ──
app.get('/api/alerts', (req, res) => {
  const data = load();
  const now = new Date();
  const txs = data.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const byCategory = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  const alerts = [];
  data.budgets.forEach(b => {
    const spent = byCategory[b.category] || 0;
    const pct = spent / b.limit;
    if (pct >= 1) alerts.push({ level: 'over', category: b.category, spent, limit: b.limit, pct });
    else if (pct >= 0.8) alerts.push({ level: 'warn', category: b.category, spent, limit: b.limit, pct });
  });
  res.json(alerts);
});

// ── Analyze check/receipt photo ──
app.post('/api/analyze-check', async (req, res) => {
  const { image, mediaType } = req.body;
  if (!image) return res.status(400).json({ error: 'No image' });
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
          { type: 'text', text: 'Extract info from this check or receipt. Reply with ONLY valid JSON (no markdown, no explanation): {"amount": number, "description": string, "category": string, "type": "income" or "expense"}. For category use one of: Salary, Freelance, Business, Investment, Housing, Food, Transport, Entertainment, Shopping, Health, Subscriptions, Other income, Other expense.' },
        ],
      }],
    });
    const raw = msg.content[0].text.trim();
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not read the image. Try a clearer photo.' });
  }
});

// ── Subscriptions ──
app.get('/api/subscriptions', (req, res) => {
  const data = load();
  const subs = data.subscriptions;
  const monthlyTotal = subs
    .filter(s => s.active !== false)
    .reduce((sum, s) => sum + (s.cycle === 'yearly' ? s.amount / 12 : s.amount), 0);
  res.json({ subscriptions: subs, monthlyTotal });
});

app.post('/api/subscriptions', (req, res) => {
  const { name, amount, cycle, nextBilling, category } = req.body;
  if (!name || !amount) return res.status(400).json({ error: 'Missing fields' });
  const data = load();
  const sub = {
    id: Date.now().toString(),
    name, amount: parseFloat(amount),
    cycle: cycle || 'monthly',
    nextBilling: nextBilling || new Date().toISOString().split('T')[0],
    category: category || 'Subscriptions',
    active: true,
  };
  data.subscriptions.push(sub);
  save(data);
  res.json(sub);
});

app.delete('/api/subscriptions/:id', (req, res) => {
  const data = load();
  data.subscriptions = data.subscriptions.filter(s => s.id !== req.params.id);
  save(data);
  res.json({ ok: true });
});

app.post('/api/subscriptions/:id/cancel', (req, res) => {
  const data = load();
  const sub = data.subscriptions.find(s => s.id === req.params.id);
  if (sub) sub.active = false;
  save(data);
  res.json({ ok: true });
});

// ── Net worth ──
app.get('/api/networth', (req, res) => {
  const data = load();
  const totalAssets = data.assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = data.liabilities.reduce((s, l) => s + l.balance, 0);
  res.json({ assets: data.assets, liabilities: data.liabilities, totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities });
});

app.post('/api/assets', (req, res) => {
  const { name, type, value } = req.body;
  if (!name || !value) return res.status(400).json({ error: 'Missing fields' });
  const data = load();
  const asset = { id: Date.now().toString(), name, type: type || 'liquid', value: parseFloat(value) };
  data.assets.push(asset);
  save(data);
  res.json(asset);
});

app.delete('/api/assets/:id', (req, res) => {
  const data = load();
  data.assets = data.assets.filter(a => a.id !== req.params.id);
  save(data);
  res.json({ ok: true });
});

app.post('/api/liabilities', (req, res) => {
  const { name, balance, interestRate, minPayment } = req.body;
  if (!name || !balance) return res.status(400).json({ error: 'Missing fields' });
  const data = load();
  const liability = { id: Date.now().toString(), name, balance: parseFloat(balance), interestRate: parseFloat(interestRate) || 0, minPayment: parseFloat(minPayment) || 0 };
  data.liabilities.push(liability);
  save(data);
  res.json(liability);
});

app.delete('/api/liabilities/:id', (req, res) => {
  const data = load();
  data.liabilities = data.liabilities.filter(l => l.id !== req.params.id);
  save(data);
  res.json({ ok: true });
});

// ── Financial health score ──
app.get('/api/score', (req, res) => {
  const data = load();
  const now = new Date();
  const thisMonth = data.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expenses;

  let savingsScore = 0;
  if (income > 0) {
    const rate = net / income;
    if (rate >= 0.2) savingsScore = 25;
    else if (rate >= 0.1) savingsScore = 17;
    else if (rate >= 0) savingsScore = 8;
  }

  let budgetScore = 10;
  if (data.budgets.length > 0) {
    const byCategory = {};
    thisMonth.filter(t => t.type === 'expense').forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });
    const overCount = data.budgets.filter(b => (byCategory[b.category] || 0) > b.limit).length;
    const ratio = 1 - overCount / data.budgets.length;
    budgetScore = Math.round(ratio * 25);
  }

  const subTotal = data.subscriptions.filter(s => s.active !== false).reduce((s, sub) => s + (sub.cycle === 'yearly' ? sub.amount / 12 : sub.amount), 0);
  let subScore = 15;
  if (income > 0) {
    const subPct = subTotal / income;
    if (subPct > 0.2) subScore = 0;
    else if (subPct > 0.1) subScore = 5;
    else if (subPct > 0.05) subScore = 10;
  }

  let goalScore = 5;
  if (data.goals.length > 0) {
    const avgPct = data.goals.reduce((s, g) => s + Math.min(g.current / g.target, 1), 0) / data.goals.length;
    if (avgPct >= 0.5) goalScore = 15;
    else if (avgPct >= 0.25) goalScore = 10;
    else goalScore = 5;
  }

  const txCount = thisMonth.length;
  let activityScore = 0;
  if (txCount >= 10) activityScore = 20;
  else if (txCount >= 5) activityScore = 15;
  else if (txCount >= 1) activityScore = 10;

  const total = savingsScore + budgetScore + subScore + goalScore + activityScore;
  let grade = 'F';
  if (total >= 90) grade = 'A';
  else if (total >= 80) grade = 'B';
  else if (total >= 70) grade = 'C';
  else if (total >= 60) grade = 'D';

  res.json({
    score: total, grade,
    components: {
      savings: { score: savingsScore, max: 25, label: 'Savings rate' },
      budget: { score: budgetScore, max: 25, label: 'Budget discipline' },
      subscriptions: { score: subScore, max: 15, label: 'Subscription load' },
      goals: { score: goalScore, max: 15, label: 'Goal progress' },
      activity: { score: activityScore, max: 20, label: 'Tracking activity' },
    }
  });
});

// ── Cash flow forecast ──
app.get('/api/forecast', (req, res) => {
  const data = load();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let balance = data.currentBalance ?? 0;

  const events = [];
  for (let i = 1; i <= 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    data.recurring.forEach(r => {
      if (r.nextDate === dateStr) {
        events.push({ date: dateStr, label: r.description || r.category, amount: r.type === 'income' ? r.amount : -r.amount });
      }
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  const checkpoints = [30, 60, 90].map(days => {
    const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + days);
    const cutStr = cutoff.toISOString().split('T')[0];
    let bal = balance;
    events.filter(e => e.date <= cutStr).forEach(e => { bal += e.amount; });
    return { days, balance: bal };
  });

  res.json({ currentBalance: balance, events: events.slice(0, 20), checkpoints });
});

app.post('/api/forecast/balance', (req, res) => {
  const { balance } = req.body;
  const data = load();
  data.currentBalance = parseFloat(balance) || 0;
  save(data);
  res.json({ currentBalance: data.currentBalance });
});

// Paydays
app.get('/api/paydays', (req, res) => {
  const data = load();
  const schedule = data.paydaySchedule;
  const { year, month } = parseMonth(req.query.month);
  const days = getPaydaysForMonth(schedule, year, month);
  const next = getNextPayday(schedule);
  res.json({ schedule, days, next });
});

app.post('/api/paydays', (req, res) => {
  const { schedule } = req.body;
  const data = load();
  data.paydaySchedule = schedule;
  save(data);
  const { year, month } = parseMonth(req.query.month);
  const days = getPaydaysForMonth(schedule, year, month);
  const next = getNextPayday(schedule);
  res.json({ schedule, days, next });
});

app.post('/api/paydays/toggle', (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'Missing date' });
  const data = load();
  if (!data.paydaySchedule) data.paydaySchedule = { type: 'custom', customDates: [] };
  if (!data.paydaySchedule.customDates) data.paydaySchedule.customDates = [];
  const idx = data.paydaySchedule.customDates.indexOf(date);
  if (idx >= 0) data.paydaySchedule.customDates.splice(idx, 1);
  else data.paydaySchedule.customDates.push(date);
  save(data);
  const d = new Date(date + 'T00:00:00');
  const days = getPaydaysForMonth(data.paydaySchedule, d.getFullYear(), d.getMonth());
  const next = getNextPayday(data.paydaySchedule);
  res.json({ schedule: data.paydaySchedule, days, next });
});

// ── Feature 1: Emergency Fund Tracker ──
app.get('/api/emergency', (req, res) => {
  const data = load();
  const now = new Date();
  // Get last 3 full months of expenses
  let totalExpenses = 0;
  let monthsWithData = 0;
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const txs = filterByMonth(data.transactions, d.getFullYear(), d.getMonth());
    const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    totalExpenses += exp;
    monthsWithData++;
  }
  const avgMonthlyExpenses = monthsWithData > 0 ? totalExpenses / monthsWithData : 0;
  const currentBalance = data.currentBalance || 0;
  const months = avgMonthlyExpenses > 0 ? parseFloat((currentBalance / avgMonthlyExpenses).toFixed(1)) : 0;
  const hasBal = data.currentBalance !== null && data.currentBalance > 0;

  res.json({
    currentBalance,
    avgMonthlyExpenses,
    months,
    target3: avgMonthlyExpenses * 3,
    target6: avgMonthlyExpenses * 6,
    hasBal,
  });
});

// ── Feature 2: Spending Anomaly Alerts ──
app.get('/api/anomalies', (req, res) => {
  const data = load();
  const now = new Date();
  // Current month spend by category
  const curTxs = filterByMonth(data.transactions, now.getFullYear(), now.getMonth());
  const curByCategory = {};
  curTxs.filter(t => t.type === 'expense').forEach(t => {
    curByCategory[t.category] = (curByCategory[t.category] || 0) + t.amount;
  });

  // Last 3 full months avg by category
  const histByCategory = {};
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const txs = filterByMonth(data.transactions, d.getFullYear(), d.getMonth());
    txs.filter(t => t.type === 'expense').forEach(t => {
      if (!histByCategory[t.category]) histByCategory[t.category] = [];
      histByCategory[t.category].push(t.amount);
    });
  }

  // Compute averages
  const avgByCategory = {};
  for (const [cat, amounts] of Object.entries(histByCategory)) {
    // Sum amounts across the 3 months (not just the array items)
    // We need monthly totals, so re-aggregate
    avgByCategory[cat] = 0;
  }
  // Redo: collect monthly totals per category
  const histMonthlyTotals = {};
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const txs = filterByMonth(data.transactions, d.getFullYear(), d.getMonth());
    const monthCats = {};
    txs.filter(t => t.type === 'expense').forEach(t => {
      monthCats[t.category] = (monthCats[t.category] || 0) + t.amount;
    });
    for (const [cat, amt] of Object.entries(monthCats)) {
      if (!histMonthlyTotals[cat]) histMonthlyTotals[cat] = [];
      histMonthlyTotals[cat].push(amt);
    }
  }

  const anomalies = [];
  for (const [cat, currentSpend] of Object.entries(curByCategory)) {
    if (currentSpend <= 50) continue;
    const monthlyTotals = histMonthlyTotals[cat] || [];
    if (!monthlyTotals.length) continue;
    const avgSpend = monthlyTotals.reduce((s, v) => s + v, 0) / 3; // divide by 3, not months with data
    if (currentSpend > avgSpend * 1.5) {
      const pctAbove = Math.round(((currentSpend - avgSpend) / avgSpend) * 100);
      anomalies.push({ category: cat, currentSpend, avgSpend, pctAbove });
    }
  }

  anomalies.sort((a, b) => b.pctAbove - a.pctAbove);
  res.json(anomalies);
});

// ── Feature 3: Financial Freedom Date ──
app.get('/api/freedom', (req, res) => {
  const data = load();
  const now = new Date();

  // Net worth
  const totalAssets = data.assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = data.liabilities.reduce((s, l) => s + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Annual savings from last 6 months
  let totalNet = 0;
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const txs = filterByMonth(data.transactions, d.getFullYear(), d.getMonth());
    const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    totalNet += (inc - exp);
  }
  const avgMonthlyNet = totalNet / 6;
  const annualSavings = avgMonthlyNet * 12;

  const targetAnnualSpend = data.freedomTarget;
  const hasTarget = targetAnnualSpend != null;
  const fiNumber = hasTarget ? targetAnnualSpend * 25 : null;

  let yearsToFI = null;
  let freedomDate = null;
  if (hasTarget && fiNumber !== null && annualSavings > 0) {
    yearsToFI = (fiNumber - netWorth) / annualSavings;
    if (yearsToFI < 0) yearsToFI = 0;
    const fd = new Date(now.getFullYear(), now.getMonth(), 1);
    fd.setFullYear(fd.getFullYear() + Math.floor(yearsToFI));
    const fracMonths = (yearsToFI % 1) * 12;
    fd.setMonth(fd.getMonth() + Math.round(fracMonths));
    freedomDate = fd.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  res.json({
    netWorth, annualSavings, targetAnnualSpend,
    fiNumber, yearsToFI: yearsToFI !== null ? parseFloat(yearsToFI.toFixed(1)) : null,
    freedomDate, hasTarget,
  });
});

app.post('/api/freedom/target', (req, res) => {
  const { targetAnnualSpend } = req.body;
  const data = load();
  data.freedomTarget = parseFloat(targetAnnualSpend) || null;
  save(data);
  res.json({ ok: true, freedomTarget: data.freedomTarget });
});

// ── Feature 4: Credit Score Log ──
app.get('/api/creditscore', (req, res) => {
  const data = load();
  const scores = [...data.creditScores].sort((a, b) => b.date.localeCompare(a.date));
  res.json(scores);
});

app.post('/api/creditscore', (req, res) => {
  const { score, date } = req.body;
  if (!score) return res.status(400).json({ error: 'Missing score' });
  const data = load();
  const entry = {
    id: Date.now().toString(),
    score: parseInt(score),
    date: date || new Date().toISOString().split('T')[0],
  };
  data.creditScores.push(entry);
  save(data);
  res.json(entry);
});

app.delete('/api/creditscore/:id', (req, res) => {
  const data = load();
  data.creditScores = data.creditScores.filter(c => c.id !== req.params.id);
  save(data);
  res.json({ ok: true });
});

// ── Feature 5: Tax Estimator ──
app.get('/api/tax', (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const data = load();

  const yearTxs = data.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && t.type === 'income';
  });

  const w2Income = yearTxs.filter(t => t.category === 'Salary').reduce((s, t) => s + t.amount, 0);
  const selfIncome = yearTxs.filter(t => ['Freelance', 'Business'].includes(t.category)).reduce((s, t) => s + t.amount, 0);
  const totalIncome = w2Income + selfIncome;

  const standardDeduction = 15000;
  const taxableIncome = Math.max(0, totalIncome - standardDeduction);

  // Federal brackets 2026 (approximate)
  const brackets = [
    { limit: 11925, rate: 0.10 },
    { limit: 48475, rate: 0.12 },
    { limit: 103350, rate: 0.22 },
    { limit: 197300, rate: 0.24 },
    { limit: 250525, rate: 0.32 },
    { limit: 626350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ];

  let federalTax = 0;
  let remaining = taxableIncome;
  let prevLimit = 0;
  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.limit - prevLimit);
    federalTax += taxable * bracket.rate;
    remaining -= taxable;
    prevLimit = bracket.limit;
  }

  const seTax = selfIncome > 0 ? selfIncome * 0.9235 * 0.153 : 0;
  const totalTax = federalTax + seTax;
  const quarterlyPayment = totalTax / 4;
  const effectiveRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;

  res.json({
    year, totalIncome, w2Income, selfIncome,
    standardDeduction, taxableIncome,
    federalTax: parseFloat(federalTax.toFixed(2)),
    seTax: parseFloat(seTax.toFixed(2)),
    totalTax: parseFloat(totalTax.toFixed(2)),
    quarterlyPayment: parseFloat(quarterlyPayment.toFixed(2)),
    effectiveRate: parseFloat(effectiveRate.toFixed(1)),
  });
});

// ── Feature 6: Weekly Digest ──
app.post('/api/digest', async (req, res) => {
  const { month } = req.body;
  const data = load();
  const { year, mo } = (() => {
    const { year, month: m } = parseMonth(month);
    return { year, mo: m };
  })();
  const monthLabel = new Date(year, mo, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const txs = filterByMonth(data.transactions, year, mo);
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expenses;
  const savingsRate = income > 0 ? ((net / income) * 100).toFixed(0) : 0;

  const byCategory = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  const top3 = Object.entries(byCategory).sort(([, a], [, b]) => b - a).slice(0, 3).map(([cat, amt]) => `${cat}: $${amt.toFixed(0)}`).join(', ');

  const now = new Date();
  const budgetAlerts = data.budgets.filter(b => (byCategory[b.category] || 0) >= b.limit * 0.8).map(b => b.category).join(', ');

  const prompt = `Here's my financial snapshot for ${monthLabel}:
- Income: $${income.toFixed(0)}
- Expenses: $${expenses.toFixed(0)}
- Net: ${net >= 0 ? '+' : ''}$${net.toFixed(0)}
- Savings rate: ${savingsRate}%
- Top spending: ${top3 || 'none'}
${budgetAlerts ? '- Budget alerts: ' + budgetAlerts : ''}

Write a friendly, direct 3-4 sentence financial digest for the week. Be encouraging but honest. No markdown, plain text only.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    res.json({ digest: stripMarkdown(msg.content[0].text) });
  } catch (err) {
    console.error(err);
    res.json({ digest: null });
  }
});

// ── Feature 7: Savings Challenges ──
app.get('/api/challenges', (req, res) => {
  const data = load();
  res.json(data.challenges || {});
});

app.post('/api/challenges/52week', (req, res) => {
  const { week, completed } = req.body;
  if (!week || week < 1 || week > 52) return res.status(400).json({ error: 'Invalid week' });
  const data = load();
  if (!data.challenges) data.challenges = {};
  if (!data.challenges.weeks52) data.challenges.weeks52 = {};
  data.challenges.weeks52[String(week)] = !!completed;
  save(data);
  res.json({ ok: true, weeks52: data.challenges.weeks52 });
});

app.get('/api/challenges/roundup', (req, res) => {
  const data = load();
  let roundupTotal = 0;
  data.transactions.filter(t => t.type === 'expense').forEach(t => {
    const ceil = Math.ceil(t.amount);
    roundupTotal += ceil - t.amount;
  });
  res.json({ roundupTotal: parseFloat(roundupTotal.toFixed(2)) });
});

app.get('/api/challenges/nospend', (req, res) => {
  const data = load();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const hasExpense = data.transactions.some(t => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.date);
      return d.toISOString().split('T')[0] === dateStr;
    });
    if (hasExpense) break;
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
    if (streak > 365) break;
  }

  res.json({ streak });
});

// ── Feature 8: Milestones & Badges ──
app.get('/api/milestones', (req, res) => {
  const data = load();
  const now = new Date();
  const badges = [];

  const BADGE_DEFS = [
    { id: 'first_tx', label: 'First transaction', emoji: '🎉', description: 'Logged your first transaction' },
    { id: 'first_budget', label: 'Budget setter', emoji: '📊', description: 'Set your first budget' },
    { id: 'saver_1k', label: 'Saver', emoji: '💰', description: 'Saved over $1,000 in a single month' },
    { id: 'saver_rate_20', label: '20% Club', emoji: '🏆', description: 'Hit a 20% savings rate in a month' },
    { id: 'streak_3', label: '3-Month Streak', emoji: '🔥', description: '3+ consecutive months with positive net savings' },
    { id: 'emergency_3mo', label: 'Emergency Ready', emoji: '🛡️', description: '3+ months of expenses in emergency fund' },
    { id: 'goal_complete', label: 'Goal Crusher', emoji: '🎯', description: 'Completed a savings goal' },
    { id: 'sub_tracker', label: 'Sub Tracker', emoji: '📱', description: 'Tracking at least one subscription' },
    { id: 'debt_free', label: 'Debt Free', emoji: '✨', description: 'No liabilities — completely debt free' },
  ];

  // first_tx
  if (data.transactions.length > 0) badges.push('first_tx');

  // first_budget
  if (data.budgets.length > 0) badges.push('first_budget');

  // saver_1k and saver_rate_20 — check all months
  const monthsSet = new Set();
  data.transactions.forEach(t => {
    const d = new Date(t.date);
    monthsSet.add(`${d.getFullYear()}-${d.getMonth()}`);
  });
  let hasSaver1k = false, hasSaverRate20 = false;
  monthsSet.forEach(key => {
    const [y, m] = key.split('-').map(Number);
    const txs = filterByMonth(data.transactions, y, m);
    const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net = inc - exp;
    if (net > 1000) hasSaver1k = true;
    if (inc > 0 && (net / inc) > 0.2) hasSaverRate20 = true;
  });
  if (hasSaver1k) badges.push('saver_1k');
  if (hasSaverRate20) badges.push('saver_rate_20');

  // streak_3 — last 6 months
  let consecutivePositive = 0;
  let maxConsecutive = 0;
  let cur = 0;
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const txs = filterByMonth(data.transactions, d.getFullYear(), d.getMonth());
    const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    if (inc - exp > 0) { cur++; maxConsecutive = Math.max(maxConsecutive, cur); }
    else cur = 0;
  }
  if (maxConsecutive >= 3) badges.push('streak_3');

  // emergency_3mo
  let totalExp3 = 0;
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const txs = filterByMonth(data.transactions, d.getFullYear(), d.getMonth());
    totalExp3 += txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  }
  const avgExp = totalExp3 / 3;
  const cb = data.currentBalance || 0;
  if (avgExp > 0 && cb / avgExp >= 3) badges.push('emergency_3mo');

  // goal_complete
  if (data.goals.some(g => g.current >= g.target)) badges.push('goal_complete');

  // sub_tracker
  if (data.subscriptions.length > 0) badges.push('sub_tracker');

  // debt_free
  if (data.liabilities.length === 0) badges.push('debt_free');

  const earned = badges.map(id => BADGE_DEFS.find(b => b.id === id)).filter(Boolean);
  res.json(earned);
});

// ── Feature 9: Shared Expenses ──
app.get('/api/shared', (req, res) => {
  const data = load();
  const sorted = [...data.shared].sort((a, b) => b.date.localeCompare(a.date));
  res.json(sorted);
});

app.post('/api/shared', (req, res) => {
  const { person, amount, description, date, paidBy } = req.body;
  if (!person || !amount) return res.status(400).json({ error: 'Missing fields' });
  const data = load();
  const entry = {
    id: Date.now().toString(),
    person,
    amount: parseFloat(amount),
    description: description || '',
    date: date || new Date().toISOString().split('T')[0],
    paidBy: paidBy || 'me',
    settled: false,
  };
  data.shared.push(entry);
  save(data);
  res.json(entry);
});

app.post('/api/shared/:id/settle', (req, res) => {
  const data = load();
  const entry = data.shared.find(s => s.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  entry.settled = !entry.settled;
  save(data);
  res.json(entry);
});

app.delete('/api/shared/:id', (req, res) => {
  const data = load();
  data.shared = data.shared.filter(s => s.id !== req.params.id);
  save(data);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Clarity running on http://localhost:${PORT}`));
