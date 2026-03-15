/**
 * Role guard middleware factory.
 * Usage: router.post('/', authenticate, requireRole('host', 'admin'), handler)
 *
 * Reads req.user (set by authenticate middleware).
 * Responds 403 if the user's role is not in the allowed list.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.user_metadata?.role ?? 'user';

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      });
    }

    next();
  };
}

module.exports = { requireRole };
