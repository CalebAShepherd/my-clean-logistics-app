const express = require('express');
const opt = require('../services/optimizerClient');
const { exportWorkers } = require('../services/workerExportService');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// Health proxy to optimizer
router.get('/health', async (_req, res) => {
  try {
    const h = await opt.health();
    res.json({ ok: true, optimizer: h });
  } catch (e) {
    res.status(e.status || 502).json({ ok: false, error: e.message });
  }
});

// Sync workers to optimizer
router.post('/workers/sync', async (req, res) => {
  try {
    const workers = req.body?.workers || (await exportWorkers());
    const result = await opt.syncWorkers({ workers });
    res.json({ synced: workers.length, result });
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message, detail: e.data });
  }
});

// Pull tasks planned by optimizer for this warehouse
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await opt.getTasks(req.query);
    res.json(tasks);
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message, detail: e.data });
  }
});

// Accept a task for a worker
router.post('/tasks/accept', async (req, res) => {
  try {
    const result = await opt.acceptTask(req.body);
    res.json(result);
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message, detail: e.data });
  }
});

// Mark task complete
router.post('/tasks/complete', async (req, res) => {
  try {
    const result = await opt.completeTask(req.body);
    res.json(result);
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message, detail: e.data });
  }
});

module.exports = router;
