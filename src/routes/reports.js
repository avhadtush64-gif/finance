/**
 * @module routes/reports
 * @description Report endpoints: monthly, range, CSV export.
 */

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const reportCtrl = require('../controllers/reportController');

const router = Router();
router.use(authenticate);

router.get('/monthly', reportCtrl.monthly);
router.get('/range', reportCtrl.range);
router.get('/export', reportCtrl.exportCsv);

module.exports = router;
