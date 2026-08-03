require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const JWT_SECRET = process.env.JWT_SECRET || 'clarity-secret-change-in-prod';

app.use(express.json());
app.use(express.static(__dirname));

// ── Storage layer ──
const USE_DB = !!process.env.DATABASE_URL;
let pool;

if (USE_DB) {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

const USERS_FILE = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'users.json')
  : path.join(__dirname, 'users.json');

function userDataFile(userId) {
  const base = process.env.DATA_DIR || __dirname;
  const dir = path.join(base, 'users', userId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'data.json');
}

function mkDefaults() {
  return {
    transactions: [], budgets: [], goals: [], messages: [],
    paydaySchedule: null, recurring: [], subscriptions: [],
    assets: [], liabilities: [], currentBalance: null,
    checkingBalance: null, savingsBalance: null,
    creditScores: [], challenges: {}, shared: [], milestones: [],
    freedomTarget: null,
  };
}

function mergeDefaults(d) {
  return {
    ...mkDefaults(), ...d,
    recurring: d.recurring || [],
    subscriptions: d.subscriptions || [],
    assets: d.assets || [],
    liabilities: d.liabilities || [],
    currentBalance: d.currentBalance ?? null,
    checkingBalance: d.checkingBalance ?? null,
    savingsBalance: d.savingsBalance ?? null,
    creditScores: d.creditScores || [],
    challenges: d.challenges || {},
    shared: d.shared || [],
    milestones: d.milestones || [],
    freedomTarget: d.freedomTarget ?? null,
  };
}

