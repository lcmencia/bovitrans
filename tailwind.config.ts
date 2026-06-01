import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        // Marfil / arena — neutros cálidos tintados hacia el verde
        cream: {
          50: "#FBFAF6",
          100: "#F6F2E9",
          200: "#ECE5D6",
          300: "#DED3BD",
        },
        // Verde bosque (marca)
        forest: {
          50: "#EEF4EF",
          100: "#D6E5DA",
          200: "#AEC9B6",
          300: "#7FA98C",
          400: "#4E8463",
          500: "#2F7D46",
          600: "#1E4F2E",
          700: "#173D24",
          800: "#12301D",
          900: "#0D2416",
        },
        // Ámbar (acento)
        amber: {
          50: "#FBF1E2",
          100: "#F5DEBE",
          400: "#D98E2B",
          500: "#C97A1A",
          600: "#A86214",
        },
        ink: {
          DEFAULT: "#1A2420",
          soft: "#3C4842",
          mute: "#6B7771",
        },
        // alias para compatibilidad con clases existentes (brand-*)
        brand: {
          50: "#EEF4EF",
          100: "#D6E5DA",
          200: "#AEC9B6",
          500: "#2F7D46",
          600: "#1E4F2E",
          700: "#173D24",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(26,36,32,0.04), 0 8px 24px -12px rgba(26,36,32,0.12)",
        lift: "0 2px 4px rgba(26,36,32,0.05), 0 18px 40px -16px rgba(26,36,32,0.22)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
