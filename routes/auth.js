const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

/**
 * POST /auth/register
 * Creates a new user in Supabase Auth and returns a session token.
 *
 * Body: { email: string, password: string }
 * Uses admin.createUser with email_confirm: true so users can log in
 * immediately without an email verification step.
 */
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Create user via admin API — auto-confirms email, no verification email sent
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    // Supabase returns "User already registered" for duplicate emails
    return res.status(400).json({ error: createError.message });
  }

  // Sign in immediately to issue a JWT session for the new user
  const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return res.status(500).json({ error: signInError.message });
  }

  res.status(201).json({
    user:  session.user,
    token: session.session.access_token,
  });
});

/**
 * POST /auth/login
 * Authenticates an existing user and returns a session token.
 *
 * Body: { email: string, password: string }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  res.json({
    user:  data.user,
    token: data.session.access_token,
  });
});

module.exports = router;
