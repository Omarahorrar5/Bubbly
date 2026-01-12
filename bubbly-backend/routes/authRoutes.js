const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Login
router.post('/login', AuthController.login);

// Logout
router.post('/logout', AuthController.logout);

// Get current user
router.get('/me', AuthController.getCurrentUser);

module.exports = router;