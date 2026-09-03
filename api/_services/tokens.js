const crypto = require('crypto')

// Used for email verification and password reset links. Only the hash is
// ever stored — a database leak should never hand out a usable token.
const generateToken = () => {
  const raw = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

const hashToken = (raw) =>
  crypto.createHash('sha256').update(String(raw || '')).digest('hex')

module.exports = {
  generateToken,
  hashToken,
}
