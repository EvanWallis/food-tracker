/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "serif"],
      },
      colors: {
        ink: "#0f172a",
        inkSoft: "#475569",
        cream: "#f9f6f1",
        card: "#ffffff",
        accent: "#16a34a",
        accentDeep: "#0f766e",
        line: "rgba(15, 23, 42, 0.12)",
      },
      boxShadow: {
        soft: "0 18px 40px rgba(15, 23, 42, 0.12)",
        lift: "0 12px 25px rgba(15, 23, 42, 0.15)",
      },
      borderRadius: {
        xl: "1.25rem",
        '2xl': "1.5rem",
      },
    },
  },
  plugins: [],
};
