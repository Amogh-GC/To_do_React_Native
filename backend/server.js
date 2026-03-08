/**
 * backend/server.js
 *
 * Entry point — wires together Express, MongoDB, and all routes.
 *
 * Start:       node server.js
 * Development: npx nodemon server.js  (or npm run dev after npm install)
 */

'use strict';

const path    = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const morgan    = require('morgan');

// ─── Route modules ────────────────────────────────────────────────────────────
const authRoutes  = require('./routes/auth');
const taskRoutes  = require('./routes/tasks');

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',            // Tighten this in production to your mobile app's origin / hostname
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/tasks', taskRoutes);

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', uptime: process.uptime() }),
);

// 404 fallback
app.use((_req, res) =>
  res.status(404).json({ success: false, error: 'Route not found' }),
);

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  const status  = err.statusCode || 500;
  const message = err.message    || 'Internal server error';
  res.status(status).json({ success: false, error: message });
});

// ─── Database + listen ────────────────────────────────────────────────────────
const PORT      = parseInt(process.env.PORT || '5000', 10);
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('FATAL: MONGO_URI is not defined. Copy .env.example → .env and fill it in.');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`✅  MongoDB connected: ${mongoose.connection.host}`);
    app.listen(PORT, () =>
      console.log(`🚀  API listening on http://localhost:${PORT}`),
    );
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
