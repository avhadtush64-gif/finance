/**
 * @module routes/budgets
 * @description Budget CRUD + progress routes.
 */

const { Router } = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const budgetCtrl = require('../controllers/budgetController');

const router = Router();
router.use(authenticate);

router.get('/', budgetCtrl.list);

router.post(
  '/',
  [
    body('category_id').isUUID().withMessage('Valid category_id required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be > 0'),
    body('period').optional().isIn(['monthly', 'weekly', 'yearly']),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('notify_at_percent').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  budgetCtrl.create
);

router.get('/:id/progress', [param('id').isUUID()], validate, budgetCtrl.progress);
router.patch('/:id', [param('id').isUUID()], validate, budgetCtrl.update);
router.delete('/:id', [param('id').isUUID()], validate, budgetCtrl.remove);

module.exports = router;
