import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#04070d",
          900: "#070b14",
          850: "#0a101c",
          800: "#0e1624",
          700: "#172133",
          600: "#243149",
        },
        aurora: {
          50: "#edfffb",
          100: "#d1fff5",
          200: "#a7ffec",
          300: "#6cf7de",
          400: "#2ee6c8",
          500: "#14c9ae",
          600: "#0aa38f",
          700: "#0b8274",
          800: "#0d675e",
          900: "#0f554e",
        },
        solar: {
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
        },
        ember: {
          400: "#fb7185",
          500: "#f43f5e",
        },
        ice: {
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
        },
      },
      fontFamily: {
        sans: ["Inter Variable", "system-ui", "sans-serif"],
        display: ["Space Grotesk Variable", "Inter Variable", "sans-serif"],
        mono: ["JetBrains Mono Variable", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(46, 230, 200, 0.45)",
        "glow-sm": "0 0 24px -8px rgba(46, 230, 200, 0.5)",
        panel: "0 24px 80px -24px rgba(0, 0, 0, 0.8)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(148,163,184,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.055) 1px, transparent 1px)",
        "radial-fade":
          "radial-gradient(ellipse at center, rgba(46,230,200,0.12), transparent 65%)",
      },
      animation: {
        "fade-up": "fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fadeIn 0.5s ease both",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        "scan": "scan 8s linear infinite",
        "float": "float 7s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.04)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
