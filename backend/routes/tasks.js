/**
 * backend/routes/tasks.js
 *
 * All routes are protected — a valid JWT is required.
 *
 *  GET    /api/tasks                — list tasks (filter/sort via query params)
 *  POST   /api/tasks                — create a task
 *  GET    /api/tasks/:id            — get a single task
 *  PUT    /api/tasks/:id            — full update
 *  PATCH  /api/tasks/:id            — partial update (any subset of fields)
 *  PATCH  /api/tasks/:id/toggle     — toggle completed ↔ pending
 *  DELETE /api/tasks/:id            — delete a task
 *
 * Query params for GET /api/tasks:
 *  status    — 'pending' | 'completed'
 *  priority  — 'high' | 'medium' | 'low'
 *  sortBy    — 'createdAt' | 'deadline' | 'priority' | 'title'   (default: createdAt)
 *  order     — 'asc' | 'desc'                                     (default: desc)
 *  search    — full-text substring match on title/description
 *  page      — page number (default: 1)
 *  limit     — items per page (default: 50, max: 100)
 */

'use strict';

const express  = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Task     = require('../models/Task');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All task routes require authentication
router.use(protect);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const checkValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
};

/** Assert that the requested task exists and belongs to the current user. */
const ownedTask = async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
  if (!task) {
    res.status(404).json({ success: false, error: 'Task not found' });
    return null;
  }
  return task;
};

// ─── GET /api/tasks ───────────────────────────────────────────────────────────
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['pending', 'completed']),
    query('priority').optional().isIn(['high', 'medium', 'low']),
    query('sortBy').optional().isIn(['createdAt', 'deadline', 'priority', 'title']),
    query('order').optional().isIn(['asc', 'desc']),
  ],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    try {
      const {
        status, priority, sortBy = 'createdAt', order = 'desc',
        search, page = 1, limit = 50,
      } = req.query;

      // Build filter
      const filter = { userId: req.user._id };
      if (status)   filter.status   = status;
      if (priority) filter.priority = priority;
      if (search) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ title: regex }, { description: regex }];
      }

      const sortOrder = order === 'asc' ? 1 : -1;

      const [tasks, total] = await Promise.all([
        Task.find(filter)
          .sort({ [sortBy]: sortOrder, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Task.countDocuments(filter),
      ]);

      return res.json({
        success: true,
        data: tasks,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ─── POST /api/tasks ──────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 120 }),
    body('description').optional().isString(),
    body('priority').optional().isIn(['high', 'medium', 'low']),
    body('status').optional().isIn(['pending', 'completed']),
    body('deadline').optional().isISO8601().withMessage('deadline must be an ISO date string'),
    body('dateTime').optional().isISO8601().withMessage('dateTime must be an ISO date string'),
    body('tags').optional().isArray({ max: 10 }).withMessage('Max 10 tags'),
    body('tags.*').optional().isString().isLength({ max: 30 }),
  ],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    try {
      const { title, description, priority, status, deadline, dateTime, tags } = req.body;

      const task = await Task.create({
        userId:      req.user._id,
        title,
        description: description || '',
        priority:    priority    || 'medium',
        status:      status      || 'pending',
        deadline:    deadline    || null,
        dateTime:    dateTime    || null,
        tags:        tags        || [],
      });

      return res.status(201).json({ success: true, data: task });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ─── GET /api/tasks/:id ───────────────────────────────────────────────────────
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid task ID')],
  async (req, res) => {
    if (checkValidation(req, res)) return;
    const task = await ownedTask(req, res);
    if (!task) return;
    return res.json({ success: true, data: task });
  },
);

// ─── PUT /api/tasks/:id ───────────────────────────────────────────────────────
/** Full update — replaces all mutable fields. */
router.put(
  '/:id',
  [
    param('id').isMongoId(),
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 120 }),
    body('description').optional().isString(),
    body('priority').optional().isIn(['high', 'medium', 'low']),
    body('status').optional().isIn(['pending', 'completed']),
    body('deadline').optional({ nullable: true }).isISO8601(),
    body('dateTime').optional({ nullable: true }).isISO8601(),
    body('tags').optional().isArray({ max: 10 }),
    body('tags.*').optional().isString().isLength({ max: 30 }),
  ],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    try {
      const task = await ownedTask(req, res);
      if (!task) return;

      const { title, description, priority, status, deadline, dateTime, tags } = req.body;

      Object.assign(task, {
        title,
        description: description ?? task.description,
        priority:    priority    ?? task.priority,
        status:      status      ?? task.status,
        deadline:    deadline    ?? task.deadline,
        dateTime:    dateTime    ?? task.dateTime,
        tags:        tags        ?? task.tags,
      });

      await task.save();

      return res.json({ success: true, data: task });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────
/** Partial update — only the fields sent in the body are changed. */
router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('title').optional().trim().notEmpty().isLength({ max: 120 }),
    body('description').optional().isString(),
    body('priority').optional().isIn(['high', 'medium', 'low']),
    body('status').optional().isIn(['pending', 'completed']),
    body('deadline').optional({ nullable: true }).isISO8601(),
    body('dateTime').optional({ nullable: true }).isISO8601(),
    body('tags').optional().isArray({ max: 10 }),
    body('tags.*').optional().isString().isLength({ max: 30 }),
  ],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    try {
      const task = await ownedTask(req, res);
      if (!task) return;

      // Apply only the provided fields
      const allowed = ['title', 'description', 'priority', 'status', 'deadline', 'dateTime', 'tags'];
      for (const field of allowed) {
        if (req.body[field] !== undefined) task[field] = req.body[field];
      }

      await task.save();

      return res.json({ success: true, data: task });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ─── PATCH /api/tasks/:id/toggle ─────────────────────────────────────────────
/** Toggle status between 'pending' and 'completed'. */
router.patch(
  '/:id/toggle',
  [param('id').isMongoId()],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    try {
      const task = await ownedTask(req, res);
      if (!task) return;

      task.status = task.status === 'completed' ? 'pending' : 'completed';
      await task.save();

      return res.json({ success: true, data: task });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────
router.delete(
  '/:id',
  [param('id').isMongoId()],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    try {
      const task = await ownedTask(req, res);
      if (!task) return;

      await task.deleteOne();

      return res.json({ success: true, data: {} });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
);

module.exports = router;
