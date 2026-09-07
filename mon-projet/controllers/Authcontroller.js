const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail'); // <<-- Import de ton utilitaire email

// Note : Si tu n'utilises pas Clerk pour le moment, tu peux commenter cette ligne
// const { createClerkClient } = require('@clerk/clerk-sdk-node');

const AuthController = {
  
adminLogin: async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = `
      SELECT id, email, phone, first_name, last_name, password, role, is_active, is_online, last_login
      FROM driver_auth 
      WHERE email = ? 
      LIMIT 1
    `;
    
    const result = await db.query(query, [email]);
    const rows = Array.isArray(result[0]) ? result[0] : result;

    if (!rows || rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: "Identifiants incorrects" 
      });
    }

    const adminAuth = rows[0];

    if (adminAuth.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Accès réservé aux administrateurs" 
      });
    }

    if (adminAuth.is_active === 0) {
      return res.status(403).json({ 
        success: false, 
        message: "Ce compte est désactivé" 
      });
    }

    const isMatch = await bcrypt.compare(password, adminAuth.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: "Identifiants incorrects" 
      });
    }

    await db.query(
      'UPDATE driver_auth SET last_login = NOW(), is_online = 1 WHERE id = ?', 
      [adminAuth.id]
    );

    const token = jwt.sign(
      { id: adminAuth.id, role: adminAuth.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: adminAuth.id,
        email: adminAuth.email,
        first_name: adminAuth.first_name,
        last_name: adminAuth.last_name,
        phone: adminAuth.phone,
        role: adminAuth.role,
        is_online: 1,
        is_active: adminAuth.is_active,
        last_login: new Date()
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur"
    });
  }},
login: async (req, res) => {
    const { email, password } = req.body;
    try {
      // ON AJOUTE UNE JOINTURE (JOIN) POUR RÉCUPÉRER LE MATRICULE (identification_no)
      const query = `
        SELECT da.*, d.identification_no 
        FROM driver_auth da 
        LEFT JOIN drivers d ON da.id_driver = d.id 
        WHERE da.email = ? 
        LIMIT 1
      `;
      
      const result = await db.query(query, [email]);
      // MariaDB/mysql2 renvoie souvent [rows, fields], on récupère rows
      const rows = Array.isArray(result[0]) ? result[0] : result;

      if (!rows || rows.length === 0) {
        return res.status(401).json({ success: false, message: "Identifiants incorrects" });
      }

      const driverAuth = rows[0];

      if (driverAuth.is_active === 0) {
        return res.status(403).json({ success: false, message: "Ce compte est désactivé" });
      }

      const isMatch = await bcrypt.compare(password, driverAuth.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Identifiants incorrects" });
      }

      await db.query('UPDATE driver_auth SET last_login = NOW(), is_online = 1 WHERE id = ?', [driverAuth.id]);

      const token = jwt.sign(
        { id: driverAuth.id },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      // Maintenant driverAuth.identification_no contiendra la vraie valeur grâce au JOIN
      res.json({
        success: true,
        token,
        driver: {
          id: driverAuth.id,
          identification_no: driverAuth.identification_no, 
          email: driverAuth.email,
          first_name: driverAuth.first_name,
          last_name: driverAuth.last_name,
          is_online: 1
        }
      });
    } catch (error) {
      console.error("Erreur login:", error);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
},
  // 2. INSCRIPTION (REGISTER)
// authController.js
register: async (req, res) => {
    const { first_name, last_name, email, phone, password, identification_no, usr_cre } = req.body;

    try {
        // 1. Vérifier si le matricule existe dans la table drivers (base de données de l'entreprise)
        const drivers = await db.query(
            'SELECT id FROM drivers WHERE identification_no = ?', 
            [identification_no]
        );
           console.log(identification_no)
        // Si le matricule n'existe pas, on refuse l'inscription
        if (drivers.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Le matricule est incorrect ou n'existe pas dans notre base de données." 
            });
        }

        const finalDriverId = drivers[0].id;

        // 2. Vérifier si ce chauffeur est déjà lié à un compte d'authentification existant
        const checkLink = await db.query(
            'SELECT id FROM driver_auth WHERE id_driver = ?', 
            [finalDriverId]
        );

        if (checkLink.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Un compte est déjà lié à ce matricule." 
            });
        }

        // 3. Vérifier si l'email ou le téléphone est déjà utilisé par un autre utilisateur
        const existingAuth = await db.query(
            'SELECT email, phone FROM driver_auth WHERE email = ? OR phone = ?', 
            [email, phone]
        );

        if (existingAuth.length > 0) {
            const found = existingAuth[0];
            if (found.email === email) {
                return res.status(400).json({ success: false, message: "Cet email est déjà utilisé." });
            }
            return res.status(400).json({ success: false, message: "Ce numéro de téléphone est déjà utilisé." });
        }

        // 4. Hachage du mot de passe pour la sécurité
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const creator = usr_cre || 'MOBILE_APP';

        // 5. Création du compte dans la table driver_auth avec liaison à l'ID du chauffeur
        await db.query(
            `INSERT INTO driver_auth 
            (id_driver, email, phone, first_name, last_name, password, is_active, usr_cre, dat_cre, usr_upd) 
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, NOW(), ?)`,
            [finalDriverId, email, phone, first_name, last_name, hashedPassword, creator, creator]
        );

        return res.status(201).json({
            success: true,
            message: "Compte créé avec succès !"
        });

    } catch (error) {
        console.error("Error Registration:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Erreur serveur lors de l'inscription : " + error.message 
        });
    }
},

