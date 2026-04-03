import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Prestige Properties collects, uses, and protects your personal data.",
  robots: { index: false },
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "January 2025";

  return (
    <>
      <Navbar />
      <main id="main-content">
        <section className="bg-navy-900 py-16">
          <div className="section-container">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-cream-500">
                <li><Link href="/" className="hover:text-gold-400 transition-colors">Home</Link></li>
                <li>/</li>
                <li className="text-cream-200" aria-current="page">Privacy Policy</li>
              </ol>
            </nav>
            <h1 className="font-display text-display-md font-light text-cream-100">Privacy Policy</h1>
            <p className="text-cream-400 text-sm mt-2">Last updated: {lastUpdated}</p>
          </div>
        </section>

        <section className="section-padding bg-background">
          <div className="section-container max-w-4xl prose-luxury">
            <div className="space-y-8 text-foreground/80">

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">1. Who We Are</h2>
                <p>Prestige Properties (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a real estate agency. This Privacy Policy explains how we collect and use your personal data when you visit our website or use our services.</p>
                <p className="mt-2">Contact: <a href="mailto:info@prestigeproperties.com" className="text-gold-600 hover:underline">info@prestigeproperties.com</a></p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">2. Data We Collect</h2>
                <p>We collect the following personal information when you use our site:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Contact forms & inquiries:</strong> Name, email, phone number, message</li>
                  <li><strong>Newsletter signup:</strong> Email address</li>
                  <li><strong>Admin accounts:</strong> Name, email, hashed password</li>
                  <li><strong>Analytics:</strong> Browser type, pages visited, time on site (via Google Analytics 4 — anonymised)</li>
                  <li><strong>Security:</strong> IP address (for rate limiting and spam prevention, not stored long-term)</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">3. How We Use Your Data</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>To respond to your inquiries and provide requested services</li>
                  <li>To send you newsletter updates (only if you subscribed — unsubscribe anytime)</li>
                  <li>To improve our website and services via anonymised analytics</li>
                  <li>To protect the site from spam and abuse</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">4. Third-Party Processors</h2>
                <p>We share your data with the following trusted third parties to operate our service:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Supabase</strong> — database hosting (EU/US)</li>
                  <li><strong>Cloudinary</strong> — image storage and delivery</li>
                  <li><strong>Resend</strong> — transactional email delivery</li>
                  <li><strong>Vercel</strong> — website hosting</li>
                  <li><strong>Google Analytics</strong> — anonymised usage analytics</li>
                  <li><strong>Cloudflare</strong> — spam protection (Turnstile)</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">5. Data Retention</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>Inquiry data: retained for 3 years, then deleted</li>
                  <li>Newsletter subscribers: retained until unsubscribed</li>
                  <li>Admin accounts: retained indefinitely unless deletion is requested</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">6. Your Rights (GDPR / CCPA)</h2>
                <p>You have the right to:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Access the personal data we hold about you</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your personal data</li>
                  <li>Object to or restrict processing of your data</li>
                  <li>Receive a copy of your data in a portable format</li>
                </ul>
                <p className="mt-3">To exercise any of these rights, email us at <a href="mailto:privacy@prestigeproperties.com" className="text-gold-600 hover:underline">privacy@prestigeproperties.com</a>. We will respond within 30 days.</p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">7. Cookies</h2>
                <p>We use cookies to operate the site (strictly necessary), remember your preferences, and optionally collect analytics. See our <Link href="/cookie-policy" className="text-gold-600 hover:underline">Cookie Policy</Link> for full details. You can manage your preferences at any time via the &quot;Manage Cookies&quot; link in the footer.</p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">8. Contact</h2>
                <p>Questions about this policy? Contact our data controller:</p>
                <address className="not-italic mt-2 text-sm">
                  Prestige Properties<br />
                  123 Business District, Suite 400<br />
                  Kampala, Uganda<br />
                  <a href="mailto:privacy@prestigeproperties.com" className="text-gold-600 hover:underline">privacy@prestigeproperties.com</a>
                </address>
              </div>

            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
