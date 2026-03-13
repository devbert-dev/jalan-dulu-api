const { createClient } = require('@supabase/supabase-js');

// Initialize a single Supabase client reused across all routes.
// Using the service key bypasses Row Level Security — keep it server-side only.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;
