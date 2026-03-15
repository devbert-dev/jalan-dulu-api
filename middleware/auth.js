const supabase = require('../lib/supabase');

/**
 * Verifies the Authorization: Bearer <token> header.
 * On success, attaches the full Supabase user object to req.user.
 * On failure, returns 401 immediately.
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  req.user = data.user;
  next();
}

/**
 * Like authenticate, but does not reject if no token is present.
 * Sets req.user = null if unauthenticated.
 * Use on public routes that reveal more data to authenticated hosts/admins.
 */
async function authenticateOptional(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  const { data, error } = await supabase.auth.getUser(token);
  req.user = (!error && data?.user) ? data.user : null;
  next();
}

module.exports = { authenticate, authenticateOptional };
