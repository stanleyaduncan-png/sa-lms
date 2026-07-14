import type { Config } from "tailwindcss";
import { navy, gold, status } from "./src/lib/brand";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy,
        gold,
        status: {
          progress: status.inProgress.fill,
          "progress-bg": status.inProgress.bg,
          "progress-text": status.inProgress.fg,
          complete: status.complete.fill,
          "complete-bg": status.complete.bg,
          "complete-text": status.complete.fg,
          failed: status.failed.fill,
          "failed-bg": status.failed.bg,
          "failed-text": status.failed.fg,
        },
      },
    },
  },
  plugins: [],
};

export default config;
