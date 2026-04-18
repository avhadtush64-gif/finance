/**
 * @module services/notificationService
 * @description Budget alert notifications — email + log to DB.
 */

const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('./emailService');
const config = require('../config/env');

/**
 * Send a budget alert email and log it (max once per day per budget).
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} opts.userEmail
 * @param {string} opts.userName
 * @param {string} opts.budgetId
 * @param {string} opts.categoryName
 * @param {number} opts.spent
 * @param {number} opts.budgetAmount
 * @param {number} opts.percentUsed
 * @param {boolean} opts.isOverrun
 */
async function sendBudgetAlert({
  userId, userEmail, userName, budgetId,
  categoryName, spent, budgetAmount, percentUsed, isOverrun,
}) {
  // Check if already notified today for this budget
  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.query(
    `SELECT id FROM notifications_log
     WHERE user_id = $1 AND type LIKE $2 AND sent_at::date = $3::date
     LIMIT 1`,
    [userId, `%${budgetId}%`, today]
  );
  if (existing.rows.length > 0) return; // already notified today

  const type = isOverrun ? 'budget_overrun' : 'budget_warning';
  const subject = isOverrun
    ? `🚨 Budget overrun: ${categoryName}`
    : `⚠️ Budget warning: ${categoryName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <h2 style="color: ${isOverrun ? '#e74c3c' : '#f39c12'};">${subject}</h2>
      <p>Hi ${userName || 'there'},</p>
      <p>Your budget for <strong>${categoryName}</strong> has reached
         <strong>${percentUsed.toFixed(1)}%</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;">Budget</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${budgetAmount.toFixed(2)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;">Spent</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${spent.toFixed(2)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;">Remaining</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: ${isOverrun ? '#e74c3c' : '#27ae60'}">
              $${(budgetAmount - spent).toFixed(2)}</td></tr>
      </table>
      <a href="${config.frontendUrl}" style="display: inline-block; padding: 10px 24px; background: #3498db; color: #fff; text-decoration: none; border-radius: 4px;">
        View Dashboard
      </a>
    </div>
  `;

  // Send email (async, don't block)
  sendEmail({ to: userEmail, subject, html }).catch((err) => {
    console.error('Failed to send budget alert email:', err.message);
  });

  // Log notification
  await db.query(
    `INSERT INTO notifications_log (id, user_id, type, message) VALUES ($1, $2, $3, $4)`,
    [uuidv4(), userId, `${type}:${budgetId}`, `${categoryName}: ${percentUsed.toFixed(1)}% used`]
  );
}

module.exports = { sendBudgetAlert };
