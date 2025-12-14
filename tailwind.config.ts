import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: "var(--font-inter)",
        serif: "var(--font-playfair)",
        mono: "var(--font-mono)",
      },
      colors: {
        'brand-purple': '#4B2C6B',
      },
      letterSpacing: {
        'widest-lg': '0.3em',
      }
    },
  },
  plugins: [
    // If you installed @tailwindcss/typography, you can leave it.
    // If not, you can remove this plugins array.
    require('@tailwindcss/typography'),
  ],
};

export default config;