async function initDB() {
  if (!USE_DB) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT DEFAULT '😊',
      target_savings_rate NUMERIC DEFAULT 20,
      monthly_income_goal NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS user_data (
      user_id TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'
    );
  `);
}

async function load(userId) {
  if (USE_DB) {
    try {
      const result = await pool.query('SELECT data FROM user_data WHERE user_id = $1', [userId]);
      if (!result.rows.length) return mkDefaults();
      return mergeDefaults(result.rows[0].data);
    } catch { return mkDefaults(); }
  }
  const DATA_FILE = userDataFile(userId);
  if (!fs.existsSync(DATA_FILE)) return mkDefaults();
  try { return mergeDefaults(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); }
  catch { return mkDefaults(); }
}

async function save(data, userId) {
  if (USE_DB) {
    await pool.query(
      'INSERT INTO user_data (user_id, data) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET data = $2',
      [userId, JSON.stringify(data)]
    );
  } else {
    fs.writeFileSync(userDataFile(userId), JSON.stringify(data, null, 2));
  }
}

function rowToUser(r) {
  return {
    id: r.id, email: r.email, name: r.name,
    passwordHash: r.password_hash, avatar: r.avatar,
    targetSavingsRate: parseFloat(r.target_savings_rate),
    monthlyIncomeGoal: parseFloat(r.monthly_income_goal),
    createdAt: r.created_at,
  };
}

function loadUsersFile() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return []; }
}

function saveUsersFile(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

async function getUserByEmail(email) {
  if (USE_DB) {
    const r = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return r.rows.length ? rowToUser(r.rows[0]) : null;
  }
  return loadUsersFile().find(u => u.email === email) || null;
}

async function getUserById(id) {
  if (USE_DB) {
    const r = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return r.rows.length ? rowToUser(r.rows[0]) : null;
  }
  return loadUsersFile().find(u => u.id === id) || null;
}

async function createUser(user) {
  if (USE_DB) {
    await pool.query(
      'INSERT INTO users (id, email, name, password_hash, avatar, target_savings_rate, monthly_income_goal, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [user.id, user.email, user.name, user.passwordHash, user.avatar, user.targetSavingsRate, user.monthlyIncomeGoal, user.createdAt]
    );
  } else {
    const users = loadUsersFile();
    users.push(user);
    saveUsersFile(users);
  }
}

async function updateUser(userId, updates) {
  if (USE_DB) {
    const fields = [], values = [];
    let i = 1;
    if (updates.name !== undefined) { fields.push(`name = $${i++}`); values.push(updates.name); }
    if (updates.avatar !== undefined) { fields.push(`avatar = $${i++}`); values.push(updates.avatar); }
    if (updates.targetSavingsRate !== undefined) { fields.push(`target_savings_rate = $${i++}`); values.push(updates.targetSavingsRate); }
    if (updates.monthlyIncomeGoal !== undefined) { fields.push(`monthly_income_goal = $${i++}`); values.push(updates.monthlyIncomeGoal); }
    if (!fields.length) return getUserById(userId);
    values.push(userId);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);
    return getUserById(userId);
  } else {
    const users = loadUsersFile();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) return null;
    if (updates.name !== undefined) users[idx].name = updates.name;
    if (updates.avatar !== undefined) users[idx].avatar = updates.avatar;
    if (updates.targetSavingsRate !== undefined) users[idx].targetSavingsRate = parseFloat(updates.targetSavingsRate) || 20;
    if (updates.monthlyIncomeGoal !== undefined) users[idx].monthlyIncomeGoal = parseFloat(updates.monthlyIncomeGoal) || 0;
    saveUsersFile(users);
    return users[idx];
  }
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.userId = payload.userId;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function advanceNextDate(rec) {
  const d = new Date(rec.nextDate + 'T00:00:00');
  if (rec.frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (rec.frequency === 'biweekly') d.setDate(d.getDate() + 14);
  else if (rec.frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (rec.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
  rec.nextDate = d.toISOString().split('T')[0];
}

function getDueRecurring(data) {
  const today = new Date().toISOString().split('T')[0];
  return data.recurring.filter(r => r.nextDate <= today);
}

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
    while (cur <= last) { days.add(cur.getDate()); cur.setDate(cur.getDate() + 14); }
    cur = new Date(start);
    while (cur > first) cur.setDate(cur.getDate() - 14);
    while (cur <= last) { if (cur >= first) days.add(cur.getDate()); cur.setDate(cur.getDate() + 14); }
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

  return `Your name is Clarity. You are a personal finance assistant built into the Clarity app — direct, sharp, and focused on helping the user understand and improve their money situation. You know everything about this app and can walk users through any feature.

APP KNOWLEDGE — you can explain and guide users through all of these:

OVERVIEW TAB (home screen):
- Financial health score (0-100, letter grade A-F) based on savings rate, budget discipline, subscription load, goal progress, and tracking activity
- Monthly summary showing income, expenses, net, and savings rate
- Savings card: amount saved this month, savings rate vs 20% target, avg/month, estimated annual savings, streak counter
- Budget alerts: warns when spending approaches or exceeds a category limit
- Spending anomaly alerts: flags categories spiking more than 50% above your 3-month average
- Milestones & badges: earned automatically (First transaction, Saver, 20% Club, Debt Free, etc.)
- Upcoming bills: recurring expenses due in the next 14 days
- 6-month trend chart: income vs expenses bar chart with a Weekly digest button (AI summary)
- Financial freedom date: set a target annual spend, see your FI number and the year you could retire
- Cash flow forecast: 30/60/90 day balance projections based on recurring items
- Spending breakdown: horizontal bar chart by category, tap any bar to see individual transactions
- Budget status: progress bars for each budget category
- Goals progress: savings goal progress bars
- Emergency fund tracker: shows months of runway based on current balance vs average expenses

TRANSACTIONS TAB:
- Log income or expenses manually — choose type, amount, category, description
- Categories available: Income (Salary, Freelance, Business, Investment, Other income) / Expenses (Housing, Food, Transport, Entertainment, Shopping, Health, Subscriptions, Other expense)
- Scan a check or receipt photo — AI reads it and fills in the form automatically
- View transaction history grouped by date
- Recurring transactions: set up items that repeat weekly, biweekly, monthly, or yearly — they appear as due reminders

PLAN TAB (9 sections, swipe the pills to switch):
- Budgets: set monthly spending limits per category, see progress bars and remaining amounts
- Goals: create savings targets (e.g. Emergency fund, Vacation), make deposits, track progress with ETA
- Subscriptions: track recurring services (Netflix, Spotify, etc.), see monthly/annual totals, billing dates, cancel tracking
- Net Worth: add assets (savings, investments, property, vehicles) and liabilities (loans, credit cards), see your real net worth
- Debt: Avalanche vs Snowball payoff calculator — enter extra monthly payment, see which strategy saves more interest
- Credit: log your credit score over time, track the trend
- Tax: estimates federal tax and self-employment tax based on your logged income
- Challenges: 52-week savings challenge grid, no-spend streak counter, round-up savings calculator
- Shared: track split expenses with friends/family, mark as settled

CALENDAR TAB:
- Set your payday schedule: weekly, biweekly (every 2 weeks), semi-monthly (1st & 15th), monthly, or custom dates
- Calendar highlights payday dates in green
- Countdown to your next payday shown at the top

CHAT TAB (this tab — you are here):
- Ask anything about your finances or the app
- Quick-ask buttons for common questions
- AI has access to your real transaction data, budgets, goals, and more

HOW TO DO COMMON TASKS:
- Add a transaction: Transactions tab → fill in amount, category, description → Add transaction
- Set a budget: Plan tab → Budgets → pick category and monthly limit → Set budget
- Create a savings goal: Plan tab → Goals → enter name and target amount → Create goal
- Track a subscription: Plan tab → Subscriptions → use quick-add buttons or type manually
- See what you owe on debt: Plan tab → Net Worth → add liabilities, then go to Debt tab and calculate
- Set up paydays: Calendar tab → choose schedule type → Save schedule
- Export your data: Transactions tab → Export CSV button (top right)
- Update your profile: tap your avatar in the top-right corner

---

User's financial data for ${monthLabel}:
- Income: $${income.toFixed(2)}
- Expenses: $${expenses.toFixed(2)}
- Net: ${net >= 0 ? '+' : ''}$${net.toFixed(2)}
- Savings rate: ${savingsRate}%
- vs last month expenses: $${lastExpenses.toFixed(2)}
${topCategories ? '- Top spending: ' + topCategories : ''}
${budgetSummary ? '\nBudget status:\n' + budgetSummary : ''}
${goalSummary ? '\nSavings goals:\n' + goalSummary : ''}

Tone: conversational, not financial-advisor-formal. Don't lecture. Give concrete, actionable answers. If they ask how to do something in the app, give them the exact steps. If something in their data looks off, say so directly. Keep responses short — 3-4 sentences max unless walking through steps or explaining a feature.

Format: plain text only. No markdown, no asterisks, no bullet dashes, no pound-sign headers. Short paragraphs. Real words, direct sentences.`;
}

// ── Auth routes ──

app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = await getUserByEmail(email);
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now().toString(),
    email, name, passwordHash,
    avatar: '😊',
    targetSavingsRate: 20,
    monthlyIncomeGoal: 0,
    createdAt: new Date().toISOString(),
  };
  await createUser(user);

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '90d' });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, targetSavingsRate: user.targetSavingsRate, monthlyIncomeGoal: user.monthlyIncomeGoal },
  });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '90d' });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, targetSavingsRate: user.targetSavingsRate, monthlyIncomeGoal: user.monthlyIncomeGoal },
  });
});

app.get('/auth/me', requireAuth, async (req, res) => {
  const user = await getUserById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, email: user.email, name: user.name, avatar: user.avatar, targetSavingsRate: user.targetSavingsRate, monthlyIncomeGoal: user.monthlyIncomeGoal });
});

app.put('/auth/profile', requireAuth, async (req, res) => {
  const { name, avatar, targetSavingsRate, monthlyIncomeGoal } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (avatar !== undefined) updates.avatar = avatar;
  if (targetSavingsRate !== undefined) updates.targetSavingsRate = parseFloat(targetSavingsRate) || 20;
  if (monthlyIncomeGoal !== undefined) updates.monthlyIncomeGoal = parseFloat(monthlyIncomeGoal) || 0;

  const u = await updateUser(req.userId, updates);
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json({ id: u.id, email: u.email, name: u.name, avatar: u.avatar, targetSavingsRate: u.targetSavingsRate, monthlyIncomeGoal: u.monthlyIncomeGoal });
});

// Transactions
app.get('/api/transactions', requireAuth, async (req, res) => {
  const data = await load(req.userId);
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

app.post('/api/transactions', requireAuth, async (req, res) => {
  const { type, amount, category, description, recurring, date } = req.body;
  if (!type || !amount || !category) return res.status(400).json({ error: 'Missing fields' });
  const data = await load(req.userId);
  const tx = {
    id: Date.now().toString(),
    type, amount: parseFloat(amount), category,
    description: description || '',
    recurring: !!recurring,
    date: date ? new Date(date + 'T12:00:00').toISOString() : new Date().toISOString(),
  };
  data.transactions.push(tx);
  await save(data, req.userId);
  res.json(tx);
});

app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  data.transactions = data.transactions.filter(t => t.id !== req.params.id);
  await save(data, req.userId);
  res.json({ ok: true });
});

// Budgets
app.get('/api/budgets', requireAuth, async (req, res) => {
  res.json((await load(req.userId)).budgets);
});

app.post('/api/budgets', requireAuth, async (req, res) => {
  const { category, limit } = req.body;
  if (!category || !limit) return res.status(400).json({ error: 'Missing fields' });
  const data = await load(req.userId);
  const existing = data.budgets.findIndex(b => b.category === category);
  if (existing >= 0) data.budgets[existing].limit = parseFloat(limit);
  else data.budgets.push({ category, limit: parseFloat(limit) });
  await save(data, req.userId);
  res.json({ ok: true });
});

app.delete('/api/budgets/:category', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  data.budgets = data.budgets.filter(b => b.category !== decodeURIComponent(req.params.category));
  await save(data, req.userId);
  res.json({ ok: true });
});

// Goals
app.get('/api/goals', requireAuth, async (req, res) => {
  res.json((await load(req.userId)).goals);
});

app.post('/api/goals', requireAuth, async (req, res) => {
  const { name, target } = req.body;
  if (!name || !target) return res.status(400).json({ error: 'Missing fields' });
  const data = await load(req.userId);
  const goal = { id: Date.now().toString(), name, target: parseFloat(target), current: 0, deposits: [] };
  data.goals.push(goal);
  await save(data, req.userId);
  res.json(goal);
});

app.post('/api/goals/:id/deposit', requireAuth, async (req, res) => {
  const { amount } = req.body;
  if (!amount) return res.status(400).json({ error: 'Missing amount' });
  const data = await load(req.userId);
  const goal = data.goals.find(g => g.id === req.params.id);
  if (!goal) return res.status(404).json({ error: 'Not found' });
  const deposit = parseFloat(amount);
  goal.current = Math.min(goal.current + deposit, goal.target);
  if (!goal.deposits) goal.deposits = [];
  goal.deposits.push({ amount: deposit, date: new Date().toISOString() });
  await save(data, req.userId);
  res.json(goal);
});

app.delete('/api/goals/:id', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  data.goals = data.goals.filter(g => g.id !== req.params.id);
  await save(data, req.userId);
  res.json({ ok: true });
});

// Months with data
app.get('/api/months', requireAuth, async (req, res) => {
  const data = await load(req.userId);
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
app.get('/api/overview', requireAuth, async (req, res) => {
  const data = await load(req.userId);
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
    category: b.category, limit: b.limit, spent: byCategory[b.category] || 0,
  }));

  res.json({ income, expenses, net: income - expenses, lastIncome, lastExpenses, budgetStatus, goals: data.goals, byCategory });
});

// AI Insights
app.post('/api/insights', requireAuth, async (req, res) => {
  const data = await load(req.userId);
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

// CSV Export — accepts token via query param as alternative to header
app.get('/api/export', async (req, res) => {
  let userId = null;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try { const payload = jwt.verify(header.slice(7), JWT_SECRET); userId = payload.userId; } catch {}
  }
  if (!userId && req.query.token) {
    try { const payload = jwt.verify(req.query.token, JWT_SECRET); userId = payload.userId; } catch {}
  }
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const data = await load(userId);
  let txs = data.transactions;
  if (req.query.month) {
    const { year, month } = parseMonth(req.query.month);
    txs = txs.filter(t => { const d = new Date(t.date); return d.getMonth() === month && d.getFullYear() === year; });
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
app.post('/api/chat', requireAuth, async (req, res) => {
  const { message, month } = req.body;
  if (!message) return res.status(400).json({ error: 'No message' });

  const data = await load(req.userId);
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
    await save(data, req.userId);
    send({ type: 'done' });
    res.end();
  } catch (err) {
    console.error(err);
    send({ type: 'error', text: 'Something went wrong. Try again.' });
    res.end();
  }
});

// ── Recurring transactions ──
app.get('/api/recurring', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  res.json({ recurring: data.recurring, due: getDueRecurring(data) });
});

app.post('/api/recurring', requireAuth, async (req, res) => {
  const { type, amount, category, description, frequency, startDate } = req.body;
  if (!type || !amount || !category || !frequency) return res.status(400).json({ error: 'Missing fields' });
  const data = await load(req.userId);
  const item = {
    id: Date.now().toString(),
    type, amount: parseFloat(amount), category,
    description: description || '', frequency,
    nextDate: startDate || new Date().toISOString().split('T')[0],
    autopay: false,
  };
  data.recurring.push(item);
  await save(data, req.userId);
  res.json(item);
});

app.delete('/api/recurring/:id', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  data.recurring = data.recurring.filter(r => r.id !== req.params.id);
  await save(data, req.userId);
  res.json({ ok: true });
});

// Toggle a recurring bill's autopay flag (does not change the reserved amount —
// the obligation is still due either way).
app.post('/api/recurring/:id/autopay', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  const item = data.recurring.find(r => r.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  item.autopay = !item.autopay;
  await save(data, req.userId);
  res.json({ id: item.id, autopay: item.autopay });
});

app.post('/api/recurring/log', requireAuth, async (req, res) => {
  const { ids } = req.body;
  const data = await load(req.userId);
  const toLog = ids ? data.recurring.filter(r => ids.includes(r.id)) : getDueRecurring(data);

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
  await save(data, req.userId);
  res.json({ logged, due: getDueRecurring(data) });
});

// ── Monthly trends (last 6 months) ──
app.get('/api/trends', requireAuth, async (req, res) => {
  const data = await load(req.userId);
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

// ── Upcoming bills ──
app.get('/api/upcoming', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + 14);
  const upcoming = data.recurring
    .filter(r => r.type === 'expense')
    .filter(r => { const d = new Date(r.nextDate + 'T00:00:00'); return d >= today && d <= cutoff; })
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  res.json(upcoming);
});

// ── Budget alerts ──
app.get('/api/alerts', requireAuth, async (req, res) => {
  const data = await load(req.userId);
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
app.post('/api/analyze-check', requireAuth, async (req, res) => {
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
app.get('/api/subscriptions', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  const subs = data.subscriptions;
  const monthlyTotal = subs
    .filter(s => s.active !== false)
    .reduce((sum, s) => sum + (s.cycle === 'yearly' ? s.amount / 12 : s.amount), 0);
  res.json({ subscriptions: subs, monthlyTotal });
});

app.post('/api/subscriptions', requireAuth, async (req, res) => {
  const { name, amount, cycle, nextBilling, category } = req.body;
  if (!name || !amount) return res.status(400).json({ error: 'Missing fields' });
  const data = await load(req.userId);
  const sub = {
    id: Date.now().toString(), name, amount: parseFloat(amount),
    cycle: cycle || 'monthly',
    nextBilling: nextBilling || new Date().toISOString().split('T')[0],
    category: category || 'Subscriptions',
    active: true,
  };
  data.subscriptions.push(sub);
  await save(data, req.userId);
  res.json(sub);
});

app.delete('/api/subscriptions/:id', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  data.subscriptions = data.subscriptions.filter(s => s.id !== req.params.id);
  await save(data, req.userId);
  res.json({ ok: true });
});

app.post('/api/subscriptions/:id/cancel', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  const sub = data.subscriptions.find(s => s.id === req.params.id);
  if (sub) sub.active = false;
  await save(data, req.userId);
  res.json({ ok: true });
});

// ── Net worth ──
app.get('/api/networth', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  const totalAssets = data.assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = data.liabilities.reduce((s, l) => s + l.balance, 0);
  res.json({ assets: data.assets, liabilities: data.liabilities, totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities });
});

app.post('/api/assets', requireAuth, async (req, res) => {
  const { name, type, value } = req.body;
  if (!name || !value) return res.status(400).json({ error: 'Missing fields' });
  const data = await load(req.userId);
  const asset = { id: Date.now().toString(), name, type: type || 'liquid', value: parseFloat(value) };
  data.assets.push(asset);
  await save(data, req.userId);
  res.json(asset);
});

app.delete('/api/assets/:id', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  data.assets = data.assets.filter(a => a.id !== req.params.id);
  await save(data, req.userId);
  res.json({ ok: true });
});

app.post('/api/liabilities', requireAuth, async (req, res) => {
  const { name, balance, interestRate, minPayment } = req.body;
  if (!name || !balance) return res.status(400).json({ error: 'Missing fields' });
  const data = await load(req.userId);
  const liability = { id: Date.now().toString(), name, balance: parseFloat(balance), interestRate: parseFloat(interestRate) || 0, minPayment: parseFloat(minPayment) || 0 };
  data.liabilities.push(liability);
  await save(data, req.userId);
  res.json(liability);
});

app.delete('/api/liabilities/:id', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  data.liabilities = data.liabilities.filter(l => l.id !== req.params.id);
  await save(data, req.userId);
  res.json({ ok: true });
});

// ── Financial health score ──
app.get('/api/score', requireAuth, async (req, res) => {
  const data = await load(req.userId);
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
    budgetScore = Math.round((1 - overCount / data.budgets.length) * 25);
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
    ready: thisMonth.length > 0,
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
app.get('/api/forecast', requireAuth, async (req, res) => {
  const data = await load(req.userId);
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

app.post('/api/forecast/balance', requireAuth, async (req, res) => {
  const { balance } = req.body;
  const data = await load(req.userId);
  data.currentBalance = parseFloat(balance) || 0;
  await save(data, req.userId);
  res.json({ currentBalance: data.currentBalance });
});

// ── Account balances ──
app.get('/api/accounts', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  res.json({ checkingBalance: data.checkingBalance, savingsBalance: data.savingsBalance });
});

app.post('/api/accounts', requireAuth, async (req, res) => {
  const { checkingBalance, savingsBalance } = req.body;
  const data = await load(req.userId);
  if (checkingBalance !== undefined) data.checkingBalance = parseFloat(checkingBalance) || 0;
  if (savingsBalance !== undefined) data.savingsBalance = parseFloat(savingsBalance) || 0;
  await save(data, req.userId);
  res.json({ checkingBalance: data.checkingBalance, savingsBalance: data.savingsBalance });
});

// Paydays
app.get('/api/paydays', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  const schedule = data.paydaySchedule;
  const { year, month } = parseMonth(req.query.month);
  const days = getPaydaysForMonth(schedule, year, month);
  const next = getNextPayday(schedule);
  res.json({ schedule, days, next });
});

app.post('/api/paydays', requireAuth, async (req, res) => {
  const { schedule } = req.body;
  const data = await load(req.userId);
  data.paydaySchedule = schedule;
  await save(data, req.userId);
  const { year, month } = parseMonth(req.query.month);
  const days = getPaydaysForMonth(schedule, year, month);
  const next = getNextPayday(schedule);
  res.json({ schedule, days, next });
});

app.post('/api/paydays/toggle', requireAuth, async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'Missing date' });
  const data = await load(req.userId);
  if (!data.paydaySchedule) data.paydaySchedule = { type: 'custom', customDates: [] };
  if (!data.paydaySchedule.customDates) data.paydaySchedule.customDates = [];
  const idx = data.paydaySchedule.customDates.indexOf(date);
  if (idx >= 0) data.paydaySchedule.customDates.splice(idx, 1);
  else data.paydaySchedule.customDates.push(date);
  await save(data, req.userId);
  const d = new Date(date + 'T00:00:00');
  const days = getPaydaysForMonth(data.paydaySchedule, d.getFullYear(), d.getMonth());
  const next = getNextPayday(data.paydaySchedule);
  res.json({ schedule: data.paydaySchedule, days, next });
});

// ── Feature 1: Emergency Fund Tracker ──
app.get('/api/emergency', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  const now = new Date();
  let totalExpenses = 0;
  let monthsWithData = 0;
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const txs = filterByMonth(data.transactions, d.getFullYear(), d.getMonth());
    totalExpenses += txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    monthsWithData++;
  }
  const avgMonthlyExpenses = monthsWithData > 0 ? totalExpenses / monthsWithData : 0;
  const currentBalance = data.currentBalance || 0;
  const months = avgMonthlyExpenses > 0 ? parseFloat((currentBalance / avgMonthlyExpenses).toFixed(1)) : 0;
  res.json({
    currentBalance, avgMonthlyExpenses, months,
    target3: avgMonthlyExpenses * 3,
    target6: avgMonthlyExpenses * 6,
    hasBal: data.currentBalance !== null && data.currentBalance > 0,
  });
});

// ── Feature 2: Spending Anomaly Alerts ──
app.get('/api/anomalies', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  const now = new Date();
  const curTxs = filterByMonth(data.transactions, now.getFullYear(), now.getMonth());
  const curByCategory = {};
  curTxs.filter(t => t.type === 'expense').forEach(t => {
    curByCategory[t.category] = (curByCategory[t.category] || 0) + t.amount;
  });

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
    const avgSpend = monthlyTotals.reduce((s, v) => s + v, 0) / 3;
    if (currentSpend > avgSpend * 1.5) {
      const pctAbove = Math.round(((currentSpend - avgSpend) / avgSpend) * 100);
      anomalies.push({ category: cat, currentSpend, avgSpend, pctAbove });
    }
  }
  anomalies.sort((a, b) => b.pctAbove - a.pctAbove);
  res.json(anomalies);
});

// ── Feature 3: Financial Freedom Date ──
app.get('/api/freedom', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  const now = new Date();

  const totalAssets = data.assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = data.liabilities.reduce((s, l) => s + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

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

  let yearsToFI = null, freedomDate = null;
  if (hasTarget && fiNumber !== null && annualSavings > 0) {
    yearsToFI = (fiNumber - netWorth) / annualSavings;
    if (yearsToFI < 0) yearsToFI = 0;
    const fd = new Date(now.getFullYear(), now.getMonth(), 1);
    fd.setFullYear(fd.getFullYear() + Math.floor(yearsToFI));
    fd.setMonth(fd.getMonth() + Math.round((yearsToFI % 1) * 12));
    freedomDate = fd.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  res.json({
    netWorth, annualSavings, targetAnnualSpend, fiNumber,
    yearsToFI: yearsToFI !== null ? parseFloat(yearsToFI.toFixed(1)) : null,
    freedomDate, hasTarget,
  });
});

app.post('/api/freedom/target', requireAuth, async (req, res) => {
  const { targetAnnualSpend } = req.body;
  const data = await load(req.userId);
  data.freedomTarget = parseFloat(targetAnnualSpend) || null;
  await save(data, req.userId);
  res.json({ ok: true, freedomTarget: data.freedomTarget });
});

// ── Feature 4: Credit Score Log ──
app.get('/api/creditscore', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  res.json([...data.creditScores].sort((a, b) => b.date.localeCompare(a.date)));
});

app.post('/api/creditscore', requireAuth, async (req, res) => {
  const { score, date } = req.body;
  if (!score) return res.status(400).json({ error: 'Missing score' });
  const data = await load(req.userId);
  const entry = { id: Date.now().toString(), score: parseInt(score), date: date || new Date().toISOString().split('T')[0] };
  data.creditScores.push(entry);
  await save(data, req.userId);
  res.json(entry);
});

app.delete('/api/creditscore/:id', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  data.creditScores = data.creditScores.filter(c => c.id !== req.params.id);
  await save(data, req.userId);
  res.json({ ok: true });
});

// ── Feature 5: Tax Estimator ──
app.get('/api/tax', requireAuth, async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const data = await load(req.userId);

  const yearTxs = data.transactions.filter(t => new Date(t.date).getFullYear() === year && t.type === 'income');
  const w2Income = yearTxs.filter(t => t.category === 'Salary').reduce((s, t) => s + t.amount, 0);
  const selfIncome = yearTxs.filter(t => ['Freelance', 'Business'].includes(t.category)).reduce((s, t) => s + t.amount, 0);
  const totalIncome = w2Income + selfIncome;

  const standardDeduction = 15000;
  const taxableIncome = Math.max(0, totalIncome - standardDeduction);

  const brackets = [
    { limit: 11925, rate: 0.10 }, { limit: 48475, rate: 0.12 },
    { limit: 103350, rate: 0.22 }, { limit: 197300, rate: 0.24 },
    { limit: 250525, rate: 0.32 }, { limit: 626350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ];

  let federalTax = 0, remaining = taxableIncome, prevLimit = 0;
  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.limit - prevLimit);
    federalTax += taxable * bracket.rate;
    remaining -= taxable;
    prevLimit = bracket.limit;
  }

  const seTax = selfIncome > 0 ? selfIncome * 0.9235 * 0.153 : 0;
  const totalTax = federalTax + seTax;
  res.json({
    year, totalIncome, w2Income, selfIncome, standardDeduction, taxableIncome,
    federalTax: parseFloat(federalTax.toFixed(2)),
    seTax: parseFloat(seTax.toFixed(2)),
    totalTax: parseFloat(totalTax.toFixed(2)),
    quarterlyPayment: parseFloat((totalTax / 4).toFixed(2)),
    effectiveRate: parseFloat((totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0).toFixed(1)),
  });
});

// ── Feature 6: Weekly Digest ──
app.post('/api/digest', requireAuth, async (req, res) => {
  const { month } = req.body;
  const data = await load(req.userId);
  const { year, month: mo } = parseMonth(month);
  const monthLabel = new Date(year, mo, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const txs = filterByMonth(data.transactions, year, mo);
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expenses;
  const savingsRate = income > 0 ? ((net / income) * 100).toFixed(0) : 0;

  const byCategory = {};
  txs.filter(t => t.type === 'expense').forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });
  const top3 = Object.entries(byCategory).sort(([, a], [, b]) => b - a).slice(0, 3).map(([cat, amt]) => `${cat}: $${amt.toFixed(0)}`).join(', ');
  const budgetAlerts = data.budgets.filter(b => (byCategory[b.category] || 0) >= b.limit * 0.8).map(b => b.category).join(', ');

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: `Here's my financial snapshot for ${monthLabel}:\n- Income: $${income.toFixed(0)}\n- Expenses: $${expenses.toFixed(0)}\n- Net: ${net >= 0 ? '+' : ''}$${net.toFixed(0)}\n- Savings rate: ${savingsRate}%\n- Top spending: ${top3 || 'none'}\n${budgetAlerts ? '- Budget alerts: ' + budgetAlerts : ''}\n\nWrite a friendly, direct 3-4 sentence financial digest for the week. Be encouraging but honest. No markdown, plain text only.` }],
    });
    res.json({ digest: stripMarkdown(msg.content[0].text) });
  } catch (err) {
    console.error(err);
    res.json({ digest: null });
  }
});

