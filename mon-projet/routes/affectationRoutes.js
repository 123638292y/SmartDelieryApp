const express = require('express');
const router = express.Router();
const AffectationController = require('../controllers/AffectationController');
const adminAuth = require('../middleware/adminMiddleware');
// Protection des routes
router.use(adminAuth);

// =========================================================
// ROUTES DE CONSULTATION (GET)
// =========================================================

// 1. Liste des livreurs
router.get('/drivers', AffectationController.getAllDrivers);

// 2. Liste de toutes les livraisons
router.get('/deliveries', AffectationController.getAllDeliveries);

/**
 * 3. Récupérer les livraisons groupées par chauffeur
 * Au lieu de /per-driver/:id?, on définit deux routes pour éviter l'erreur de syntaxe "?"
 */
// Cas où on veut TOUS les chauffeurs
router.get('/per-driver', AffectationController.getDeliveriesPerDriver);
// Cas où on veut UN chauffeur spécifique
router.get('/per-driver/:id', AffectationController.getDeliveriesPerDriver);

// 4. Assignments spécifiques
router.get('/assignments/driver/:id_driver', AffectationController.getDriverAssignments);


// =========================================================
// ROUTES D'ACTION (POST / DELETE)
// =========================================================

router.post('/assign', AffectationController.assignDelivery);
router.post('/auto-assign', AffectationController.autoAssignByClustering);
router.delete('/unassign/:id_doc', AffectationController.unassignDelivery);

module.exports = router;                   