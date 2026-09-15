import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07090c",
          900: "#0c1015",
          800: "#12171e",
          700: "#1b222b",
          600: "#2a333e",
          500: "#404c59",
          400: "#647080",
          300: "#93a0ae",
          200: "#c3cdd6",
          100: "#e7ebef",
        },
        gold: {
          600: "#e03c00",
          500: "#ff6933",
          400: "#ff875c",
          300: "#ffb094",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        premium: "0 20px 60px -20px rgba(0,0,0,0.5)",
        glow: "0 0 40px -8px rgba(255,105,51,0.45)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.45", transform: "scale(0.85)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "pop-in": "pop-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        twinkle: "twinkle 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
