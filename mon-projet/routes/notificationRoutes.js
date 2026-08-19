const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');

// --- ROUTES DE RÉCUPÉRATION ---

// Récupérer la liste des notifications d'un utilisateur
router.get('/:id_user', NotificationController.getNotifications);

// Récupérer le NOMBRE de notifications non lues (Badge)
router.get('/count/:id_user', NotificationController.getUnreadCount);


// --- ROUTES D'ACTION ---

// Marquer une notification spécifique comme lue
router.put('/:id/read', NotificationController.markAsRead);

// Marquer TOUTES les notifications d'un utilisateur comme lues
router.put('/read-all/:id_user', NotificationController.markAllAsRead);

// Supprimer une notification
router.delete('/:id', NotificationController.deleteNotification);

module.exports = router;