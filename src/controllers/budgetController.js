/**
 * @module controllers/budgetController
 * @description CRUD for budgets + progress tracking.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { asyncHandler, successResponse, round2 } = require('../utils/helpers');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

/**
 * Calculate period date range for a budget.
 */
function getPeriodRange(period, refDate = new Date()) {
  const now = new Date(refDate);
  let start, end;

  if (period === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (period === 'weekly') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    start = new Date(now.getFullYear(), now.getMonth(), diff);
    end = new Date(start.getTime() + 6 * 86400000);
  } else {
    // yearly
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
  }

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

// ── POST /api/budgets ──────────────────────────────────────
const create = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { category_id, amount, currency, period, start_date, end_date, notify_at_percent } = req.body;

  // Get user's preferred currency for default
  const { rows: userRows } = await db.query(
    'SELECT preferred_currency FROM users WHERE id = $1', [userId]
  );

  const id = uuidv4();
  const { rows } = await db.query(
    `INSERT INTO budgets (id, user_id, category_id, amount, currency, period, start_date, end_date, notify_at_percent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      id, userId, category_id, amount,
      currency || userRows[0].preferred_currency,
      period || 'monthly',
      start_date || new Date().toISOString().slice(0, 10),
      end_date || null,
      notify_at_percent || 80,
    ]
  );
  successResponse(res, { budget: rows[0] }, 201);
});

// ── GET /api/budgets ───────────────────────────────────────
const list = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const { rows: budgets } = await db.query(
    `SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [userId]
  );

  // Calculate progress for each budget
  const result = [];
  for (const budget of budgets) {
    const { start, end } = getPeriodRange(budget.period);

    const { rows: spentRows } = await db.query(
      `SELECT COALESCE(SUM(amount_in_preferred), 0) AS spent
       FROM transactions
       WHERE user_id = $1 AND category_id = $2 AND type = 'expense'
         AND is_refund = false AND date BETWEEN $3 AND $4`,
      [userId, budget.category_id, start, end]
    );

    const spent = round2(parseFloat(spentRows[0].spent));
    const budgetAmt = parseFloat(budget.amount);
    const remaining = round2(budgetAmt - spent);
    const percent_used = budgetAmt > 0 ? round2((spent / budgetAmt) * 100) : 0;

    result.push({
      ...budget,
      spent,
      remaining,
      percent_used,
      is_overrun: percent_used >= 100,
      period_start: start,
      period_end: end,
    });
  }

  successResponse(res, { budgets: result });
});

// ── GET /api/budgets/:id/progress ──────────────────────────
const progress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const { rows } = await db.query(
    `SELECT b.*, c.name AS category_name FROM budgets b
     JOIN categories c ON c.id = b.category_id
     WHERE b.id = $1`, [id]
  );
  if (rows.length === 0) throw new NotFoundError('Budget');
  if (rows[0].user_id !== userId) throw new ForbiddenError();

  const budget = rows[0];
  const { start, end } = getPeriodRange(budget.period);

  const { rows: spentRows } = await db.query(
    `SELECT COALESCE(SUM(amount_in_preferred), 0) AS spent
     FROM transactions
     WHERE user_id = $1 AND category_id = $2 AND type = 'expense'
       AND is_refund = false AND date BETWEEN $3 AND $4`,
    [userId, budget.category_id, start, end]
  );

  const spent = round2(parseFloat(spentRows[0].spent));
  const budgetAmt = parseFloat(budget.amount);

  successResponse(res, {
    budget: budgetAmt,
    spent,
    remaining: round2(budgetAmt - spent),
    percent_used: budgetAmt > 0 ? round2((spent / budgetAmt) * 100) : 0,
    is_overrun: spent >= budgetAmt,
    period_start: start,
    period_end: end,
  });
});

// ── PATCH /api/budgets/:id ─────────────────────────────────
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const { rows: existing } = await db.query('SELECT * FROM budgets WHERE id = $1', [id]);
  if (existing.length === 0) throw new NotFoundError('Budget');
  if (existing[0].user_id !== userId) throw new ForbiddenError();

  const { amount, currency, period, start_date, end_date, notify_at_percent, category_id } = req.body;
  const fields = [];
  const values = [];
  let idx = 1;

  if (amount !== undefined) { fields.push(`amount = $${idx++}`); values.push(amount); }
  if (currency !== undefined) { fields.push(`currency = $${idx++}`); values.push(currency); }
  if (period !== undefined) { fields.push(`period = $${idx++}`); values.push(period); }
  if (start_date !== undefined) { fields.push(`start_date = $${idx++}`); values.push(start_date); }
  if (end_date !== undefined) { fields.push(`end_date = $${idx++}`); values.push(end_date); }
  if (notify_at_percent !== undefined) { fields.push(`notify_at_percent = $${idx++}`); values.push(notify_at_percent); }
  if (category_id !== undefined) { fields.push(`category_id = $${idx++}`); values.push(category_id); }

  if (fields.length === 0) return successResponse(res, { budget: existing[0] });

  values.push(id);
  const { rows } = await db.query(
    `UPDATE budgets SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  successResponse(res, { budget: rows[0] });
});

// ── DELETE /api/budgets/:id ────────────────────────────────
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const { rows } = await db.query('SELECT user_id FROM budgets WHERE id = $1', [id]);
  if (rows.length === 0) throw new NotFoundError('Budget');
  if (rows[0].user_id !== userId) throw new ForbiddenError();

  await db.query('DELETE FROM budgets WHERE id = $1', [id]);
  successResponse(res, { message: 'Budget deleted' });
});

module.exports = { create, list, progress, update, remove };
