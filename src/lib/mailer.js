'use strict';

const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter;

function getTransporter() {
  if (transporter) {return transporter;}

  if (process.env.NODE_ENV === 'test') {
    // Stub: silently swallows emails in tests
    transporter = {
      sendMail: async () => ({ messageId: 'test' }),
    };
    return transporter;
  }

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Ethereal fallback for dev/local – prints preview URL to console
    nodemailer.createTestAccount().then((account) => {
      transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass },
      });
      logger.info({ previewBase: 'https://ethereal.email' }, 'Using Ethereal SMTP');
    });
    // Return a temporary stub while Ethereal initializes
    transporter = {
      sendMail: async (opts) => {
        logger.warn({ to: opts.to, subject: opts.subject }, 'Email queued before transporter ready');
        return { messageId: 'pending' };
      },
    };
  }

  return transporter;
}

/**
 * Send email verification link to newly registered user.
 */
async function sendVerificationEmail({ to, name, token, baseUrl }) {
  const link = `${baseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
  const html = `
    <h2>Welcome to TEAL Jewellery, ${name}!</h2>
    <p>Please verify your email address by clicking the link below:</p>
    <p><a href="${link}" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Verify Email</a></p>
    <p>This link expires in 1 hour.</p>
    <p style="color:#999;font-size:12px">If you did not register, you can safely ignore this email.</p>
  `;
  const t = getTransporter();
  const info = await t.sendMail({
    from: process.env.MAIL_FROM || '"TEAL Jewellery" <noreply@teal.dev>',
    to,
    subject: 'Verify your TEAL Jewellery account',
    html,
  });
  logger.info({ to, messageId: info.messageId }, 'Verification email sent');
  if (info.messageUrl) {logger.info({ previewUrl: info.messageUrl }, 'Preview URL');}
}

module.exports = { sendVerificationEmail };
