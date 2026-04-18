/**
 * @module controllers/dashboardController
 * @description Aggregated dashboard data endpoint.
 */

const db = require('../config/db');
const { asyncHandler, successResponse, round2 } = require('../utils/helpers');

// ── GET /api/dashboard ─────────────────────────────────────
const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  // ── Summary (current month) ──
  const { rows: incomeRows } = await db.query(
    `SELECT COALESCE(SUM(amount_in_preferred), 0) AS total
     FROM transactions
     WHERE user_id = $1 AND type = 'income' AND is_refund = false AND date BETWEEN $2 AND $3`,
    [userId, monthStart, monthEnd]
  );
  const { rows: expenseRows } = await db.query(
    `SELECT COALESCE(SUM(amount_in_preferred), 0) AS total
     FROM transactions
     WHERE user_id = $1 AND type = 'expense' AND is_refund = false AND date BETWEEN $2 AND $3`,
    [userId, monthStart, monthEnd]
  );
  // Refunds reduce expenses
  const { rows: refundRows } = await db.query(
    `SELECT COALESCE(SUM(amount_in_preferred), 0) AS total
     FROM transactions
     WHERE user_id = $1 AND type = 'expense' AND is_refund = true AND date BETWEEN $2 AND $3`,
    [userId, monthStart, monthEnd]
  );

  const totalIncome = round2(parseFloat(incomeRows[0].total));
  const totalExpenses = round2(parseFloat(expenseRows[0].total) - parseFloat(refundRows[0].total));
  const netSavings = round2(totalIncome - totalExpenses);
  const savingsRate = totalIncome > 0 ? round2((netSavings / totalIncome) * 100) : 0;

  // ── Expenses by category (current month) ──
  const { rows: expByCat } = await db.query(
    `SELECT c.name AS category, c.color, c.icon,
            COALESCE(SUM(t.amount_in_preferred), 0) AS amount
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND t.type = 'expense' AND t.is_refund = false
       AND t.date BETWEEN $2 AND $3
     GROUP BY c.id, c.name, c.color, c.icon
     ORDER BY amount DESC`,
    [userId, monthStart, monthEnd]
  );
  const totalExpForPercent = expByCat.reduce((s, r) => s + parseFloat(r.amount), 0);
  const expensesByCategory = expByCat.map((r) => ({
    category: r.category,
    color: r.color,
    icon: r.icon,
    amount: round2(parseFloat(r.amount)),
    percent_of_total: totalExpForPercent > 0 ? round2((parseFloat(r.amount) / totalExpForPercent) * 100) : 0,
  }));

  // ── Income by source (category) ──
  const { rows: incBySrc } = await db.query(
    `SELECT c.name AS source, COALESCE(SUM(t.amount_in_preferred), 0) AS amount
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND t.type = 'income' AND t.is_refund = false
       AND t.date BETWEEN $2 AND $3
     GROUP BY c.name
     ORDER BY amount DESC`,
    [userId, monthStart, monthEnd]
  );
  const incomeBySource = incBySrc.map((r) => ({
    source: r.source,
    amount: round2(parseFloat(r.amount)),
  }));

  // ── Monthly trend (last 6 months) ──
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    const monthLabel = d.toLocaleString('default', { month: 'short', year: 'numeric' });

    const { rows: mInc } = await db.query(
      `SELECT COALESCE(SUM(amount_in_preferred), 0) AS t FROM transactions
       WHERE user_id=$1 AND type='income' AND is_refund=false AND date BETWEEN $2 AND $3`,
      [userId, mStart, mEnd]
    );
    const { rows: mExp } = await db.query(
      `SELECT COALESCE(SUM(amount_in_preferred), 0) AS t FROM transactions
       WHERE user_id=$1 AND type='expense' AND is_refund=false AND date BETWEEN $2 AND $3`,
      [userId, mStart, mEnd]
    );

    const inc = round2(parseFloat(mInc[0].t));
    const exp = round2(parseFloat(mExp[0].t));
    monthlyTrend.push({ month: monthLabel, income: inc, expenses: exp, savings: round2(inc - exp) });
  }

  // ── Top 5 recent transactions ──
  const { rows: topTxns } = await db.query(
    `SELECT t.*, c.name AS category_name, c.icon AS category_icon
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT 5`,
    [userId]
  );

  // ── Budget alerts ──
  const { rows: budgets } = await db.query(
    `SELECT b.*, c.name AS category_name FROM budgets b
     JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = $1`, [userId]
  );
  const budgetAlerts = [];
  for (const b of budgets) {
    let pStart, pEnd;
    if (b.period === 'monthly') {
      pStart = monthStart; pEnd = monthEnd;
    } else if (b.period === 'weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const ws = new Date(now.getFullYear(), now.getMonth(), diff);
      pStart = ws.toISOString().slice(0, 10);
      pEnd = new Date(ws.getTime() + 6 * 86400000).toISOString().slice(0, 10);
    } else {
      pStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      pEnd = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
    }

    const { rows: sp } = await db.query(
      `SELECT COALESCE(SUM(amount_in_preferred), 0) AS spent FROM transactions
       WHERE user_id=$1 AND category_id=$2 AND type='expense' AND is_refund=false
         AND date BETWEEN $3 AND $4`,
      [userId, b.category_id, pStart, pEnd]
    );
    const spent = parseFloat(sp[0].spent);
    const pct = parseFloat(b.amount) > 0 ? round2((spent / parseFloat(b.amount)) * 100) : 0;
    budgetAlerts.push({
      budget_id: b.id,
      category: b.category_name,
      budget: parseFloat(b.amount),
      spent: round2(spent),
      percent_used: pct,
      is_overrun: pct >= 100,
    });
  }

  successResponse(res, {
    summary: { total_income: totalIncome, total_expenses: totalExpenses, net_savings: netSavings, savings_rate: savingsRate },
    expenses_by_category: expensesByCategory,
    income_by_source: incomeBySource,
    monthly_trend: monthlyTrend,
    top_transactions: topTxns,
    budget_alerts: budgetAlerts,
  });
});

module.exports = { getDashboard };
