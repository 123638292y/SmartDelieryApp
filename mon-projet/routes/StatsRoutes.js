const express = require('express');
const router = express.Router();
const adminAuth = require("../middleware/adminMiddleware");

const StatsController = require('../controllers/StatsController');

router.get('/stats/global', adminAuth, StatsController.getGlobalDeliveryStats);
router.get('/stats/drivers', adminAuth, StatsController.getDriversPerformance);
router.get('/stats/evolution', adminAuth, StatsController.getMonthlyEvolution);
router.get('/stats/top-clients', adminAuth, StatsController.getTopDeliveryClients);
router.get('/stats/dashboard', adminAuth, StatsController.getDashboardSummary);

module.exports = router;