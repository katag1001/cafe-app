const jwt = require('jsonwebtoken')

// No fallback value on purpose — signing tokens with a known default secret
// would let anyone forge a valid session. Fail loudly instead.
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required.')
}

// Admin membership is re-derived from the live env var on every call, never
// cached on a token claim or a stored role field, so revoking access is just
// an env var change + redeploy with immediate effect.
const isAdminEmail = (email) => {
  const adminEmails = String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  return adminEmails.includes(String(email || '').trim().toLowerCase())
}

const requireAuth = (req, res, next) => {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    })
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    return next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session.',
    })
  }
}

// Populates req.user if a valid session cookie is present, but never rejects
// the request — used on otherwise-public routes that still need to know
// "is this the cafe's own creator" (e.g. viewing/editing a pending cafe).
const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token

  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      // Invalid/expired token on an optional route just means "anonymous".
    }
  }

  return next()
}

const requireAdmin = (req, res, next) => {
  if (!isAdminEmail(req.user?.email)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.',
    })
  }

  return next()
}

module.exports = {
  JWT_SECRET,
  isAdminEmail,
  requireAuth,
  optionalAuth,
  requireAdmin,
}
