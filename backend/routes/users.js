const express = require('express');
const router = express.Router();
const requireAuth   = require('../middleware/requireAuth');
const requireRole   = require('../middleware/requireRole');
const userController= require('../controllers/userController');

// later you’ll add actual handlers here

// Only admins may promote/demote users
router.get(
    '/',
    requireAuth,
    requireRole('admin'),
    userController.listUsers
);

router.put(
    '/:id/role',
    requireAuth,
    requireRole('admin'),
    userController.changeRole
);

module.exports = router;