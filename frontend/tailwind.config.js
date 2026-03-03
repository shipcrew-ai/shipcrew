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
          "surface-raised": "var(--color-sidebar)",
          "border-subtle": "var(--glass-border)",
          "input-focus": "var(--color-active)",
          "active-glow": "var(--color-active-glow)",
          "text-secondary": "var(--color-text-secondary)",
          green: "var(--status-green)",
          yellow: "var(--status-yellow)",
          blue: "var(--status-blue)",
          red: "var(--status-red)",
        },
      },
      animation: {
        "pulse-dot": "pulse 1.2s ease-in-out infinite",
        "fade-in": "fadeIn 0.2s ease-in-out",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
