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

// Shared branded wrapper for all emails
function baseTemplate({ heading, body, ctaText, ctaUrl, expiry, footerNote }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:48px 16px 40px">

        <!-- Logo -->
        <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px">
          <tr>
            <td align="center">
              <svg width="46" height="46" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 154.194 25.409 A 92.2 92.2 0 1 0 154.194 174.591"
                      fill="none" stroke="#0d0c0b" stroke-width="15.6" stroke-linecap="round"/>
                <circle cx="100" cy="100" r="10.8" fill="#b06a3b"/>
              </svg>
              <div style="margin-top:10px;font-size:15px;letter-spacing:9px;font-weight:600;color:#0d0c0b;text-transform:uppercase;font-family:Georgia,'Times New Roman',serif">
                COOKLYT
              </div>
            </td>
          </tr>
        </table>

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:480px;background:#ffffff;border-radius:10px;border:1px solid #e2ddd6;overflow:hidden">

          <!-- Brand accent bar -->
          <tr>
            <td style="height:4px;background:#b06a3b;font-size:0;line-height:0">&nbsp;</td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:36px 36px 32px">

              <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0d0c0b;line-height:1.3">
                ${heading}
              </h1>

              <div style="margin:0 0 28px;font-size:14px;color:#555550;line-height:1.65">
                ${body}
              </div>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="border-radius:7px;background:#b06a3b">
                    <a href="${ctaUrl}"
                       style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;
                              color:#ffffff;text-decoration:none;border-radius:7px;letter-spacing:0.2px">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              ${expiry ? `
              <p style="margin:20px 0 0;font-size:12.5px;color:#888882">
                &#x23F1; This link expires in <strong>${expiry}</strong>.
              </p>` : ''}

              <!-- Fallback URL -->
              <p style="margin:16px 0 0;font-size:11.5px;color:#aaa9a4;word-break:break-all">
                If the button doesn't work, copy this link:<br/>
                <a href="${ctaUrl}" style="color:#b06a3b;text-decoration:none">${ctaUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer inside card -->
          <tr>
            <td style="padding:18px 36px 24px;border-top:1px solid #f0ede8">
              <p style="margin:0;font-size:11.5px;color:#aaa9a4;line-height:1.6">
                ${footerNote}
              </p>
            </td>
          </tr>

        </table>

        <!-- Bottom tagline -->
        <p style="margin:24px 0 0;font-size:11px;color:#bbb8b2">
          CookLyt &mdash; Restaurant Management Platform
        </p>

      </td>
    </tr>
  </table>

</body>
</html>`;
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
    html: baseTemplate({
      heading:    'Verify your email address',
      body:       'Thanks for signing up. Please verify your email address to activate your CookLyt account.',
      ctaText:    'Verify Email',
      ctaUrl:     link,
      expiry:     '24 hours',
      footerNote: "If you didn't create a CookLyt account, you can safely ignore this email.",
    }),
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
    html: baseTemplate({
      heading:    'Reset your password',
      body:       "We received a request to reset the password for your CookLyt account.<br/><br/>If you made this request, click the button below. If you didn't, you can safely ignore this email &mdash; your password will not be changed.",
      ctaText:    'Reset Password',
      ctaUrl:     link,
      expiry:     '1 hour',
      footerNote: 'For security, this link can only be used once and expires after 1 hour.',
    }),
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
    subject: "You've been invited to CookLyt",
    html: baseTemplate({
      heading:    "You've been invited",
      body:       `Your administrator has created a CookLyt account for <strong>${to}</strong>.<br/><br/>Click the button below to set your password and activate your account.`,
      ctaText:    'Set My Password',
      ctaUrl:     link,
      expiry:     '72 hours',
      footerNote: "If you weren't expecting this invitation, you can safely ignore this email.",
    }),
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendAccountSetupEmail };
