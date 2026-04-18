/**
 * @module controllers/reportController
 * @description Monthly, range, and CSV export reports.
 */

const db = require('../config/db');
const { asyncHandler, successResponse, round2 } = require('../utils/helpers');
const { AppError } = require('../utils/errors');

// ── GET /api/reports/monthly?year=&month= ──────────────────
const monthly = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

  // Income
  const { rows: incRows } = await db.query(
    `SELECT COALESCE(SUM(amount_in_preferred), 0) AS total FROM transactions
     WHERE user_id=$1 AND type='income' AND is_refund=false AND date BETWEEN $2 AND $3`,
    [userId, startDate, endDate]
  );
  // Expenses
  const { rows: expRows } = await db.query(
    `SELECT COALESCE(SUM(amount_in_preferred), 0) AS total FROM transactions
     WHERE user_id=$1 AND type='expense' AND is_refund=false AND date BETWEEN $2 AND $3`,
    [userId, startDate, endDate]
  );

  const totalIncome = round2(parseFloat(incRows[0].total));
  const totalExpenses = round2(parseFloat(expRows[0].total));
  const netSavings = round2(totalIncome - totalExpenses);
  const savingsRate = totalIncome > 0 ? round2((netSavings / totalIncome) * 100) : 0;

  // Category breakdown
  const { rows: catBreakdown } = await db.query(
    `SELECT c.name AS category, t.type,
            COALESCE(SUM(t.amount_in_preferred), 0) AS amount
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND t.is_refund = false AND t.date BETWEEN $2 AND $3
     GROUP BY c.name, t.type
     ORDER BY amount DESC`,
    [userId, startDate, endDate]
  );

  // Day-wise list
  const { rows: transactions } = await db.query(
    `SELECT t.*, c.name AS category_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND t.date BETWEEN $2 AND $3
     ORDER BY t.date ASC`,
    [userId, startDate, endDate]
  );

  successResponse(res, {
    period: { year, month, start_date: startDate, end_date: endDate },
    summary: { total_income: totalIncome, total_expenses: totalExpenses, net_savings: netSavings, savings_rate: savingsRate },
    category_breakdown: catBreakdown.map((r) => ({ ...r, amount: round2(parseFloat(r.amount)) })),
    transactions,
  });
});

// ── GET /api/reports/range?start_date=&end_date=&currency= ─
const range = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { start_date, end_date } = req.query;
  if (!start_date || !end_date) {
    throw new AppError('start_date and end_date are required', 400, 'MISSING_PARAMS');
  }

  const { rows: incRows } = await db.query(
    `SELECT COALESCE(SUM(amount_in_preferred), 0) AS total FROM transactions
     WHERE user_id=$1 AND type='income' AND is_refund=false AND date BETWEEN $2 AND $3`,
    [userId, start_date, end_date]
  );
  const { rows: expRows } = await db.query(
    `SELECT COALESCE(SUM(amount_in_preferred), 0) AS total FROM transactions
     WHERE user_id=$1 AND type='expense' AND is_refund=false AND date BETWEEN $2 AND $3`,
    [userId, start_date, end_date]
  );

  const totalIncome = round2(parseFloat(incRows[0].total));
  const totalExpenses = round2(parseFloat(expRows[0].total));

  const { rows: transactions } = await db.query(
    `SELECT t.*, c.name AS category_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND t.date BETWEEN $2 AND $3
     ORDER BY t.date ASC`,
    [userId, start_date, end_date]
  );

  successResponse(res, {
    period: { start_date, end_date },
    summary: {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_savings: round2(totalIncome - totalExpenses),
      transaction_count: transactions.length,
    },
    transactions,
  });
});

// ── GET /api/reports/export?format=csv&start_date=&end_date=
const exportCsv = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { start_date, end_date } = req.query;

  const conditions = ['t.user_id = $1'];
  const params = [userId];
  let idx = 2;

  if (start_date) { conditions.push(`t.date >= $${idx++}`); params.push(start_date); }
  if (end_date) { conditions.push(`t.date <= $${idx++}`); params.push(end_date); }

  const { rows } = await db.query(
    `SELECT t.date, t.type, t.amount, t.currency, t.amount_in_preferred,
            t.exchange_rate, t.description, t.is_refund,
            c.name AS category
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.date ASC`,
    params
  );

  // Build CSV
  const { Parser } = require('json2csv');
  const fields = ['date', 'type', 'category', 'amount', 'currency', 'amount_in_preferred', 'exchange_rate', 'description', 'is_refund'];
  const parser = new Parser({ fields });
  const csv = parser.parse(rows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="transactions_${start_date || 'all'}_${end_date || 'all'}.csv"`);
  res.send(csv);
});

module.exports = { monthly, range, exportCsv };
