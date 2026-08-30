const nodemailer = require('nodemailer')
const emailConfig = require('../config/email')

let transporter

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailConfig.fromAddress,
        pass: emailConfig.appPassword,
      },
    })
  }

  return transporter
}

// Email is always best-effort. A failed send must never block or roll back
// the action that triggered it — the database is always the source of truth.
async function sendEmail(to, subject, html) {
  try {
    await getTransporter().sendMail({
      from: `"${emailConfig.fromName}" <${emailConfig.fromAddress}>`,
      to,
      subject,
      html,
    })
  } catch (error) {
    console.error('Failed to send email:', error.message)
  }
}

module.exports = { sendEmail }
