import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — Deep Navy + Warm Gold + Cream
        navy: {
          50:  "#e8ecf4",
          100: "#c5cfe3",
          200: "#9eafd0",
          300: "#778fbd",
          400: "#5a77b0",
          500: "#3d5fa3",
          600: "#2d4d8c",
          700: "#1e3a73",
          800: "#122a5c",
          900: "#0A1628",
          950: "#060e1a",
        },
        gold: {
          50:  "#fdf8ed",
          100: "#f9eecb",
          200: "#f4dea5",
          300: "#edca77",
          400: "#e5b54e",
          500: "#C9A84C",
          600: "#b08a32",
          700: "#8e6c24",
          800: "#6d521b",
          900: "#4e3a12",
        },
        cream: {
          50:  "#fdfcfb",
          100: "#F8F5F0",
          200: "#f0ebe0",
          300: "#e4dccf",
          400: "#d4c9b5",
          500: "#c0ae96",
          600: "#a8917a",
          700: "#8a7260",
          800: "#6b5548",
          900: "#4d3c33",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
        "display-2xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-xl": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["3rem", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
        "display-md": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-sm": ["1.875rem", { lineHeight: "1.25" }],
        "display-xs": ["1.5rem", { lineHeight: "1.35" }],
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "luxury": "0 4px 24px -4px rgba(10, 22, 40, 0.12), 0 1px 4px -1px rgba(10, 22, 40, 0.08)",
        "luxury-lg": "0 12px 48px -8px rgba(10, 22, 40, 0.18), 0 4px 12px -2px rgba(10, 22, 40, 0.1)",
        "luxury-xl": "0 24px 64px -12px rgba(10, 22, 40, 0.22), 0 8px 24px -4px rgba(10, 22, 40, 0.12)",
        "gold": "0 4px 24px -4px rgba(201, 168, 76, 0.3)",
        "inner-luxury": "inset 0 1px 0 0 rgba(255,255,255,0.1)",
      },
      backgroundImage: {
        "gradient-luxury": "linear-gradient(135deg, #0A1628 0%, #1e3a73 50%, #0A1628 100%)",
        "gradient-gold": "linear-gradient(135deg, #C9A84C 0%, #e5b54e 50%, #b08a32 100%)",
        "gradient-cream": "linear-gradient(180deg, #F8F5F0 0%, #f0ebe0 100%)",
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.6s ease-out forwards",
        "slide-in-right": "slideInRight 0.4s ease-out forwards",
        "scale-in": "scaleIn 0.4s ease-out forwards",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "marquee": "marquee 25s linear infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(24px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(201, 168, 76, 0)" },
          "50%": { boxShadow: "0 0 0 8px rgba(201, 168, 76, 0.15)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      transitionDuration: {
        "400": "400ms",
      },
      zIndex: {
        "60": "60",
        "70": "70",
        "80": "80",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
