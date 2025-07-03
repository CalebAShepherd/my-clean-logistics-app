const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listTasks = async (req, res) => {
  try {
    const { tenantId } = req.user || {};
    const tasks = await prisma.task.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { dueDate: 'asc' },
    });
    res.json(tasks);
  } catch (err) {
    console.error('Error listing tasks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getTask = async (req, res) => {
  const { id } = req.params;
  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    console.error('Error getting task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createTask = async (req, res) => {
  const { title, description, dueDate, assigneeId, accountId } = req.body;
  try {
    const { tenantId } = req.user || {};
    const task = await prisma.task.create({
      data: { title, description, dueDate, assigneeId, accountId, tenantId },
    });
    res.status(201).json(task);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, description, dueDate, completed, assigneeId } = req.body;
  try {
    const task = await prisma.task.update({
      where: { id },
      data: { title, description, dueDate, completed, assigneeId },
    });
    res.json(task);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteTask = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.task.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 