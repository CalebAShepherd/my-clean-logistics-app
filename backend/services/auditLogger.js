const prisma = require('./prisma');

/**
 * Write an audit‐trail entry. Call this inside controllers or services.
 * The function intentionally never throws – if auditing fails we just log an error
 * so it never blocks the main business transaction.
 *
 * @param {Object} req – Express request (with req.user injected by requireAuth)
 * @param {string} entityType – e.g. "Shipment", "Invoice", "User"
 * @param {string} entityId – the primary key of the entity affected
 * @param {"CREATE"|"UPDATE"|"DELETE"|"LOGIN"|"LOGOUT"} action
 * @param {Object|null} changes – optional diff / payload
 * @param {string|null} category - e.g. "CRM", "WAREHOUSE", "FINANCIAL"
 */
async function logAudit(req, entityType, entityId, action, changes = null, category = null) {
  try {
    // If audit trail is disabled for this tenant, skip (optional – can be expanded)
    if (!req?.user) return;

    const { id: performedBy, tenantId } = req.user;

    await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        changes,
        performedBy,
        tenantId,
        category,
      }
    });
  } catch (err) {
    // Never crash the request because of audit failure
    console.error('Audit logging failed:', err);
  }
}

module.exports = logAudit; 