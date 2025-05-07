module.exports = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (Array.isArray(requiredRole)) {
      if (!requiredRole.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else {
      if (req.user.role !== requiredRole) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    next();
  };
};