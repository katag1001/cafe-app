const rateLimit = require('express-rate-limit')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
})

// Shared by registration, resend-verification, and forgot-password — all are
// "send an email" actions that need the same protection against someone
// spamming a stranger's inbox or hammering account creation.
const accountActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
})

module.exports = {
  loginLimiter,
  accountActionLimiter,
}
