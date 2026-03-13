const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

/**
 * POST /bookings
 * Creates a booking for an event after checking the gender quota.
 *
 * Flow:
 * 1. Fetch the gender_slots row for the event.
 * 2. Check that the attendee's gender still has available slots.
 * 3. Insert the booking record.
 * 4. Increment the appropriate filled counter (male_filled or female_filled).
 *
 * Expected request body:
 * {
 *   event_id: string (UUID),
 *   user_id: string (UUID),
 *   gender: 'male' | 'female',
 *   name: string,
 *   email: string
 * }
 *
 * NOTE: Steps 3–4 are not atomic here. For high-concurrency scenarios,
 * replace with a Supabase database function (RPC) that runs inside a
 * transaction to prevent race conditions on the quota check.
 */
router.post('/', async (req, res) => {
  const { event_id, user_id, gender, name, email } = req.body;

  // Validate required fields
  if (!event_id || !gender || !name || !email) {
    return res.status(400).json({
      error: 'event_id, gender, name, and email are required',
    });
  }

  if (!['male', 'female'].includes(gender)) {
    return res.status(400).json({ error: 'gender must be "male" or "female"' });
  }

  // --- Step 1: Fetch current slot counts for this event ---
  const { data: slots, error: slotsError } = await supabase
    .from('gender_slots')
    .select('id, male_slots, female_slots, male_filled, female_filled')
    .eq('event_id', event_id)
    .single();

  if (slotsError) {
    const status = slotsError.code === 'PGRST116' ? 404 : 500;
    return res.status(status).json({ error: 'Event not found or slots unavailable' });
  }

  // --- Step 2: Check quota for the attendee's gender ---
  const filledKey = gender === 'male' ? 'male_filled' : 'female_filled';
  const totalKey  = gender === 'male' ? 'male_slots'  : 'female_slots';

  if (slots[filledKey] >= slots[totalKey]) {
    return res.status(409).json({
      error: `No ${gender} slots remaining for this event`,
    });
  }

  // --- Step 3: Create the booking record ---
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({ event_id, user_id, gender, name, email, status: 'confirmed' })
    .select()
    .single();

  if (bookingError) return res.status(500).json({ error: bookingError.message });

  // --- Step 4: Increment the filled counter for the attendee's gender ---
  const { error: updateError } = await supabase
    .from('gender_slots')
    .update({ [filledKey]: slots[filledKey] + 1 })
    .eq('id', slots.id);

  if (updateError) {
    // Booking was inserted but counter failed — log for manual reconciliation
    console.error('Counter update failed for booking:', booking.id, updateError.message);
    return res.status(500).json({
      error: 'Booking created but slot counter could not be updated. Please contact support.',
    });
  }

  res.status(201).json(booking);
});

module.exports = router;
