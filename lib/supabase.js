const { createClient } = require('@supabase/supabase-js');

// Initialize a single Supabase client reused across all routes.
// Using the service key bypasses Row Level Security — keep it server-side only.
// autoRefreshToken/persistSession must be false on the server so the client
// always sends the service role key as the Bearer token (required for auth.admin.*).
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = supabase;
