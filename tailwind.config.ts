import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        // Brand palette — deep indigo "AI co-founder" mood.
        ink: {
          DEFAULT: "#0B1220",
          soft: "#111827",
          muted: "#6B7280",
        },
        accent: {
          DEFAULT: "#1F3A8A",
          400: "#2563EB",
          50: "#EFF4FB",
          100: "#DCE7F7",
        },
        canvas: "#F8FAFC",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
