const nodemailer = require('nodemailer');

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const FROM    = process.env.SMTP_FROM || `CookLyt <${process.env.SMTP_USER}>`;

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendVerificationEmail(to, token) {
  const link = `${APP_URL}/verify-email?token=${token}`;

  if (!isConfigured()) {
    console.log(`[email] SMTP not configured — verification link for ${to}:\n  ${link}`);
    return;
  }

  await createTransporter().sendMail({
    from:    FROM,
    to,
    subject: 'Verify your CookLyt account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="margin:0 0 8px;color:#0d0c0b">Welcome to CookLyt</h2>
        <p style="color:#555;margin:0 0 24px">
          Please verify your email address to activate your account.
          This link expires in <strong>24 hours</strong>.
        </p>
        <a href="${link}"
           style="display:inline-block;padding:12px 24px;background:#b06a3b;color:#fff;
                  text-decoration:none;border-radius:6px;font-weight:600">
          Verify Email
        </a>
        <p style="margin:24px 0 0;font-size:12px;color:#888">
          Or paste this URL: ${link}
        </p>
        <p style="margin:16px 0 0;font-size:12px;color:#888">
          If you didn't create this account, you can ignore this email.
        </p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(to, token) {
  const link = `${APP_URL}/reset-password?token=${token}`;

  if (!isConfigured()) {
    console.log(`[email] SMTP not configured — password reset link for ${to}:\n  ${link}`);
    return;
  }

  await createTransporter().sendMail({
    from:    FROM,
    to,
    subject: 'Reset your CookLyt password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="margin:0 0 8px;color:#0d0c0b">Reset your password</h2>
        <p style="color:#555;margin:0 0 24px">
          You requested a password reset for your CookLyt account.
          This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${link}"
           style="display:inline-block;padding:12px 24px;background:#b06a3b;color:#fff;
                  text-decoration:none;border-radius:6px;font-weight:600">
          Reset Password
        </a>
        <p style="margin:24px 0 0;font-size:12px;color:#888">
          Or paste this URL: ${link}
        </p>
        <p style="margin:16px 0 0;font-size:12px;color:#888">
          If you didn't request this, you can ignore this email. Your password will not change.
        </p>
      </div>
    `,
  });
}

async function sendAccountSetupEmail(to, token) {
  const link = `${APP_URL}/set-password?token=${token}`;

  if (!isConfigured()) {
    console.log(`[email] SMTP not configured — account setup link for ${to}:\n  ${link}`);
    return;
  }

  await createTransporter().sendMail({
    from:    FROM,
    to,
    subject: 'Set up your CookLyt account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="margin:0 0 8px;color:#0d0c0b">You've been invited to CookLyt</h2>
        <p style="color:#555;margin:0 0 24px">
          Your administrator has created an account for you.
          Click below to set your password and activate your account.
          This link expires in <strong>72 hours</strong>.
        </p>
        <a href="${link}"
           style="display:inline-block;padding:12px 24px;background:#b06a3b;color:#fff;
                  text-decoration:none;border-radius:6px;font-weight:600">
          Set my password
        </a>
        <p style="margin:24px 0 0;font-size:12px;color:#888">
          Or paste this URL: ${link}
        </p>
        <p style="margin:16px 0 0;font-size:12px;color:#888">
          If you weren't expecting this, you can ignore this email.
        </p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendAccountSetupEmail };
