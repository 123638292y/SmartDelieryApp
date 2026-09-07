const express = require('express');
const router = express.Router();
const DriverController = require('../controllers/DriverController');
const adminAuth = require('../middleware/adminMiddleware');

// Toutes les routes de gestion des livreurs nécessitent d'être Admin
router.use(adminAuth);

// 1. Lister tous les livreurs
// GET /api/drivers
router.get('/', DriverController.getAllDrivers);

// 2. Récupérer un livreur par son ID
// GET /api/drivers/:id
router.get('/:id', DriverController.getDriverById);

// 3. Ajouter un nouveau livreur
// POST /api/drivers
router.post('/', DriverController.createDriver);

// 4. Modifier un livreur
// PUT /api/drivers/:id
router.put('/:id', DriverController.updateDriver);

// 5. Supprimer un livreur
// DELETE /api/drivers/:id
router.delete('/:id', DriverController.deleteDriver);

module.exports = router;