/**
 * backend/middleware/auth.js
 *
 * Verifies the JWT sent in the `Authorization: Bearer <token>` header.
 * Attaches the decoded payload to `req.user` for downstream route handlers.
 */

'use strict';

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect — guards any route that requires a valid session.
 * Usage:  router.get('/me', protect, (req, res) => { ... req.user ... });
 */
const protect = async (req, res, next) => {
  try {
    let token;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authorised — no token' });
    }

    // Verify signature & expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach current user (exclude password)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'User belonging to this token no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError' ? 'Token expired — please log in again' :
      err.name === 'JsonWebTokenError' ? 'Invalid token'                        :
      'Authentication failed';
    return res.status(401).json({ success: false, error: message });
  }
};

module.exports = { protect };
