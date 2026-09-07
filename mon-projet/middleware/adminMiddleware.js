const jwt = require("jsonwebtoken");
const db = require("../config/database");

const adminAuth = async (req, res, next) => {
  try {
    // 1. Récupération du token
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ success: false, message: "Token requis" });
    }

    // 2. Vérification du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Requête sur la table driver_auth (basée sur votre describe)
    const query = `
      SELECT id, email, first_name, last_name, role, is_active 
      FROM driver_auth 
      WHERE id = ? LIMIT 1
    `;
    
    const [rows] = await db.query(query, [decoded.id]);
    
    // Gestion du résultat (dépend de si votre driver DB renvoie un tableau ou un objet)
    const user = Array.isArray(rows) ? rows[0] : rows;

    // 4. Vérification si l'utilisateur existe
    if (!user) {
      return res.status(401).json({ success: false, message: "Admin introuvable dans driver_auth" });
    }

    // 5. Vérification du rôle (doit être 'admin' d'après votre ENUM)
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Accès interdit : Votre rôle n'est pas administrateur" 
      });
    }

    // 6. Vérification si le compte est actif (optionnel mais conseillé)
    if (user.is_active === 0) {
      return res.status(403).json({ success: false, message: "Compte administrateur désactivé" });
    }

    // 7. On attache l'admin à la requête et on passe au controller
    req.admin = user; 
    next();

  } catch (error) {
    console.error("Erreur Middleware Auth:", error.message);
    return res.status(401).json({ 
      success: false, 
      message: "Session expirée ou token invalide" 
    });
  }
};

module.exports = adminAuth;