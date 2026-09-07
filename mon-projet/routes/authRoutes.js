const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/Authcontroller");
const authenticate = require("../middleware/auth");

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.post("/logout", authenticate, AuthController.logout);

router.get("/profile/:id", authenticate, AuthController.getProfile);
router.put("/update-profile", authenticate, AuthController.updateProfile);
router.post("/update-status", authenticate, AuthController.updateStatus);


module.exports = router;