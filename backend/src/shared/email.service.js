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

function baseTemplate({ heading, body, ctaText, ctaUrl, expiry, footerNote }) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#f4f2ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:52px 20px 48px">

        <!-- Logo lockup -->
        <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px">
          <tr>
            <td align="center">

              <!-- Arc mark -->
              <svg width="38" height="38" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 154.194 25.409 A 92.2 92.2 0 1 0 154.194 174.591"
                      fill="none" stroke="#0d0c0b" stroke-width="15.6" stroke-linecap="round"/>
                <circle cx="100" cy="100" r="10.8" fill="#b06a3b"/>
              </svg>

              <!-- Wordmark: COOKLY·T -->
              <div style="margin-top:9px">
                <svg width="118" height="21" viewBox="0 0 360 64" xmlns="http://www.w3.org/2000/svg">
                  <text x="0" y="49" fill="#0d0c0b"
                        style="font-family:Georgia,'Times New Roman',serif;font-size:56px;letter-spacing:10.08px">COOKLY</text>
                  <circle cx="294.2" cy="29.43" r="5.03" fill="#b06a3b"/>
                  <text x="309.33" y="49" fill="#0d0c0b"
                        style="font-family:Georgia,'Times New Roman',serif;font-size:56px;letter-spacing:10.08px">T</text>
                </svg>
              </div>

              <div style="font-size:11px;color:#888882;margin-top:5px;letter-spacing:0.05em">by Krilok</div>

            </td>
          </tr>
        </table>

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:480px;background:#fafaf8;border:1px solid #e8e4de;border-radius:10px">
          <tr>
            <td style="padding:40px 40px 36px">

              <h1 style="margin:0 0 14px;font-size:22px;font-weight:600;color:#0d0c0b;
                         line-height:1.25;letter-spacing:-0.025em">
                ${heading}
              </h1>

              <div style="font-size:14px;color:#55554f;line-height:1.7;margin:0 0 32px">
                ${body}
              </div>

              <!-- Primary CTA — dark ink, matching landing page button style -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="border-radius:6px;background:#0d0c0b">
                    <a href="${ctaUrl}"
                       style="display:inline-block;padding:12px 22px;font-size:13.5px;
                              font-weight:500;color:#fafaf8;text-decoration:none;
                              border-radius:6px;letter-spacing:0.01em">
                      ${ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Card footer strip -->
          <tr>
            <td style="padding:18px 40px 22px;border-top:1px solid #eeebe6">

              ${expiry ? `<p style="margin:0 0 10px;font-size:12px;color:#888882">
                &#x23F1;&nbsp; This link expires in <strong style="color:#55554f">${expiry}</strong>.
              </p>` : ''}

              <p style="margin:0;font-size:12px;color:#aaa9a4;line-height:1.6">
                ${footerNote}
              </p>

              <p style="margin:10px 0 0;font-size:11.5px;color:#c5c2bc;word-break:break-all;line-height:1.5">
                Button not working?
                <a href="${ctaUrl}" style="color:#888882;text-decoration:underline">${ctaUrl}</a>
              </p>

            </td>
          </tr>
        </table>

        <!-- Page footer -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:480px;margin-top:28px">
          <tr>
            <td style="border-top:1px solid #e8e4de;padding-top:20px">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <span style="display:inline-flex;align-items:center;gap:6px">
                      <svg width="14" height="14" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle">
                        <path d="M 154.194 25.409 A 92.2 92.2 0 1 0 154.194 174.591"
                              fill="none" stroke="#0d0c0b" stroke-width="15.6" stroke-linecap="round"/>
                        <circle cx="100" cy="100" r="10.8" fill="#b06a3b"/>
                      </svg>
                      <span style="font-size:12px;color:#55554f;font-family:Georgia,'Times New Roman',serif;letter-spacing:0.04em">CookLyt</span>
                      <span style="font-size:12px;color:#aaa9a4">&middot; by Krilok</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11.5px;color:#c5c2bc">&copy; ${year} Krilok</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

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
      body:       'Thanks for signing up. Please verify your email address to activate your CookLyt account and get full access.',
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
      body:       "We received a request to reset the password on your CookLyt account.<br/><br/>If this was you, click below. If not, you can safely ignore this email — your password will not be changed.",
      ctaText:    'Reset Password',
      ctaUrl:     link,
      expiry:     '1 hour',
      footerNote: 'For security, this link can only be used once.',
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
      body:       `Your administrator has created a CookLyt account for <strong style="color:#0d0c0b">${to}</strong>.<br/><br/>Click below to set your own password and activate your account.`,
      ctaText:    'Set My Password',
      ctaUrl:     link,
      expiry:     '72 hours',
      footerNote: "If you weren't expecting this invitation, you can safely ignore this email.",
    }),
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendAccountSetupEmail };
