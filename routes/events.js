const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, authenticateOptional } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

/**
 * GET /events
 * Returns all events (summary only — no gender slot details).
 * Public: no authentication required.
 */
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

/**
 * GET /events/:id
 * Returns a single event joined with its gender_slots row.
 *
 * Access rules:
 * - Public (no token / user role): only `total_slots` is returned from gender_slots.
 * - host or admin (valid JWT with matching role): full gender breakdown is included
 *   (male_slots, female_slots, male_filled, female_filled).
 */
router.get('/:id', authenticateOptional, async (req, res) => {
  const { id } = req.params;
  const role   = req.user?.user_metadata?.role ?? 'user';
  const isHost = role === 'host' || role === 'admin';

  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      gender_slots (
        total_slots,
        male_slots,
        female_slots,
        male_filled,
        female_filled
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return res.status(status).json({ error: error.message });
  }

  // Strip gender breakdown from the response for non-host requests
  if (!isHost && data.gender_slots) {
    data.gender_slots = {
      total_slots: data.gender_slots.total_slots,
    };
  }

  res.json(data);
});

/**
 * POST /events
 * Creates a new event and its corresponding gender_slots row.
 * Requires authentication with host or admin role.
 *
 * Expected request body:
 * {
 *   title: string,
 *   description: string,
 *   date: string (ISO 8601),
 *   location: string,
 *   male_slots: number,
 *   female_slots: number
 * }
 */
router.post('/', authenticate, requireRole('host', 'admin'), async (req, res) => {
  const { title, description, date, location, male_slots, female_slots } = req.body;
  const host_id = req.user.id;

  if (!title || !date || male_slots == null || female_slots == null) {
    return res.status(400).json({
      error: 'title, date, male_slots, and female_slots are required',
    });
  }

  const total_slots = male_slots + female_slots;

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({ title, description, date, location, host_id })
    .select()
    .single();

  if (eventError) return res.status(500).json({ error: eventError.message });

  const { data: slots, error: slotsError } = await supabase
    .from('gender_slots')
    .insert({
      event_id: event.id,
      total_slots,
      male_slots,
      female_slots,
      male_filled: 0,
      female_filled: 0,
    })
    .select()
    .single();

  if (slotsError) return res.status(500).json({ error: slotsError.message });

  res.status(201).json({ ...event, gender_slots: slots });
});

module.exports = router;
