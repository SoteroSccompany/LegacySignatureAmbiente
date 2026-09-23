/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./src/**/*.jsx"],
  theme: {
    extend: {
      screens: {
        xsm: "420px",
        sm: "640px",
        md: "768px",
        mw: "826px",
        lg: "1024px",
        lh: "1036px",
        ls: "1205px",
        xl: "1280px",
        "2xl": "1536px",
      },
      colors: {
        brand: {
          navy: "#0B1F33",
          "navy-light": "#132F4A",
          teal: "#0F766E",
          "teal-light": "#14B8A6",
          "teal-dark": "#0D5F58",
          mute: "#7EB8C9",
          "mute-soft": "#A8C5D0",
          mist: "#E8EEF2",
          tip: "#F1F5F9",
          ink: "#334155",
          slate: "#475569",
          soft: "#64748B",
        },
        // aliases legados → nova marca (evita quebrar classes antigas)
        "brand-dark": "#0B1F33",
        "brand-cyan": "#0F766E",
        "brand-dark-light": "#132F4A",
        "brand-dark-lighter": "#1A3A56",
        "brand-cyan-light": "#14B8A6",
        "brand-cyan-dark": "#0D5F58",
        "brand-cyan-darker": "#0A4A45",
        "brand-yellow": "#0F766E",
        "brand-yellow-dark": "#0D5F58",
        "brand-yellow-light": "#14B8A6",
      },
      fontFamily: {
        display: ["Georgia", "Times New Roman", "serif"],
        sans: ["Arial", "Helvetica", "sans-serif"],
      },
      boxShadow: {
        brand: "0 8px 32px rgba(11, 31, 51, 0.12)",
      },
      borderRadius: {
        brand: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
