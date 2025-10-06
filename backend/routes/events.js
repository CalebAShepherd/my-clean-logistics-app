const express = require('express');
const router = express.Router();

// Checklist events and task timing from mobile app
// POST /api/events/checklist
router.post('/checklist', async (req, res) => {
  // TODO: persist in DB and publish to twin/stream if needed
  res.status(204).end();
});

// POST /api/events/tasks/:id/state
router.post('/tasks/:id/state', async (req, res) => {
  // TODO: persist state/audit trail and notify twin
  res.status(204).end();
});

module.exports = router;
