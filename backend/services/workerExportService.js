const prisma = require('./prisma');

// Best-effort worker export. Tries to read from Prisma; falls back gracefully.
async function exportWorkers() {
  try {
    // Try common shape
    let users = await prisma.user.findMany();
    return users.map((u) => ({
      id: u.id,
      name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || String(u.id),
      email: u.email || null,
      role: u.role || u.userRole || 'WORKER',
      performance_score: u.performanceScore || u.performance_score || null,
      shift: u.shift || null,
      skills: u.skills || [],
      active: u.active !== false,
    }));
  } catch (e) {
    // If prisma.user is not available, return empty set; caller may provide payload manually.
    return [];
  }
}

module.exports = { exportWorkers };
