import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Prestige Properties uses cookies on its website.",
  robots: { index: false },
};

const COOKIES = [
  {
    name: "__session",
    provider: "Prestige Properties",
    purpose: "Keeps you logged in to the admin dashboard. Required for authentication.",
    duration: "8 hours",
    category: "Strictly Necessary",
  },
  {
    name: "next-auth.csrf-token",
    provider: "NextAuth.js",
    purpose: "Protects against Cross-Site Request Forgery (CSRF) attacks on login forms.",
    duration: "Session",
    category: "Strictly Necessary",
  },
  {
    name: "next-auth.callback-url",
    provider: "NextAuth.js",
    purpose: "Remembers where to redirect after login.",
    duration: "Session",
    category: "Strictly Necessary",
  },
  {
    name: "pp-cookie-consent",
    provider: "Prestige Properties",
    purpose: "Stores your cookie preferences so we don't show the banner on every visit.",
    duration: "1 year",
    category: "Strictly Necessary",
  },
  {
    name: "property-view",
    provider: "Prestige Properties (localStorage)",
    purpose: "Remembers whether you prefer grid or list view on the properties page.",
    duration: "Persistent (localStorage)",
    category: "Functionality",
  },
  {
    name: "property-favorites",
    provider: "Prestige Properties (localStorage)",
    purpose: "Stores the list of properties you have saved/favourited.",
    duration: "Persistent (localStorage)",
    category: "Functionality",
  },
  {
    name: "_ga, _ga_*",
    provider: "Google Analytics 4",
    purpose: "Tracks page views, sessions, and user behaviour to help us improve the site. Data is anonymised.",
    duration: "2 years",
    category: "Analytics",
  },
  {
    name: "_gcl_au",
    provider: "Google",
    purpose: "Used by Google Analytics to store and track conversions.",
    duration: "3 months",
    category: "Analytics",
  },
];

const CATEGORIES = [
  {
    name: "Strictly Necessary",
    color: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300",
    desc: "These cookies are required for the website to function. They cannot be disabled.",
    canDisable: false,
  },
  {
    name: "Functionality",
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
    desc: "These cookies remember your preferences (view mode, saved properties). Disabling them means your choices won't be saved between visits.",
    canDisable: true,
  },
  {
    name: "Analytics",
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
    desc: "These cookies help us understand how visitors use our site so we can improve it. All data is anonymised.",
    canDisable: true,
  },
];

