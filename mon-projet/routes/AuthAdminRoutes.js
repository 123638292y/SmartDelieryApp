const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/Authcontroller");
const adminAuth = require('../middleware/adminMiddleware');

router.post("/login", AuthController.adminLogin);
router.put("/update-profile", adminAuth, AuthController.updateAdminProfile);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);

module.exports = router;