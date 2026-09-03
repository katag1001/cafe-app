// Centralized email-sender config, read from env vars — see api/.env.example.
// Nothing here is hardcoded so the sending account/service can change later
// by editing this one file (or just the env vars) rather than every call site.
module.exports = {
  fromAddress: process.env.EMAIL_FROM_ADDRESS,
  fromName: process.env.EMAIL_FROM_NAME || 'Cafe Finder',
  appPassword: process.env.EMAIL_APP_PASSWORD,
}
