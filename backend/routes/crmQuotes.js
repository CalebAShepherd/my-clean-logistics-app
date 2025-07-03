const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const quoteController = require('../controllers/quoteController');

router.get('/', requireAuth, quoteController.listQuotes);
router.get('/:id', requireAuth, quoteController.getQuote);
router.post('/', requireAuth, quoteController.createQuote);
router.put('/:id', requireAuth, quoteController.updateQuote);
router.delete('/:id', requireAuth, quoteController.deleteQuote);

module.exports = router; 