/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        hsbc: {
          red: "#db0011",
          tint: "#fff5f5",
        },
        ink: "#1d1d1b",
        paper: "#e6e7e8",
        panel: "#f3f3f4",
        line: "#d7d8d6",
        muted: "#5c5c5c",
        "muted-2": "#8a8d8f",
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        tile: "0 4px 18px rgba(0, 0, 0, 0.1)",
        header: "0 2px 10px rgba(0, 0, 0, 0.08)",
      },
      maxWidth: {
        dashboard: "86rem",
      },
    },
  },
  plugins: [],
};
