import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        card: "hsl(var(--card))",
        navy: {
          800: "#1e3a73",
          900: "#0A1628",
        },
        gold: {
          400: "#e5b54e",
          500: "#C9A84C",
          600: "#b08a32",
        },
        cream: {
          100: "#F8F5F0",
        },
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #C9A84C, #e5b54e, #b08a32)',
      },
      boxShadow: {
        luxury: '0 10px 30px -10px rgba(10, 22, 40, 0.1)',
        'luxury-lg': '0 20px 40px -15px rgba(10, 22, 40, 0.15)',
        gold: '0 4px 14px 0 rgba(201, 168, 76, 0.3)',
      },
      fontSize: {
        'display-lg': ['3.5rem', { lineHeight: '1.15' }],
        'display-md': ['2.5rem', { lineHeight: '1.15' }],
        'display-sm': ['2rem', { lineHeight: '1.2' }],
        'display-xs': ['1.5rem', { lineHeight: '1.2' }],
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
};
export default config;