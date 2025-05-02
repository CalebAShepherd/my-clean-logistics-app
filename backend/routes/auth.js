const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Signup route - create a new user account
router.post('/signup', authController.signup);

// Login route - authenticate and return a JWT
router.post('/login', authController.login);

module.exports = router;
