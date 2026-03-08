/**
 * backend/models/User.js
 *
 * Mongoose schema for app users.
 *
 * Passwords are hashed with bcryptjs before saving (pre-save hook).
 * The `comparePassword` instance method is used during login.
 */

'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

// ─── Schema ───────────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Name is required'],
      trim:      true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },

    email: {
      type:     String,
      required: [true, 'Email is required'],
      unique:   true,
      trim:     true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please enter a valid email address',
      ],
    },

    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select:    false, // never returned by default
    },

    createdAt: {
      type:    Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Hash password whenever it is modified (create or update). */
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt  = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance methods ─────────────────────────────────────────────────────────

/**
 * comparePassword — safely compares a plain-text candidate with the stored hash.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * signJwt — generates a signed JWT for this user.
 * @returns {string} Bearer token
 */
UserSchema.methods.signJwt = function () {
  return jwt.sign(
    { id: this._id, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' },
  );
};

// ─── Helper: safe user object (no password) ───────────────────────────────────
UserSchema.methods.toPublic = function () {
  return {
    id:        this._id,
    name:      this.name,
    email:     this.email,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', UserSchema);
