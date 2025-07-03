const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const ticketController = require('../controllers/ticketController');

router.get('/', requireAuth, ticketController.listTickets);
router.get('/:id', requireAuth, ticketController.getTicket);
router.post('/', requireAuth, ticketController.createTicket);
router.put('/:id', requireAuth, ticketController.updateTicket);
router.delete('/:id', requireAuth, ticketController.deleteTicket);

module.exports = router; 