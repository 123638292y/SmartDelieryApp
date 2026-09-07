const db = require('../config/database');
const socketHandler = require('../socket/socketHandler'); 

/**
 * Helper pour gérer les valeurs BigInt de MySQL (comme les résultats COUNT)
 * que JSON.stringify ne peut pas gérer par défaut.
 */
const safeJson = (data) => {
  if (!data) return [];
  return JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

const NotificationController = {

getNotifications: async (req, res) => {
  const { id_user } = req.params;
  try {
    const query = `
      SELECT id, id_user, title, message, is_read, created_at 
      FROM notifications 
      WHERE id_user = ? 
      ORDER BY created_at DESC
    `;
    
    // AVEC MARIADB : On ne met pas de crochets [] autour de "rows"
    // car db.query renvoie déjà le tableau de lignes.
    const rows = await db.query(query, [id_user]);
    
    // --- DEBUG ---
    // Maintenant, rows.length devrait afficher 8.
    console.log(`[DEBUG] User ${id_user} : ${Array.isArray(rows) ? rows.length : 'Pas un tableau'} notifications trouvées`);

    res.json({ 
      success: true, 
      notifications: safeJson(rows) 
    });

  } catch (error) {
    console.error("Erreur getNotifications:", error);
    res.status(500).json({ success: false, notifications: [] });
  }
},

getUnreadCount: async (req, res) => {
  const { id_user } = req.params;
  try {
    // IDEM ICI : On retire les crochets [rows]
    const rows = await db.query(
      "SELECT COUNT(*) as total FROM notifications WHERE id_user = ? AND is_read = 0",
      [id_user]
    );

    // Dans MariaDB, rows est un tableau, ex: [ { total: 8n } ]
    let total = 0;
    if (rows && rows.length > 0) {
        total = Number(rows[0].total);
    }

    res.json({ 
      success: true, 
      count: total 
    });
  } catch (error) {
    console.error("❌ Erreur SQL getUnreadCount:", error);
    res.status(500).json({ success: false, count: 0 });
  }
},

  /**
   * 3. MARQUER COMME LUE
   */
  markAsRead: async (req, res) => {
    const { id } = req.params;
    try {
      await db.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);
      res.json({ success: true, message: "Notification marquée comme lue" });
    } catch (error) {
      console.error("Erreur markAsRead:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * 4. MARQUER TOUT COMME LU POUR UN UTILISATEUR
   */
  markAllAsRead: async (req, res) => {
    const { id_user } = req.params;
    try {
      await db.query(
        "UPDATE notifications SET is_read = 1 WHERE id_user = ? AND is_read = 0", 
        [id_user]
      );
      res.json({ success: true, message: "Toutes les notifications sont lues" });
    } catch (error) {
      console.error("Erreur markAllAsRead:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * 5. SUPPRIMER UNE NOTIFICATION
   */
  deleteNotification: async (req, res) => {
    const { id } = req.params;
    try {
      await db.query("DELETE FROM notifications WHERE id = ?", [id]);
      res.json({ success: true, message: "Notification supprimée" });
    } catch (error) {
      console.error("Erreur deleteNotification:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * 6. CRÉER ET ENVOYER (Moteur interne)
   * Sauvegarde en base de données ET envoi via Socket.io
   */
  createAndSend: async (id_user, title, message) => {
    try {
        if (!id_user || id_user === 0) {
            console.error("❌ Tentative d'envoi de notification sans ID utilisateur valide");
            return false;
        }

        // A. INSERTION DB
        // CORRECTION : On déstructure [result] pour obtenir l'objet d'insertion
        const [result] = await db.query(
            "INSERT INTO notifications (id_user, title, message, is_read, created_at) VALUES (?, ?, ?, 0, NOW())",
            [id_user, title, message]
        );

        // Récupération de l'ID généré (converti en string pour la sécurité JSON)
        const insertId = result.insertId ? result.insertId.toString() : Date.now().toString(); 
        
        console.log(`✅ Notification enregistrée en DB (ID: ${insertId}) pour l'user: ${id_user}`);

        // B. ENVOI SOCKET EN TEMPS RÉEL
        if (socketHandler && typeof socketHandler.sendNotification === 'function') {
            socketHandler.sendNotification(
                id_user, 
                title, 
                message, 
                { 
                    id: insertId, // L'ID réel venant de la base de données
                    is_read: 0,
                    created_at: new Date().toISOString(),
                    type: 'delivery'
                }
            );
        } else {
            console.warn("⚠️ SocketHandler non configuré ou fonction sendNotification manquante");
        }
        
        return true;
    } catch (error) {
        console.error("❌ Erreur critique dans createAndSend:", error);
        return false;
    }
  }
};

module.exports = NotificationController;