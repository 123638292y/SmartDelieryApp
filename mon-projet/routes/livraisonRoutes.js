require('dotenv').config(); 
const express = require("express");
const router = express.Router();
const LivraisonController = require('../controllers/LivraisonController');
const authenticate = require("../middleware/auth");

/**
 * @route   GET /api/livraisons/cluster
 * @desc    IA : Effectue le clustering des livraisons (pour l'admin)
 */
router.get('/cluster', authenticate, LivraisonController.clusterDeliveriesToday);

/**
 * @route   POST /api/livraisons/assign
 * @desc    Affecter un colis à un livreur (Déclenche la notification Socket.io)
 * @payload { "id_doc": 501, "id_driver": 12 }
 */
router.post('/assign', authenticate, LivraisonController.assignDelivery);

/**
 * @route   GET /api/livraisons/today/:identification_no
 * @desc    Récupère la liste des livraisons du jour pour un chauffeur
 */
router.get('/today/:identification_no', authenticate, LivraisonController.getLivraisonsToday);

/**
 * @route   GET /api/livraisons/detail/:id_doc
 * @desc    Récupère les détails d'un bon de livraison spécifique
 */
router.get('/detail/:id_doc', authenticate, LivraisonController.getLivraisonDetail);

/**
 * @route   PUT /api/livraisons/status/:id_doc
 * @desc    Met à jour le statut d'une livraison (Livré, Absent, etc.)
 */
router.put('/status/:id_doc', authenticate, LivraisonController.updateLivraisonStatus);


router.put('/detail/qte/:id_detail', authenticate,LivraisonController.updateDetailQuantity);
/**
 * @route   GET /api/livraisons/stats/:id_driver
 * @desc    Récupère les statistiques de performance du jour
 */
router.get('/stats/:identification_no', authenticate, LivraisonController.getDeliveryStats);

router.get('/historique/:identification_no', LivraisonController.getDriverHistory);
module.exports = router;