// ── Feature 7: Savings Challenges ──
app.get('/api/challenges', requireAuth, async (req, res) => {
  res.json((await load(req.userId)).challenges || {});
});

app.post('/api/challenges/52week', requireAuth, async (req, res) => {
  const { week, completed } = req.body;
  if (!week || week < 1 || week > 52) return res.status(400).json({ error: 'Invalid week' });
  const data = await load(req.userId);
  if (!data.challenges) data.challenges = {};
  if (!data.challenges.weeks52) data.challenges.weeks52 = {};
  data.challenges.weeks52[String(week)] = !!completed;
  await save(data, req.userId);
  res.json({ ok: true, weeks52: data.challenges.weeks52 });
});

app.get('/api/challenges/roundup', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  let roundupTotal = 0;
  data.transactions.filter(t => t.type === 'expense').forEach(t => {
    roundupTotal += Math.ceil(t.amount) - t.amount;
  });
  res.json({ roundupTotal: parseFloat(roundupTotal.toFixed(2)) });
});

app.get('/api/challenges/nospend', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let streak = 0, checkDate = new Date(today);
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const hasExpense = data.transactions.some(t => t.type === 'expense' && new Date(t.date).toISOString().split('T')[0] === dateStr);
    if (hasExpense) break;
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
    if (streak > 365) break;
  }
  res.json({ streak });
});

