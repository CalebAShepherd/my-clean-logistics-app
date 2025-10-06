const express = require('express');
const opt = require('../services/optimizerClient');

const router = express.Router();

// POST /api/operations/pickpaths/solve
router.post('/pickpaths/solve', async (req, res) => {
  try {
    const result = await opt.solvePickPaths(req.body);
    res.json(result);
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message, detail: e.data });
  }
});

// POST /api/operations/pickpaths/solve-from-skus
router.post('/pickpaths/solve-from-skus', async (req, res) => {
  try {
    const result = await opt.solvePickPathsFromSkus(req.body);
    res.json(result);
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message, detail: e.data });
  }
});

// POST /api/operations/assignments/solve
router.post('/assignments/solve', async (req, res) => {
  try {
    const result = await opt.solveAssignments(req.body);
    res.json(result);
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message, detail: e.data });
  }
});

// POST /api/operations/slotting/solve
router.post('/slotting/solve', async (req, res) => {
  try {
    const result = await opt.solveSlotting(req.body);
    res.json(result);
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message, detail: e.data });
  }
});

// POST /api/operations/dockyard/plan
router.post('/dockyard/plan', async (req, res) => {
  try {
    const result = await opt.planDockYard(req.body);
    res.json(result);
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message, detail: e.data });
  }
});

module.exports = router;
