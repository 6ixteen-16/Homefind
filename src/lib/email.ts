import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Lazily initialized transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  // Use Resend SMTP if configured, else Gmail SMTP
  const host = process.env.EMAIL_HOST || "smtp.resend.com";
  const port = parseInt(process.env.EMAIL_PORT || "587");
  const user = process.env.EMAIL_USER || "resend";
  const pass = process.env.EMAIL_PASS || process.env.RESEND_API_KEY || "";

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  const fromAddress =
    from ||
    process.env.EMAIL_FROM ||
    "Prestige Properties <noreply@prestigeproperties.com>";

  try {
    const t = getTransporter();
    const result = await t.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });
    return result;
  } catch (error) {
    console.error("[sendEmail] Failed:", error);
    throw error;
  }
}

// ============================
// EMAIL TEMPLATES
// ============================

export function baseEmailTemplate(content: string, siteName: string, siteUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${siteName}</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #F8F5F0; margin: 0; padding: 0; color: #333; }
  .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(10,22,40,0.1); }
  .header { background: #0A1628; padding: 32px 40px; }
  .header-title { color: #F8F5F0; font-size: 28px; font-weight: 300; margin: 0; font-family: Georgia, serif; }
  .header-sub { color: #C9A84C; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; margin-top: 4px; }
  .body { padding: 40px; }
  .footer { background: #f5f2ee; padding: 20px 40px; text-align: center; border-top: 1px solid #e8e2d9; }
  .footer p { color: #888; font-size: 12px; margin: 4px 0; }
  .footer a { color: #C9A84C; text-decoration: none; }
  .btn { display: inline-block; background: #0A1628; color: #F8F5F0; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin: 16px 0; }
  .btn-gold { background: #C9A84C; color: #0A1628; }
  .divider { border: none; border-top: 1px solid #e8e2d9; margin: 24px 0; }
  .field-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .field-value { font-size: 15px; color: #0A1628; margin-bottom: 16px; }
  .highlight-box { background: #F8F5F0; border-left: 4px solid #C9A84C; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 16px 0; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="header-title">Prestige</div>
    <div class="header-sub">Properties</div>
  </div>
  <div class="body">
    ${content}
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
    <p><a href="${siteUrl}">Visit our website</a> · <a href="${siteUrl}/privacy-policy">Privacy Policy</a></p>
  </div>
</div>
</body>
</html>`;
}
