/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12161D",
        ink2: "#1A2029",
        ink3: "#212936",
        paper: "#EDEDE6",
        mist: "#8B93A1",
        mint: "#3ECF8E",
        coral: "#E8735A",
        line: "#262D38",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        md: "10px",
        lg: "14px",
      },
    },
  },
  plugins: [],
};
