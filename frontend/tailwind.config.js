/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-muted": "rgb(var(--color-surface-muted) / <alpha-value>)",
        "text-primary": "rgb(var(--color-text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--color-text-secondary) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        error: "rgb(var(--color-error) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        inverse: "rgb(var(--color-inverse) / <alpha-value>)",
        overlay: "rgb(var(--color-overlay) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["var(--font-body, Inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-heading, 'Source Serif 4')", "Georgia", "serif"]
      },
      fontWeight: { bold: "var(--font-weight-heading, 700)" },
      boxShadow: {
        panel: "0 8px 24px rgb(var(--color-overlay) / 0.08)",
        focus: "0 0 0 3px rgb(var(--color-primary) / 0.18)"
      },
      spacing: {
        18: "4.5rem"
      }
    }
  },
  plugins: []
};
