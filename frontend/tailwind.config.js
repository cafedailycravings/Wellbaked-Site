/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        cream: "#F9F6F0",
        cream2: "#F3EFE6",
        brown: { DEFAULT: "#4A3022", dark: "#362217", light: "#7A5A4A", muted: "#A68A7A" },
        blush: { DEFAULT: "#E8B4B8", dark: "#D89DA3" },
        gold: "#D4AF37",
      },
      fontFamily: {
        serif: ["'Playfair Display'", "Georgia", "serif"],
        sans: ["Manrope", "system-ui", "sans-serif"],
        script: ["'Dancing Script'", "cursive"],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(74, 48, 34, 0.05)",
        medium: "0 4px 16px rgba(74, 48, 34, 0.08)",
        large: "0 12px 32px rgba(74, 48, 34, 0.12)",
      },
    },
  },
  plugins: [],
};
