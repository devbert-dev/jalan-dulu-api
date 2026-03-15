require('dotenv').config();
const express = require('express');
const cors = require('cors');

const eventsRouter   = require('./routes/events');
const bookingsRouter = require('./routes/bookings');
const authRouter     = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for all origins — adjust origin in production
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Mount route handlers
app.use('/auth',     authRouter);
app.use('/events',   eventsRouter);
app.use('/bookings', bookingsRouter);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Jalan Dulu API is running' });
});

app.listen(PORT, () => {
  console.log(`Jalan Dulu API listening on port ${PORT}`);
});
