/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 2026-04-24 light-theme pass: class NAMES unchanged so components
        // keep working, but the palette flips. "night" is now the page
        // surface (warm off-white → white), "bark" is the dark text we
        // render on top of it. Accent colors (soul/spirit/atokirina)
        // stay but are retuned for contrast on a light background.

        // Page surface — was deep navy, now off-white (HuggingFace-ish).
        night: {
          900: "#ffffff",    // pure white
          800: "#fafafa",    // card / subtle fill
          700: "#f4f4f5",    // hovered / secondary fill
          600: "#e4e4e7",    // divider
          500: "#d4d4d8",    // stronger divider
        },
        // Tree-of-souls teal — HF's yellow-ish role, still our accent.
        // Darkened for WCAG AA on white.
        soul: {
          300: "#14b8a6",    // used for links + active-tab underline
          400: "#0d9488",    // button borders
          500: "#0f766e",    // pressed / hover
          600: "#115e59",
        },
        // Spirit-violet — fork glyph + alt accents.
        spirit: {
          300: "#8b5cf6",
          400: "#7c3aed",
          500: "#6d28d9",
          600: "#5b21b6",
        },
        // Atokirina — star glyph + warnings. Moved amber to match HF's
        // warm accent + be readable on white.
        atokirina: {
          300: "#fbbf24",
          400: "#f59e0b",
          500: "#d97706",
        },
        // Text — was cream on dark, now near-black on light. Gradations
        // map to opacity modifiers used throughout the codebase:
        //   text-bark-300       = main copy (dark gray-near-black)
        //   text-bark-300/70    = secondary copy
        //   text-bark-300/50    = tertiary copy
        bark: {
          300: "#1f2937",    // gray-800
          400: "#374151",    // gray-700
        },
      },
      fontFamily: {
        display: ['"Cinzel"', "Georgia", "serif"],
        soft: ['"Inter"', '-apple-system', "sans-serif"],
      },
      boxShadow: {
        soul: "0 0 40px rgba(62, 212, 193, 0.25), 0 0 90px rgba(145, 119, 255, 0.18)",
        seed: "0 0 24px rgba(255, 179, 227, 0.6)",
      },
      animation: {
        "drift-slow": "drift 18s ease-in-out infinite",
        "drift-med": "drift 11s ease-in-out infinite",
        "drift-fast": "drift 7s ease-in-out infinite",
        "pulse-soul": "pulse-soul 4s ease-in-out infinite",
        "breathe": "breathe 6s ease-in-out infinite",
      },
      keyframes: {
        drift: {
          "0%,100%": { transform: "translate3d(0,0,0) rotate(0deg)" },
          "25%": { transform: "translate3d(10px,-15px,0) rotate(3deg)" },
          "50%": { transform: "translate3d(-8px,-25px,0) rotate(-2deg)" },
          "75%": { transform: "translate3d(-12px,-8px,0) rotate(1deg)" },
        },
        "pulse-soul": {
          "0%,100%": { opacity: 0.8, filter: "drop-shadow(0 0 6px rgba(62,212,193,0.6))" },
          "50%": { opacity: 1, filter: "drop-shadow(0 0 16px rgba(62,212,193,0.9))" },
        },
        breathe: {
          "0%,100%": { transform: "scale(1)", opacity: 0.85 },
          "50%": { transform: "scale(1.03)", opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
