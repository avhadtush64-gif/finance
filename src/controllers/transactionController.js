/**
 * @module controllers/transactionController
 * @description CRUD for financial transactions with currency conversion, pagination, filtering.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { asyncHandler, successResponse, parsePagination, round2 } = require('../utils/helpers');
const { NotFoundError, AppError, ForbiddenError } = require('../utils/errors');
const { SUPPORTED_CURRENCIES } = require('../utils/constants');
const currencyService = require('../services/currencyService');

// ── GET /api/transactions ──────────────────────────────────
const list = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit, offset } = parsePagination(req.query);
  const { type, category_id, start_date, end_date, currency, sort } = req.query;

  const conditions = ['t.user_id = $1'];
  const params = [userId];
  let idx = 2;

  if (type) { conditions.push(`t.type = $${idx++}`); params.push(type); }
  if (category_id) { conditions.push(`t.category_id = $${idx++}`); params.push(category_id); }
  if (start_date) { conditions.push(`t.date >= $${idx++}`); params.push(start_date); }
  if (end_date) { conditions.push(`t.date <= $${idx++}`); params.push(end_date); }
  if (currency) { conditions.push(`t.currency = $${idx++}`); params.push(currency); }

  const where = conditions.join(' AND ');

  // Determine sort
  let orderBy = 't.date DESC, t.created_at DESC';
  if (sort === 'amount') orderBy = 't.amount_in_preferred DESC';
  if (sort === 'date') orderBy = 't.date DESC';
  if (sort === '-amount') orderBy = 't.amount_in_preferred ASC';
  if (sort === '-date') orderBy = 't.date ASC';

  // Count
  const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM transactions t WHERE ${where}`, params);
  const total = countResult.rows[0].total;

  // Data
  const dataParams = [...params, limit, offset];
  const { rows } = await db.query(
    `SELECT t.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT $${idx++} OFFSET $${idx++}`,
    dataParams
  );

  // Flag future-dated transactions
  const today = new Date().toISOString().slice(0, 10);
  const transactions = rows.map((t) => ({
    ...t,
    is_future: t.date > today,
  }));

  successResponse(res, {
    transactions,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  });
});

// ── POST /api/transactions ─────────────────────────────────
const create = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { amount, currency, type, category_id, date, description, is_refund } = req.body;

  // Validate currency
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError(`Unsupported currency: ${currency}`, 400, 'UNSUPPORTED_CURRENCY', {
      supported: SUPPORTED_CURRENCIES,
    });
  }

  // Validate amount
  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) {
    throw new AppError('Amount must be greater than 0', 400, 'INVALID_AMOUNT');
  }

  // Verify category exists and is accessible
  const { rows: catRows } = await db.query(
    'SELECT * FROM categories WHERE id = $1 AND (user_id = $2 OR is_system = true)',
    [category_id, userId]
  );
  if (catRows.length === 0) throw new NotFoundError('Category');

  // Get user's preferred currency
  const { rows: userRows } = await db.query(
    'SELECT preferred_currency FROM users WHERE id = $1', [userId]
  );
  const preferredCurrency = userRows[0].preferred_currency;

  // Convert currency
  const { converted, rate } = await currencyService.convert(numAmount, currency, preferredCurrency);

  const id = uuidv4();
  const receiptUrl = req.file ? `/uploads/${userId}/${req.file.filename}` : null;

  const { rows } = await db.query(
    `INSERT INTO transactions
       (id, user_id, category_id, type, amount, currency, amount_in_preferred, exchange_rate,
        description, date, receipt_url, is_refund)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [id, userId, category_id, type, round2(numAmount), currency, round2(converted), rate,
     description || '', date, receiptUrl, is_refund || false]
  );

  // Check budgets for this category
  checkBudgetAlerts(userId, category_id).catch((e) =>
    console.error('Budget alert check failed:', e.message)
  );

  const today = new Date().toISOString().slice(0, 10);
  const txn = { ...rows[0], is_future: rows[0].date > today };
  successResponse(res, { transaction: txn }, 201);
});

// ── PATCH /api/transactions/:id ────────────────────────────
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const { rows: existing } = await db.query(
    'SELECT * FROM transactions WHERE id = $1', [id]
  );
  if (existing.length === 0) throw new NotFoundError('Transaction');
  if (existing[0].user_id !== userId) throw new ForbiddenError();

  const txn = existing[0];
  const updates = {};
  const allowed = ['amount', 'currency', 'type', 'category_id', 'date', 'description', 'is_refund'];

  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // Re-validate amount if changed
  if (updates.amount !== undefined) {
    const num = parseFloat(updates.amount);
    if (!num || num <= 0) throw new AppError('Amount must be greater than 0', 400, 'INVALID_AMOUNT');
    updates.amount = round2(num);
  }

  // Re-validate currency if changed
  if (updates.currency !== undefined && !SUPPORTED_CURRENCIES.includes(updates.currency)) {
    throw new AppError(`Unsupported currency: ${updates.currency}`, 400, 'UNSUPPORTED_CURRENCY', {
      supported: SUPPORTED_CURRENCIES,
    });
  }

  // Recalculate if amount or currency changed
  if (updates.amount !== undefined || updates.currency !== undefined) {
    const amt = updates.amount || txn.amount;
    const cur = updates.currency || txn.currency;
    const { rows: userRows } = await db.query(
      'SELECT preferred_currency FROM users WHERE id = $1', [userId]
    );
    const pref = userRows[0].preferred_currency;
    const { converted, rate } = await currencyService.convert(parseFloat(amt), cur, pref);
    updates.amount_in_preferred = round2(converted);
    updates.exchange_rate = rate;
  }

  updates.updated_at = new Date().toISOString();

  const fields = [];
  const values = [];
  let idx = 1;
  for (const [key, val] of Object.entries(updates)) {
    fields.push(`${key} = $${idx++}`);
    values.push(val);
  }

  if (fields.length === 0) {
    return successResponse(res, { transaction: txn });
  }

  values.push(id);
  const { rows } = await db.query(
    `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  successResponse(res, { transaction: rows[0] });
});

// ── DELETE /api/transactions/:id ───────────────────────────
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const { rows } = await db.query(
    'SELECT user_id FROM transactions WHERE id = $1', [id]
  );
  if (rows.length === 0) throw new NotFoundError('Transaction');
  if (rows[0].user_id !== userId) throw new ForbiddenError();

  // Hard delete (documented choice)
  await db.query('DELETE FROM transactions WHERE id = $1', [id]);
  successResponse(res, { message: 'Transaction deleted' });
});

// ── Receipt endpoints ──────────────────────────────────────
const uploadReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const { rows } = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
  if (rows.length === 0) throw new NotFoundError('Transaction');
  if (rows[0].user_id !== userId) throw new ForbiddenError();

  if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE');

  const receiptUrl = `/uploads/${userId}/${req.file.filename}`;
  const { rows: updated } = await db.query(
    'UPDATE transactions SET receipt_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [receiptUrl, id]
  );

  successResponse(res, { transaction: updated[0] });
});

const deleteReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const { rows } = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
  if (rows.length === 0) throw new NotFoundError('Transaction');
  if (rows[0].user_id !== userId) throw new ForbiddenError();

  // Delete file from disk
  if (rows[0].receipt_url) {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve(rows[0].receipt_url.replace(/^\//, ''));
    fs.unlink(filePath, () => {}); // best-effort
  }

  await db.query(
    'UPDATE transactions SET receipt_url = NULL, updated_at = NOW() WHERE id = $1',
    [id]
  );
  successResponse(res, { message: 'Receipt deleted' });
});

// ── Budget alert helper ────────────────────────────────────
async function checkBudgetAlerts(userId, categoryId) {
  const { sendBudgetAlert } = require('../services/notificationService');

  // Get user
  const { rows: userRows } = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (userRows.length === 0) return;
  const user = userRows[0];

  // Get budgets for this category
  const { rows: budgets } = await db.query(
    `SELECT b.*, c.name AS category_name FROM budgets b
     JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = $1 AND b.category_id = $2`,
    [userId, categoryId]
  );

  for (const budget of budgets) {
    // Calculate period bounds
    const now = new Date();
    let periodStart, periodEnd;
    if (budget.period === 'monthly') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    } else if (budget.period === 'weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      periodStart = new Date(now.setDate(diff)).toISOString().slice(0, 10);
      periodEnd = new Date(new Date(periodStart).getTime() + 6 * 86400000).toISOString().slice(0, 10);
    } else {
      periodStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      periodEnd = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
    }

    // Sum non-refund expenses in period (in preferred currency)
    const { rows: spentRows } = await db.query(
      `SELECT COALESCE(SUM(amount_in_preferred), 0) AS spent
       FROM transactions
       WHERE user_id = $1 AND category_id = $2 AND type = 'expense'
         AND is_refund = false AND date BETWEEN $3 AND $4`,
      [userId, categoryId, periodStart, periodEnd]
    );
    const spent = parseFloat(spentRows[0].spent);
    const budgetAmt = parseFloat(budget.amount);
    const percentUsed = budgetAmt > 0 ? (spent / budgetAmt) * 100 : 0;
    const isOverrun = percentUsed >= 100;

    if (percentUsed >= budget.notify_at_percent) {
      await sendBudgetAlert({
        userId, userEmail: user.email, userName: user.name,
        budgetId: budget.id, categoryName: budget.category_name,
        spent, budgetAmount: budgetAmt, percentUsed, isOverrun,
      });
    }
  }
}

module.exports = { list, create, update, remove, uploadReceipt, deleteReceipt };
