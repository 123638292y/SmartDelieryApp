const db = require('../config/database');
const socketHandler = require('../socket/socketHandler'); 

// Helper pour gérer les BigInt
const safeJson = (data) => {
  if (!data) return [];
  return JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

const NotificationController = {

  /**
   * 1. Récupérer toutes les notifications
   */
  getNotifications: async (req, res) => {
    const { id_user } = req.params;
    try {
      const query = `
        SELECT * FROM notifications 
        WHERE id_user = ? 
        ORDER BY created_at DESC 
        LIMIT 50
      `;
      const [rows] = await db.query(query, [id_user]);
      res.json({ success: true, notifications: safeJson(rows) });
    } catch (error) {
      res.status(500).json({ success: false, message: "Erreur lors de la récupération" });
    }
  },

  /**
   * 2. NOUVEAU : Récupérer le nombre de notifications non lues
   */
 getUnreadCount: async (req, res) => {
    const { id_user } = req.params;
    try {
      // On récupère le résultat brut
      const [rows] = await db.query(
        "SELECT COUNT(*) as total FROM notifications WHERE id_user = ? AND is_read = 0",
        [id_user]
      );

      // Sécurité : on vérifie si rows existe et s'il contient au moins un élément
      if (rows && rows.length > 0) {
        res.json({ 
          success: true, 
          count: rows[0].total || 0 
        });
      } else {
        // Si aucun résultat (ne devrait pas arriver avec COUNT, mais par sécurité)
        res.json({ success: true, count: 0 });
      }

    } catch (error) {
      console.error("Erreur getUnreadCount:", error);
      // On renvoie 0 au lieu de faire crasher l'appli mobile
      res.status(500).json({ success: false, count: 0, error: error.message });
    }
  },

  /**
   * 3. Marquer une notification comme lue
   */
  markAsRead: async (req, res) => {
    const { id } = req.params;
    try {
      await db.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);
      res.json({ success: true, message: "Notification marquée comme lue" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * 4. Marquer TOUTES les notifications comme lues
   */
  markAllAsRead: async (req, res) => {
    const { id_user } = req.params;
    try {
      await db.query("UPDATE notifications SET is_read = 1 WHERE id_user = ? AND is_read = 0", [id_user]);
      res.json({ success: true, message: "Toutes les notifications sont lues" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * 5. Supprimer une notification
   */
  deleteNotification: async (req, res) => {
    const { id } = req.params;
    try {
      await db.query("DELETE FROM notifications WHERE id = ?", [id]);
      res.json({ success: true, message: "Notification supprimée" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * 6. Fonction interne de création
   */
  createAndSend: async (id_user, title, message, type = 'delivery') => {
    try {
      const [result] = await db.query(
        "INSERT INTO notifications (id_user, title, message, type, is_read) VALUES (?, ?, ?, ?, 0)",
        [id_user, title, message, type]
      );

      if (socketHandler && typeof socketHandler.sendNotification === 'function') {
        socketHandler.sendNotification(id_user, {
          id: result.insertId,
          title,
          message,
          type,
          is_read: 0,
          created_at: new Date()
        });
      }
      return true;
    } catch (error) {
      console.error("Erreur création notification:", error);
      return false;
    }
  }
};

module.exports = NotificationController;