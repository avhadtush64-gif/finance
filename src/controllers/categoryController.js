/**
 * @module controllers/categoryController
 * @description CRUD for transaction categories.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { asyncHandler, successResponse } = require('../utils/helpers');
const { NotFoundError, ConflictError, ForbiddenError } = require('../utils/errors');

// ── GET /api/categories ────────────────────────────────────
const list = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM categories
     WHERE user_id = $1 OR is_system = true
     ORDER BY is_system DESC, name ASC`,
    [req.user.id]
  );
  
  const uniqueCategories = [];
  const seen = new Set();
  for (const cat of rows) {
    const key = `${cat.type}-${cat.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCategories.push(cat);
    }
  }

  successResponse(res, { categories: uniqueCategories });
});

// ── POST /api/categories ───────────────────────────────────
const create = asyncHandler(async (req, res) => {
  const { name, type, color, icon } = req.body;
  const id = uuidv4();
  const { rows } = await db.query(
    `INSERT INTO categories (id, user_id, name, type, color, icon, is_system)
     VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING *`,
    [id, req.user.id, name, type, color || '#BDC3C7', icon || '📁']
  );
  successResponse(res, { category: rows[0] }, 201);
});

// ── PATCH /api/categories/:id ──────────────────────────────
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { rows: existing } = await db.query(
    'SELECT * FROM categories WHERE id = $1', [id]
  );
  if (existing.length === 0) throw new NotFoundError('Category');
  if (existing[0].is_system) throw new ForbiddenError('Cannot edit system categories');
  if (existing[0].user_id !== req.user.id) throw new ForbiddenError('Not your category');

  const { name, color, icon } = req.body;
  const fields = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
  if (color !== undefined) { fields.push(`color = $${idx++}`); values.push(color); }
  if (icon !== undefined) { fields.push(`icon = $${idx++}`); values.push(icon); }

  if (fields.length === 0) {
    return successResponse(res, { category: existing[0] });
  }

  values.push(id);
  const { rows } = await db.query(
    `UPDATE categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  successResponse(res, { category: rows[0] });
});

// ── DELETE /api/categories/:id ─────────────────────────────
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true';

  const { rows: existing } = await db.query(
    'SELECT * FROM categories WHERE id = $1', [id]
  );
  if (existing.length === 0) throw new NotFoundError('Category');
  if (existing[0].is_system) throw new ForbiddenError('Cannot delete system categories');
  if (existing[0].user_id !== req.user.id) throw new ForbiddenError('Not your category');

  // Check for transactions using this category
  const { rows: txnCount } = await db.query(
    'SELECT COUNT(*)::int AS count FROM transactions WHERE category_id = $1', [id]
  );

  if (txnCount[0].count > 0 && !force) {
    throw new ConflictError(
      `Cannot delete: ${txnCount[0].count} transaction(s) use this category. Use ?force=true to reassign to Uncategorized.`,
      { transaction_count: txnCount[0].count }
    );
  }

  if (txnCount[0].count > 0 && force) {
    // Find or create "Uncategorized" for this user
    let { rows: uncatRows } = await db.query(
      `SELECT id FROM categories WHERE name = 'Uncategorized' AND type = $1 AND (user_id = $2 OR is_system = true) LIMIT 1`,
      [existing[0].type, req.user.id]
    );
    let uncatId;
    if (uncatRows.length > 0) {
      uncatId = uncatRows[0].id;
    } else {
      uncatId = uuidv4();
      await db.query(
        `INSERT INTO categories (id, user_id, name, type, color, icon, is_system)
         VALUES ($1, $2, 'Uncategorized', $3, '#BDC3C7', '📁', false)`,
        [uncatId, req.user.id, existing[0].type]
      );
    }
    await db.query('UPDATE transactions SET category_id = $1 WHERE category_id = $2', [uncatId, id]);
  }

  await db.query('DELETE FROM categories WHERE id = $1', [id]);
  successResponse(res, { message: 'Category deleted' });
});

module.exports = { list, create, update, remove };