// ── Feature 8: Milestones & Badges ──
app.get('/api/milestones', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  const now = new Date();

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

  const badges = [];
  if (data.transactions.length > 0) badges.push('first_tx');
  if (data.budgets.length > 0) badges.push('first_budget');

  const monthsSet = new Set();
  data.transactions.forEach(t => { const d = new Date(t.date); monthsSet.add(`${d.getFullYear()}-${d.getMonth()}`); });
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

  let cur = 0, maxConsecutive = 0;
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const txs = filterByMonth(data.transactions, d.getFullYear(), d.getMonth());
    const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    if (inc - exp > 0) { cur++; maxConsecutive = Math.max(maxConsecutive, cur); } else cur = 0;
  }
  if (maxConsecutive >= 3) badges.push('streak_3');

  let totalExp3 = 0;
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const txs = filterByMonth(data.transactions, d.getFullYear(), d.getMonth());
    totalExp3 += txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  }
  const avgExp = totalExp3 / 3;
  const cb = data.currentBalance || 0;
  if (avgExp > 0 && cb / avgExp >= 3) badges.push('emergency_3mo');

  if (data.goals.some(g => g.current >= g.target)) badges.push('goal_complete');
  if (data.subscriptions.length > 0) badges.push('sub_tracker');
  if (data.liabilities.length === 0) badges.push('debt_free');

  res.json(badges.map(id => BADGE_DEFS.find(b => b.id === id)).filter(Boolean));
});

// ── Feature 9: Shared Expenses ──
app.get('/api/shared', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  res.json([...data.shared].sort((a, b) => b.date.localeCompare(a.date)));
});

app.post('/api/shared', requireAuth, async (req, res) => {
  const { person, amount, description, date, paidBy } = req.body;
  if (!person || !amount) return res.status(400).json({ error: 'Missing fields' });
  const data = await load(req.userId);
  const entry = {
    id: Date.now().toString(), person, amount: parseFloat(amount),
    description: description || '',
    date: date || new Date().toISOString().split('T')[0],
    paidBy: paidBy || 'me', settled: false,
  };
  data.shared.push(entry);
  await save(data, req.userId);
  res.json(entry);
});

app.post('/api/shared/:id/settle', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  const entry = data.shared.find(s => s.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  entry.settled = !entry.settled;
  await save(data, req.userId);
  res.json(entry);
});

app.delete('/api/shared/:id', requireAuth, async (req, res) => {
  const data = await load(req.userId);
  data.shared = data.shared.filter(s => s.id !== req.params.id);
  await save(data, req.userId);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3002;
initDB()
  .then(() => app.listen(PORT, () => console.log(`Clarity running on http://localhost:${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
