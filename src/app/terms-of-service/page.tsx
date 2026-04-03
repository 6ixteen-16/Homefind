import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using the Prestige Properties website and services.",
  robots: { index: false },
};

export default function TermsPage() {
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
                <li className="text-cream-200" aria-current="page">Terms of Service</li>
              </ol>
            </nav>
            <h1 className="font-display text-display-md font-light text-cream-100">Terms of Service</h1>
            <p className="text-cream-400 text-sm mt-2">Last updated: January 2025</p>
          </div>
        </section>

        <section className="section-padding bg-background">
          <div className="section-container max-w-4xl">
            <div className="space-y-8 text-foreground/80">

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">1. Acceptance of Terms</h2>
                <p>By accessing or using the Prestige Properties website, you agree to be bound by these Terms of Service. If you do not agree, please do not use this site.</p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">2. Use of This Website</h2>
                <p>You agree to use this website only for lawful purposes. You must not:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Submit false, misleading, or fraudulent information</li>
                  <li>Attempt to gain unauthorised access to any part of the site</li>
                  <li>Use automated tools to scrape or harvest listing data without permission</li>
                  <li>Post or transmit any content that is unlawful, harmful, or offensive</li>
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">3. Property Listings</h2>
                <p>Property details on this site are provided by our agents and property owners. While we strive for accuracy, Prestige Properties makes no warranty as to the completeness or accuracy of any listing. You should independently verify all property details, prices, and availability before making any decisions.</p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">4. Intellectual Property</h2>
                <p>All content on this website — including text, images, logos, and design — is owned by or licensed to Prestige Properties. You may not reproduce, distribute, or create derivative works without our written permission.</p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">5. Limitation of Liability</h2>
                <p>To the maximum extent permitted by law, Prestige Properties shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of this website or reliance on any information contained herein.</p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">6. Third-Party Links</h2>
                <p>This site may contain links to third-party websites. We are not responsible for the content or privacy practices of those sites.</p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">7. Governing Law</h2>
                <p>These terms are governed by and construed in accordance with the laws of Uganda. Any disputes shall be subject to the exclusive jurisdiction of the courts of Uganda.</p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">8. Changes to These Terms</h2>
                <p>We may update these Terms at any time. Continued use of the site after changes constitutes acceptance of the new terms.</p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-light text-foreground mb-3">9. Contact</h2>
                <p>For questions about these Terms, contact us at <a href="mailto:legal@prestigeproperties.com" className="text-gold-600 hover:underline">legal@prestigeproperties.com</a>.</p>
              </div>

            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
