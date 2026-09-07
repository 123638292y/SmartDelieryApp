const jwt = require("jsonwebtoken");
const db = require("../config/database");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ success: false, message: "Token requis" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ تحسين: نجيبو الدور مع البيانات
    const rows = await db.query(
      "SELECT id, email, is_active, role FROM driver_auth WHERE id = ? LIMIT 1",
      [decoded.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: "Utilisateur introuvable" });
    }

    const driver = rows[0];

    // ✅ تحقق من الحساب مفعل
    if (driver.is_active === 0) {
      return res.status(403).json({ success: false, message: "Compte désactivé" });
    }

    req.driver = driver; // الآن فيه id, email, is_active, role
    next();
  } catch (error) {
    console.log("❌ JWT Verification Error:", error.message);
    res.status(401).json({ success: false, message: "Token invalide ou expiré" });
  }
};

module.exports = authenticate;