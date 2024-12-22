// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Register
router.post("/register", authController.register);

// Verify Email
router.get("/api/verify-email", authController.verifyEmail);

// Login
router.post("/login", authController.login);

// Request Password Reset
router.post("/request-password-reset", authController.requestPasswordReset);

// Reset Password
router.post("/api/reset-password", authController.resetPassword);

// Get user role
router.get("/api/get-role/:userID", authController.getUserRole);

module.exports = router;
