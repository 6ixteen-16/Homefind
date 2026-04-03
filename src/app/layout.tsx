import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { CookieConsent } from "@/components/shared/CookieConsent";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { BackToTop } from "@/components/shared/BackToTop";
import Script from "next/script";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
  preload: true,
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-dm-sans",
  display: "swap",
  preload: true,
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://prestigeproperties.com"
  ),
  title: {
    default: "Prestige Properties — Luxury Real Estate",
    template: "%s | Prestige Properties",
  },
  description:
    "Discover exceptional residential and commercial properties. Prestige Properties connects discerning buyers and renters with the finest real estate.",
  keywords: ["real estate", "luxury properties", "buy property", "rent property", "commercial real estate"],
  authors: [{ name: "Prestige Properties" }],
  creator: "Prestige Properties",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Prestige Properties",
    title: "Prestige Properties — Luxury Real Estate",
    description:
      "Discover exceptional residential and commercial properties.",
    images: [
      {
        url: "/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Prestige Properties",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prestige Properties — Luxury Real Estate",
    description: "Discover exceptional residential and commercial properties.",
    images: ["/og-default.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F5F0" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1628" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cormorant.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://tile.openstreetmap.org" />
      </head>
      <body className="font-body antialiased">
        {/* Skip to content - Accessibility */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <div id="main-content">
            {children}
          </div>
          <Toaster />
          <CookieConsent />
          <WhatsAppButton />
          <BackToTop />
        </ThemeProvider>

        {/* Google Analytics 4 — loaded after interaction */}
        {ga4Id && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${ga4Id}', {
                  page_path: window.location.pathname,
                  send_page_view: false
                });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
