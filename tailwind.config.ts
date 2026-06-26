import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Design system from the build brief
        bg: "#070d1b",
        card: "#0f1c32",
        border: "#192840",
        // Funnel colours
        tof: "#4a90ff",
        mof: "#f5a820",
        bof: "#ff4060",
        // Spend gradient stops
        "spend-0": "#4a90ff",
        "spend-1": "#28d9a0",
        "spend-2": "#f5a820",
        "spend-3": "#ff4060",
      },
    },
  },
  plugins: [],
};

export default config;
