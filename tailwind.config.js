/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Pandoran night — deep navy base, bioluminescent accents.
        night: {
          900: "#050816",
          800: "#0a1028",
          700: "#10183f",
          600: "#1a2350",
          500: "#253066",
        },
        // Tree-of-souls teal — the willow bark glow.
        soul: {
          300: "#9ff2e8",
          400: "#6ee5d7",
          500: "#3ed4c1",
          600: "#26b7a3",
        },
        // Spirit-violet — Eywa's neural flow.
        spirit: {
          300: "#d0b7ff",
          400: "#b194ff",
          500: "#9177ff",
          600: "#735cff",
        },
        // Atokirina pink — the sacred seeds that landed on Jake.
        atokirina: {
          300: "#ffd1f0",
          400: "#ffb3e3",
          500: "#ff90d1",
        },
        // Bark — warm luminous highlights at close range.
        bark: {
          300: "#fbead2",
          400: "#f0d5a5",
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
