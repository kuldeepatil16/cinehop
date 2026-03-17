import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        paper: "var(--paper)",
        cream: "var(--cream)",
        accent: "var(--accent)",
        "accent-muted": "var(--accent-muted)",
        gold: "var(--gold)",
        muted: "var(--muted)",
        border: "var(--border)",
        chain: {
          cinesa: "var(--chain-cinesa)",
          yelmo: "var(--chain-yelmo)",
          kinepolis: "var(--chain-kinepolis)"
        }
      },
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        sans: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"]
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.3)", opacity: "0.7" }
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        ticker: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" }
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" }
        }
      },
      animation: {
        pulseDot: "pulseDot 2.5s ease-in-out infinite",
        fadeUp: "fadeUp 0.4s ease both",
        ticker: "ticker 28s linear infinite",
        blink: "blink 1.4s ease-in-out infinite"
      },
      boxShadow: {
        card: "0 14px 40px rgba(14, 14, 14, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
