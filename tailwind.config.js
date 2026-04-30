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
        // Tree-of-souls teal — accent for links + active-tab stripes.
        // Deeper than the first light-pass stab; teal-500 (#14b8a6) was
        // borderline on white for small text, so bumping to teal-700.
        soul: {
          300: "#0f766e",    // links + active-tab underline + subtle emphasis
          400: "#115e59",    // button borders / hover
          500: "#134e4a",    // pressed
          600: "#115e59",
        },
        // Spirit-violet — fork glyph + alt accents. Deepened for contrast.
        spirit: {
          300: "#7c3aed",
          400: "#6d28d9",
          500: "#5b21b6",
          600: "#4c1d95",
        },
        // Atokirina — star glyph + warnings. Amber keeps HF's warm feel
        // on a light background.
        atokirina: {
          300: "#f59e0b",
          400: "#d97706",
          500: "#b45309",
        },
        // Text — components use `text-bark-300/{70,60,50,40}` opacity
        // modifiers for the secondary-text hierarchy. On a white bg
        // those render as `rgba(base, 0.X)`, so the base needs to be
        // near-pure-black for `/40` to still be ~gray-600 (readable).
        // gray-800 at 40% would be rgba(31,41,55,0.4) — near invisible.
        bark: {
          300: "#0a0a0b",    // near-black; main copy AND the opacity base
          400: "#374151",    // gray-700 (rarely used directly)
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
