import { baseEmailTemplate } from "@/lib/email";

interface InquiryNotificationProps {
  inquiry: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    message: string;
    contactMethod?: string | null;
    propertyTitle?: string | null;
    createdAt: Date;
  };
  siteName: string;
  dashboardUrl: string;
}

export function InquiryNotificationEmail({
  inquiry, siteName, dashboardUrl,
}: InquiryNotificationProps): string {
  const content = `
    <h2 style="font-size:22px;font-weight:300;color:#0A1628;margin:0 0 8px;font-family:Georgia,serif;">
      New Inquiry Received
    </h2>
    <p style="color:#666;margin:0 0 24px;">A new inquiry has been submitted ${inquiry.propertyTitle ? `for <strong>${inquiry.propertyTitle}</strong>` : "via the contact form"}.</p>
    
    <div class="field-label">From</div>
    <div class="field-value">${inquiry.name}</div>
    
    <div class="field-label">Email</div>
    <div class="field-value"><a href="mailto:${inquiry.email}" style="color:#C9A84C;">${inquiry.email}</a></div>
    
    ${inquiry.phone ? `<div class="field-label">Phone</div><div class="field-value"><a href="tel:${inquiry.phone}" style="color:#C9A84C;">${inquiry.phone}</a></div>` : ""}
    
    ${inquiry.contactMethod ? `<div class="field-label">Preferred Contact</div><div class="field-value" style="text-transform:capitalize;">${inquiry.contactMethod}</div>` : ""}
    
    <hr class="divider">
    
    <div class="field-label">Message</div>
    <div class="highlight-box">
      <p style="margin:0;color:#0A1628;line-height:1.6;">${inquiry.message.replace(/\n/g, "<br>")}</p>
    </div>
    
    <a href="${dashboardUrl}" class="btn">View in Dashboard →</a>
    
    <p style="font-size:12px;color:#999;margin-top:24px;">
      Received: ${new Date(inquiry.createdAt).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}
    </p>
  `;

  return baseEmailTemplate(content, siteName, process.env.NEXT_PUBLIC_SITE_URL || "#");
}

export function InquiryConfirmationEmail({
  name, propertyTitle, siteName, siteUrl,
}: {
  name: string;
  propertyTitle?: string | null;
  siteName: string;
  siteUrl: string;
}): string {
  const content = `
    <h2 style="font-size:22px;font-weight:300;color:#0A1628;margin:0 0 8px;font-family:Georgia,serif;">
      Thank you, ${name}!
    </h2>
    <p style="color:#666;margin:0 0 24px;">We've received your inquiry${propertyTitle ? ` regarding <strong>${propertyTitle}</strong>` : ""} and our team will be in touch with you shortly.</p>
    
    <div class="highlight-box">
      <p style="margin:0;color:#0A1628;font-weight:600;">What happens next?</p>
      <ul style="margin:8px 0 0;padding-left:16px;color:#555;line-height:2;">
        <li>One of our agents will review your inquiry</li>
        <li>We'll contact you within 1–2 business days</li>
        <li>We may reach out by your preferred contact method</li>
      </ul>
    </div>
    
    <p style="color:#666;margin:24px 0 8px;">In the meantime, feel free to browse our other listings:</p>
    <a href="${siteUrl}/properties" class="btn btn-gold">Browse All Properties</a>
    
    <p style="font-size:12px;color:#999;margin-top:32px;">
      If you did not submit this inquiry, please ignore this email or <a href="mailto:info@prestigeproperties.com" style="color:#C9A84C;">contact us</a>.
    </p>
  `;

  return baseEmailTemplate(content, siteName, siteUrl);
}

export function PasswordResetEmail({
  name, resetUrl, siteName, siteUrl,
}: {
  name: string;
  resetUrl: string;
  siteName: string;
  siteUrl: string;
}): string {
  const content = `
    <h2 style="font-size:22px;font-weight:300;color:#0A1628;margin:0 0 8px;font-family:Georgia,serif;">
      Password Reset Request
    </h2>
    <p style="color:#666;margin:0 0 24px;">Hi ${name}, we received a request to reset your admin account password.</p>
    
    <a href="${resetUrl}" class="btn">Reset Password →</a>
    
    <p style="color:#888;font-size:13px;margin-top:24px;">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
  `;

  return baseEmailTemplate(content, siteName, siteUrl);
}

export function NewsletterWelcomeEmail({
  siteName, siteUrl,
}: {
  siteName: string;
  siteUrl: string;
}): string {
  const content = `
    <h2 style="font-size:22px;font-weight:300;color:#0A1628;margin:0 0 8px;font-family:Georgia,serif;">
      Welcome to ${siteName}!
    </h2>
    <p style="color:#666;margin:0 0 24px;">You've successfully subscribed to our newsletter. You'll be the first to know about new property listings, market insights, and exclusive deals.</p>
    
    <a href="${siteUrl}/properties" class="btn btn-gold">Browse Properties</a>
    
    <p style="font-size:12px;color:#999;margin-top:32px;">
      You can <a href="${siteUrl}/api/unsubscribe?email=__EMAIL__" style="color:#C9A84C;">unsubscribe</a> at any time.
    </p>
  `;

  return baseEmailTemplate(content, siteName, siteUrl);
}
