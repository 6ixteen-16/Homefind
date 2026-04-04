/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.openstreetmap.org" },
      { protocol: "https", hostname: "unpkg.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [{ source: "/home", destination: "/", permanent: true }];
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Suppress TS/ESLint errors during Vercel build.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;