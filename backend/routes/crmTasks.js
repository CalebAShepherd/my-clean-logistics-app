const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const taskController = require('../controllers/taskController');

router.get('/', requireAuth, taskController.listTasks);
router.get('/:id', requireAuth, taskController.getTask);
router.post('/', requireAuth, taskController.createTask);
router.put('/:id', requireAuth, taskController.updateTask);
router.delete('/:id', requireAuth, taskController.deleteTask);

module.exports = router; 