/**
 * backend/models/Task.js
 *
 * Mongoose schema for a task.
 * Mirrors the shape used in the React Native client (task.types.ts).
 *
 * Schema fields:
 *  userId      — owner (ref User)
 *  title       — required, max 120 chars
 *  description — optional long-form text
 *  priority    — 'high' | 'medium' | 'low'  (default 'medium')
 *  status      — 'pending' | 'completed'    (default 'pending')
 *  dateTime    — scheduled start (optional ISO string)
 *  deadline    — due date (optional ISO string)
 *  tags        — string array, max 10 items each ≤ 30 chars
 *  completedAt — set automatically when status → 'completed'
 *  createdAt / updatedAt — managed by Mongoose timestamps option
 */

'use strict';

const mongoose = require('mongoose');

// ─── Schema ───────────────────────────────────────────────────────────────────
const TaskSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    title: {
      type:      String,
      required:  [true, 'Task title is required'],
      trim:      true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },

    description: {
      type:    String,
      trim:    true,
      default: '',
    },

    priority: {
      type:    String,
      enum:    { values: ['high', 'medium', 'low'], message: 'Priority must be high, medium, or low' },
      default: 'medium',
    },

    status: {
      type:    String,
      enum:    { values: ['pending', 'completed'], message: 'Status must be pending or completed' },
      default: 'pending',
    },

    /** ISO date-time string for scheduled execution (optional) */
    dateTime: {
      type:    String,
      default: null,
    },

    /** ISO date string for the deadline (optional) */
    deadline: {
      type:    String,
      default: null,
    },

    tags: {
      type:     [String],
      default:  [],
      validate: {
        validator: (arr) => arr.length <= 10 && arr.every((t) => t.length <= 30),
        message:   'Max 10 tags, each up to 30 characters',
      },
    },

    completedAt: {
      type:    Date,
      default: null,
    },
  },
  {
    timestamps:  true,    // adds createdAt + updatedAt
    versionKey:  false,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Compound index — most list queries filter by userId + status/priority
TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, priority: 1 });
TaskSchema.index({ userId: 1, deadline: 1 });

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Auto-set completedAt when a task is marked completed. */
TaskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.completedAt = this.status === 'completed' ? new Date() : null;
  }
  next();
});

/** Same for findOneAndUpdate / updateOne operations. */
TaskSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && update.status === 'completed') {
    this.set({ completedAt: new Date() });
  } else if (update && update.status === 'pending') {
    this.set({ completedAt: null });
  }
  next();
});

module.exports = mongoose.model('Task', TaskSchema);
