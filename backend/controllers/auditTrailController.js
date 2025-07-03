const prisma = require('../services/prisma');

// Get audit logs with basic filtering and pagination
exports.getAuditLogs = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      entityType,
      entityId,
      action,
      performedBy,
      startDate,
      endDate,
      category,
      page = 1,
      limit = 20,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    if (performedBy) where.performedBy = performedBy;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: { select: { id: true, username: true, email: true } }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// Create a new audit log entry (can be called by other controllers)
exports.createAuditLog = async (req, res) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { entityType, entityId, action, changes, category } = req.body;

    if (!entityType || !entityId || !action) {
      return res.status(400).json({ error: 'entityType, entityId and action are required' });
    }

    const log = await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        changes,
        category,
        performedBy: userId,
        tenantId
      },
      include: {
        user: { select: { id: true, username: true, email: true } }
      }
    });

    res.status(201).json(log);
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
}; 