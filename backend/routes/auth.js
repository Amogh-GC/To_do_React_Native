/**
 * backend/routes/auth.js
 *
 * Authentication routes:
 *  POST   /api/auth/register   — create account
 *  POST   /api/auth/login      — sign in, receive JWT
 *  GET    /api/auth/me         — get current user (protected)
 *  PUT    /api/auth/me         — update name / password (protected)
 */

'use strict';

const express  = require('express');
const { body, validationResult } = require('express-validator');
const User     = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Throw 400 with validation messages if express-validator found errors. */
const checkValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
};

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    try {
      const { name, email, password } = req.body;

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Email already in use' });
      }

      const user  = await User.create({ name, email, password });
      const token = user.signJwt();

      return res.status(201).json({
        success: true,
        token,
        user: user.toPublic(),
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    try {
      const { email, password } = req.body;

      // Explicitly select password — it has `select: false` in the schema
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const match = await user.comparePassword(password);
      if (!match) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const token = user.signJwt();

      return res.json({
        success: true,
        token,
        user: user.toPublic(),
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  return res.json({ success: true, user: req.user.toPublic() });
});

// ─── PUT /api/auth/me ─────────────────────────────────────────────────────────
router.put(
  '/me',
  protect,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    try {
      const user = await User.findById(req.user._id).select('+password');
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const { name, password } = req.body;
      if (name)     user.name     = name;
      if (password) user.password = password; // hashed by pre-save hook

      await user.save();

      return res.json({ success: true, user: user.toPublic() });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
);

module.exports = router;
