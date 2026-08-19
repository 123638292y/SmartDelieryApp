const jwt = require("jsonwebtoken");
const db = require("../config/database");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ success: false, message: "Token requis" });
    }

    // --- EL TASLI7A HONI ---
    // Nesta3mlou nafss el variable mta3 el .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const rows = await db.query(
      "SELECT id, email, is_active FROM driver_auth WHERE id = ? LIMIT 1",
      [decoded.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: "Utilisateur introuvable" });
    }

    req.driver = rows[0];
    next();
  } catch (error) {
    console.log("❌ JWT Verification Error:", error.message);
    res.status(401).json({ success: false, message: "Token invalide ou expiré" });
  }
};

module.exports = authenticate;