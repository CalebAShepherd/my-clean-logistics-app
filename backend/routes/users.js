const express = require('express');
const router = express.Router();
const requireAuth   = require('../middleware/requireAuth');
const requireRole   = require('../middleware/requireRole');
const userController= require('../controllers/userController');

// later you'll add actual handlers here

// Route for listing all users (admin only)
router.get(
    '/',
    requireAuth,
    requireRole('admin'),
    userController.listUsers
);

// Route to get current authenticated user's profile
router.get(
    '/me',
    requireAuth,
    userController.getCurrentUser
);

// Route to update current authenticated user's profile
router.put(
    '/me',
    requireAuth,
    userController.updateProfile
);

// Route to change current authenticated user's password
router.put(
    '/me/password',
    requireAuth,
    userController.changePassword
);

router.put(
    '/:id/role',
    requireAuth,
    requireRole('admin'),
    userController.changeRole
);

// Assign warehouse to a warehouse_admin user
router.put(
    '/:id/warehouse',
    requireAuth,
    requireRole('admin'),
    userController.assignWarehouse
);

// CRUD endpoints for drivers (admin & dispatcher)
router.get(
  '/:id',
  requireAuth,
  requireRole(['admin','dispatcher']),
  userController.getUserById
);
router.post(
  '/',
  requireAuth,
  requireRole(['admin','dispatcher']),
  userController.createUser
);
router.put(
  '/:id',
  requireAuth,
  requireRole(['admin','dispatcher']),
  userController.updateUserById
);
router.delete(
  '/:id',
  requireAuth,
  requireRole(['admin','dispatcher']),
  userController.deleteUserById
);

module.exports = router;