const express  = require('express');
const router   = express.Router();
const supabase = require('../lib/supabase');
const { authenticate }  = require('../middleware/auth');
const { requireRole }   = require('../middleware/requireRole');

// All admin routes require authentication + admin role
router.use(authenticate, requireRole('admin'));

/**
 * GET /admin/users
 * Returns all users with their role, name, email, and join date.
 */
router.get('/users', async (req, res) => {
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) return res.status(500).json({ error: error.message });

  const users = data.users.map(u => ({
    id:         u.id,
    email:      u.email,
    full_name:  u.user_metadata?.full_name ?? '',
    role:       u.user_metadata?.role ?? 'user',
    created_at: u.created_at,
  }));

  res.json(users);
});

/**
 * PATCH /admin/users/:id/role
 * Changes a user's role. Body: { role: 'user' | 'host' | 'admin' }
 */
router.patch('/users/:id/role', async (req, res) => {
  const { id }   = req.params;
  const { role } = req.body;

  const VALID_ROLES = ['user', 'host', 'admin'];
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
  }

  if (id === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'Admins cannot remove their own admin role.' });
  }

  const { data, error } = await supabase.auth.admin.updateUserById(id, {
    user_metadata: { role },
  });

  if (error) return res.status(500).json({ error: error.message });

  // Keep profiles table in sync
  await supabase.from('profiles').update({ role }).eq('id', id);

  res.json({
    id:    data.user.id,
    email: data.user.email,
    role:  data.user.user_metadata?.role,
  });
});

/**
 * DELETE /admin/users/:id
 * Permanently deletes a user. Cascade deletes their profile row.
 */
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'Admins cannot delete their own account.' });
  }

  const { error } = await supabase.auth.admin.deleteUser(id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: 'User deleted.' });
});

module.exports = router;
