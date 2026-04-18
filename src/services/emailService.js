/**
 * @module services/emailService
 * @description Email sending via Nodemailer SMTP.
 */

const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporter = null;

if (config.smtpUser && config.smtpPass) {
  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
} else {
  console.warn('⚠️  SMTP credentials not configured — emails will be logged to console.');
}

/**
 * Send an email.
 * @param {{ to: string, subject: string, html: string }} opts
 */
async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    console.log(`📧  [Email Preview] To: ${to}\n   Subject: ${subject}\n   Body: ${html.substring(0, 200)}…`);
    return;
  }

  await transporter.sendMail({
    from: config.emailFrom,
    to,
    subject,
    html,
  });
}

module.exports = { sendEmail };
