/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        slack: {
          bg: "var(--color-bg)",
          sidebar: "var(--color-sidebar)",
          hover: "var(--color-hover)",
          active: "var(--color-active)",
          text: "var(--color-text)",
          muted: "var(--color-muted)",
          border: "var(--color-border)",
          input: "var(--color-input)",
          surface: "var(--color-surface)",
          heading: "var(--color-heading)",
          green: "#2bac76",
          yellow: "#ecb22e",
          blue: "#1d9bd1",
          red: "#e01e5a",
        },
      },
      animation: {
        "pulse-dot": "pulse 1.2s ease-in-out infinite",
        "fade-in": "fadeIn 0.2s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
