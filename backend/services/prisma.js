const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Internal storage for the current tenant context
prisma._currentTenant = null;

// Function to set the tenant ID for the current request context
prisma.setTenant = function(tenantId) {
  this._currentTenant = tenantId;
};

// Middleware to enforce tenant isolation on queries
prisma.$use(async (params, next) => {
  const { model, action, args } = params;

  // Skip isolation for the Tenant model itself
  if (!prisma._currentTenant || model === 'Tenant') {
    return next(params);
  }

  // For read operations, automatically filter by tenantId
  const readActions = ['findUnique', 'findFirst', 'findMany', 'count'];
  if (readActions.includes(action)) {
    if (!args.where) {
      args.where = {};
    }
    if (args.where.tenantId === undefined) {
      args.where.tenantId = prisma._currentTenant;
    }
  }

  // For create operations, inject tenantId into new records
  const createActions = ['create', 'createMany'];
  if (createActions.includes(action) && args.data) {
    args.data.tenantId = prisma._currentTenant;
  }

  // For update and delete, ensure tenantId filter is applied
  const writeActions = ['update', 'updateMany', 'upsert', 'delete', 'deleteMany'];
  if (writeActions.includes(action)) {
    if (args.where && args.where.tenantId === undefined) {
      args.where.tenantId = prisma._currentTenant;
    }
  }

  return next(params);
});

module.exports = prisma; 