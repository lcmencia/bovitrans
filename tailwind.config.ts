import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Paleta BoviTrans (verde campo + tierra)
        brand: {
          50: "#f0f7f1",
          100: "#dbeede",
          500: "#2f7d46",
          600: "#256238",
          700: "#1e4f2e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
