/**
 * @module routes/transactions
 * @description Transaction CRUD routes with validation.
 */

const { Router } = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const upload = require('../middleware/upload');
const txnCtrl = require('../controllers/transactionController');

const router = Router();
router.use(authenticate);

// ── List ───────────────────────────────────────────────────
router.get('/', txnCtrl.list);

// ── Create ─────────────────────────────────────────────────
router.post(
  '/',
  upload.single('receipt'),
  [
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be > 0'),
    body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category_id').isUUID().withMessage('Valid category_id required'),
    body('date').isDate().withMessage('Valid date required (YYYY-MM-DD)'),
    body('description').optional().isString(),
    body('is_refund').optional().isBoolean(),
  ],
  validate,
  txnCtrl.create
);

// ── Update ─────────────────────────────────────────────────
router.patch(
  '/:id',
  [param('id').isUUID()],
  validate,
  txnCtrl.update
);

// ── Delete ─────────────────────────────────────────────────
router.delete(
  '/:id',
  [param('id').isUUID()],
  validate,
  txnCtrl.remove
);

// ── Receipt upload / delete ────────────────────────────────
router.post('/:id/receipt', upload.single('receipt'), txnCtrl.uploadReceipt);
router.delete('/:id/receipt', txnCtrl.deleteReceipt);

module.exports = router;
