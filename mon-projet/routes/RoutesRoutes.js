const express = require('express');
const router = express.Router();
const RouteController = require('../controllers/RouteController');
const authenticate = require("../middleware/auth");


router.get('/deliveries/:identification_no', authenticate,RouteController.getDriverDeliveries);

// Route pour récupérer l'itinéraire optimisé (Matrix + Nearest Neighbor + Roundtrip)
router.get('/optimized-route/:identification_no',authenticate, RouteController.getOptimizedRoute);
/**
 * @route   GET /api/livraisons/predict-speed
 * @desc    IA : Prédit la vitesse de livraison pour les colis du jour (Speed Model PyTorch)
 */
router.get('/predict-speed', authenticate, RouteController.predictSpeedToday);
module.exports = router;