logout: async (req, res) => {
    try {
      // req.driver.id vient du middleware 'authenticate'
      const driverId = req.driver.id;

      // Mettre à jour le statut dans la base de données
      await db.query(
        'UPDATE driver_auth SET is_online = 0 WHERE id = ?',
        [driverId]
      );

      res.json({ 
        success: true, 
        message: "Déconnecté avec succès (status offline)" 
      });
    } catch (error) {
      console.error("Erreur Logout Backend:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erreur serveur lors de la déconnexion" 
      });
    }
  },

  // 3. RÉCUPÉRER LE PROFIL
  getProfile: async (req, res) => {
    try {
      const id_driver = req.params.id;
      // Jointure si vous avez une table 'drivers' séparée, sinon simplifiez la requête
      const rows = await db.query(
        'SELECT id, email, first_name, last_name, phone, is_active, last_login FROM driver_auth WHERE id = ? LIMIT 1',
        [id_driver]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: "Profil non trouvé" });
      }

      res.json({
        success: true,
        profile: rows[0]
      });
    } catch (error) {
      console.error("Erreur Profile:", error);
      res.status(500).json({ success: false, message: "Erreur lors de la récupération du profil" });
    }
  },

  // 4. METTRE À JOUR LE PROFIL
  updateProfile: async (req, res) => {
    const { id_driver, first_name, last_name, email, phone, oldPassword, newPassword } = req.body;
    try {
      // Vérifier que le chauffeur met à jour son propre profil (sécurité)
      if (req.driver.id !== parseInt(id_driver)) {
        return res.status(403).json({ message: "Action non autorisée" });
      }

      const rows = await db.query('SELECT password FROM driver_auth WHERE id = ?', [id_driver]);
      if (rows.length === 0) return res.status(404).json({ message: "Livreur non trouvé" });

      let passwordUpdate = "";
      let params = [first_name, last_name, email, phone];

      if (newPassword && oldPassword) {
        const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
        if (!isMatch) return res.status(401).json({ message: "Ancien mot de passe incorrect" });

        const hashed = await bcrypt.hash(newPassword, 10);
        passwordUpdate = ", password = ?";
        params.push(hashed);
      }

      params.push(id_driver);

      await db.query(
        `UPDATE driver_auth SET first_name = ?, last_name = ?, email = ?, phone = ? ${passwordUpdate}, dat_upd = NOW() WHERE id = ?`,
        params
      );

      res.json({ success: true, message: "Profil mis à jour" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Erreur lors de la mise à jour" });
    }
  },
  updateAdminProfile: async (req, res) => {
  const { id } = req.admin; 
  const { first_name, last_name, email, phone, password } = req.body;

  try {
    let fields = [];
    let params = [];

    if (first_name) { fields.push("first_name = ?"); params.push(first_name); }
    if (last_name) { fields.push("last_name = ?"); params.push(last_name); }
    if (email) { fields.push("email = ?"); params.push(email); }
    if (phone) { fields.push("phone = ?"); params.push(phone); }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      fields.push("password = ?");
      params.push(hashedPassword);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Aucune donnée à modifier" });
    }

    fields.push("dat_upd = NOW()", "usr_upd = ?");
    params.push(req.admin.login, id);

    const query = `UPDATE driver_auth SET ${fields.join(", ")} WHERE id = ? AND id_driver IS NULL`;
    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Admin introuvable" });
    }

    res.json({ success: true, message: "Profil Administrateur mis à jour" });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: "Email ou téléphone déjà utilisé" });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
},
 forgotPassword: async (req, res) => {
    const { email } = req.body;
    try {
      const rows = await db.query('SELECT id, first_name FROM driver_auth WHERE email = ?', [email]);
 
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Aucun compte associé à cet email' });
      }
 
      const driver = rows[0];
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 15 * 60000); // 15 minutes
 
      await db.query('UPDATE driver_auth SET reset_code = ?, reset_code_expires = ? WHERE email = ?', [
        resetCode,
        expires,
        email,
      ]);
 
      try {
        await sendEmail({
          email: email,
          subject: 'Votre code de réinitialisation - SmartDelivery',
          message: `Bonjour ${driver.first_name},\n\nVotre code de réinitialisation de mot de passe est : ${resetCode}\nCe code expirera dans 15 minutes.\n\nSi vous n'avez pas demandé cela, ignorez cet email.`,
        });
 
        res.json({
          success: true,
          message: 'Un code de vérification a été envoyé à votre adresse email',
        });
      } catch (mailError) {
        console.error("Erreur d'envoi email:", mailError);
        return res.status(500).json({ success: false, message: "Erreur lors de l'envoi de l'email" });
      }
    } catch (error) {
      console.error('Erreur forgotPassword:', error);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
 
  // 6. RÉINITIALISATION DU MOT DE PASSE
  resetPassword: async (req, res) => {
    const { email, code, newPassword } = req.body;
 
    try {
      const rows = await db.query(
        'SELECT id FROM driver_auth WHERE email = ? AND reset_code = ? AND reset_code_expires > NOW()',
        [email, code]
      );
 
      if (rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Code invalide ou expiré' });
      }
 
      const hashedPassword = await bcrypt.hash(newPassword, 10);
 
      await db.query(
        `UPDATE driver_auth 
         SET password = ?, reset_code = NULL, reset_code_expires = NULL, dat_upd = NOW(), usr_upd = 'RECOVERY' 
         WHERE email = ?`,
        [hashedPassword, email]
      );
 
      res.json({ success: true, message: 'Votre mot de passe a été réinitialisé avec succès' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

// CHANGER LE STATUT DE DISPONIBILITÉ
 updateStatus: async (req, res) => {
    const { id, is_online } = req.body;
    try {
      await db.query('UPDATE driver_auth SET is_online = ? WHERE id = ?', [is_online, id]);
      res.json({ success: true, message: "Statut mis à jour" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  },

  

};

module.exports = AuthController;