/**
 * @module routes/categories
 * @description Category CRUD routes.
 */

const { Router } = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const catCtrl = require('../controllers/categoryController');

const router = Router();
router.use(authenticate);

router.get('/', catCtrl.list);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a hex code'),
    body('icon').optional().isString(),
  ],
  validate,
  catCtrl.create
);

router.patch('/:id', [param('id').isUUID()], validate, catCtrl.update);
router.delete('/:id', [param('id').isUUID()], validate, catCtrl.remove);

module.exports = router;