export default function CookiePolicyPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        {/* Header */}
        <section className="bg-navy-900 py-16">
          <div className="section-container">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-cream-500">
                <li><Link href="/" className="hover:text-gold-400 transition-colors">Home</Link></li>
                <li>/</li>
                <li className="text-cream-200" aria-current="page">Cookie Policy</li>
              </ol>
            </nav>
            <h1 className="font-display text-display-md font-light text-cream-100">
              Cookie Policy
            </h1>
            <p className="text-cream-400 text-sm mt-2">Last updated: January 2025</p>
          </div>
        </section>

        <section className="section-padding bg-background">
          <div className="section-container max-w-5xl space-y-12">

            {/* Intro */}
            <div className="prose-luxury max-w-3xl">
              <p className="text-foreground/80 leading-relaxed">
                This Cookie Policy explains what cookies are, which ones we use on the
                Prestige Properties website, and how you can control them. For broader
                information on how we handle your data, please see our{" "}
                <Link href="/privacy-policy" className="text-gold-600 hover:underline">
                  Privacy Policy
                </Link>.
              </p>
            </div>

            {/* What are cookies */}
            <div>
              <h2 className="font-display text-2xl font-light text-foreground mb-4">
                What Are Cookies?
              </h2>
              <p className="text-foreground/80 leading-relaxed max-w-3xl">
                Cookies are small text files placed on your device by a website when you
                visit it. They are widely used to make websites work efficiently and to
                provide information to the site owners. Some cookies are stored only for
                the duration of your browser session; others persist for a set period.
                This site also uses{" "}
                <strong className="text-foreground">localStorage</strong> — a similar
                browser storage mechanism — to remember your UI preferences without
                sending data to any server.
              </p>
            </div>

            {/* Categories */}
            <div>
              <h2 className="font-display text-2xl font-light text-foreground mb-6">
                Cookie Categories We Use
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {CATEGORIES.map((cat) => (
                  <div
                    key={cat.name}
                    className="bg-card rounded-xl border border-border p-5 shadow-luxury"
                  >
                    <span
                      className={`inline-block text-xs px-2.5 py-1 rounded-full border font-semibold mb-3 ${cat.color}`}
                    >
                      {cat.name}
                    </span>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {cat.desc}
                    </p>
                    <p className="text-xs mt-3 font-medium">
                      {cat.canDisable ? (
                        <span className="text-gold-600">Can be disabled via cookie banner</span>
                      ) : (
                        <span className="text-muted-foreground">Always active — cannot be disabled</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cookie table */}
            <div>
              <h2 className="font-display text-2xl font-light text-foreground mb-6">
                Full Cookie List
              </h2>
              <div className="bg-card rounded-xl border border-border shadow-luxury overflow-hidden">
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-sm"
                    role="table"
                    aria-label="Cookie details"
                  >
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {["Cookie Name", "Provider", "Purpose", "Duration", "Category"].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left px-4 py-3 font-semibold text-foreground text-xs whitespace-nowrap"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {COOKIES.map((cookie, i) => (
                        <tr
                          key={cookie.name}
                          className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">
                            {cookie.name}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {cookie.provider}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs">
                            {cookie.purpose}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {cookie.duration}
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const cat = CATEGORIES.find(
                                (c) => c.name === cookie.category
                              );
                              return (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cat?.color ?? ""}`}
                                >
                                  {cookie.category}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* How to control */}
            <div className="max-w-3xl">
              <h2 className="font-display text-2xl font-light text-foreground mb-4">
                How to Control Cookies
              </h2>
              <div className="space-y-4 text-foreground/80">
                <p>
                  <strong className="text-foreground">Via our cookie banner:</strong> When
                  you first visit the site, you can choose which optional cookie categories
                  to accept. You can change your preferences at any time by clicking the
                  &quot;Manage Cookies&quot; link in the footer.
                </p>
                <p>
                  <strong className="text-foreground">Via your browser:</strong> Most
                  browsers allow you to block or delete cookies through their settings.
                  Note that blocking strictly necessary cookies will prevent the admin
                  dashboard from functioning correctly. See your browser&apos;s help
                  documentation:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>
                    <a
                      href="https://support.google.com/chrome/answer/95647"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold-600 hover:underline"
                    >
                      Google Chrome
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold-600 hover:underline"
                    >
                      Mozilla Firefox
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://support.apple.com/guide/safari/manage-cookies-sfri11471"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold-600 hover:underline"
                    >
                      Apple Safari
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://support.microsoft.com/topic/delete-and-manage-cookies-168dab11-0753-043d-7c16-ede5947fc64d"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold-600 hover:underline"
                    >
                      Microsoft Edge
                    </a>
                  </li>
                </ul>
                <p>
                  <strong className="text-foreground">Google Analytics opt-out:</strong>{" "}
                  You can install the{" "}
                  <a
                    href="https://tools.google.com/dlpage/gaoptout"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-600 hover:underline"
                  >
                    Google Analytics Opt-out Browser Add-on
                  </a>{" "}
                  to prevent your data from being used by GA4.
                </p>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-muted/40 rounded-xl border border-border p-6 max-w-2xl">
              <h2 className="font-display text-xl font-light text-foreground mb-2">
                Questions?
              </h2>
              <p className="text-sm text-muted-foreground">
                If you have any questions about our use of cookies, please contact us at{" "}
                <a
                  href="mailto:privacy@prestigeproperties.com"
                  className="text-gold-600 hover:underline"
                >
                  privacy@prestigeproperties.com
                </a>{" "}
                or see our full{" "}
                <Link href="/privacy-policy" className="text-gold-600 hover:underline">
                  Privacy Policy
                </Link>.
              </p>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
