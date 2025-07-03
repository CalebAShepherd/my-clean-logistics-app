const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const accountController = require('../controllers/accountController');

router.get('/', requireAuth, accountController.listAccounts);
router.get('/:id', requireAuth, accountController.getAccount);
router.post('/', requireAuth, requireRole('crm_admin'), accountController.createAccount);
router.put('/:id', requireAuth, requireRole('crm_admin'), accountController.updateAccount);
router.delete('/:id', requireAuth, requireRole('crm_admin'), accountController.deleteAccount);

module.exports = router; 