const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/Authcontroller");
const authenticate = require("../middleware/auth");

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.post("/logout", authenticate, AuthController.logout);

// Routes Protégées
router.get("/profile/:id", authenticate, AuthController.getProfile);
// Correction : l'URL doit être /update-profile pour matcher api.js
router.put("/update-profile", authenticate, AuthController.updateProfile); 
router.post('/update-status', authenticate, AuthController.updateStatus);

module.exports = router;