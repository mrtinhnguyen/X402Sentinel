import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poly-sans-neutral)", "sans-serif"],
        // Override all font families to use PolySans Neutral
        mono: ["var(--font-poly-sans-neutral)", "sans-serif"],
        serif: ["var(--font-poly-sans-neutral)", "sans-serif"],
      },
    },
  },
};

export default config;
