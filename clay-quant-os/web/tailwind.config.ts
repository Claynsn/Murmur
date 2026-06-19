import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b0f17",
        panel: "#121826",
        accent: "#5eead4",
      },
    },
  },
  plugins: [],
};

export default config;
