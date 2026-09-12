/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Same palette as the original ROASIFY-UI (src/index.css), color-picked
        // from the brand mockup — kept identical so the two apps read as one product.
        navy: "#243469",
        "navy-dark": "#1A2650",
        accent: "#455DB4",
        "accent-dark": "#374B94",
        "indigo-light": "#EEF1FC",
        "sb-1": "#B7E5F9",
        "sb-2": "#7C93D6",
        "sb-3": "#566CBD",
        "sb-card-1": "#4E66B9",
        "sb-card-2": "#93ABDE",
        lime: "#D7E721",
        "lime-dark": "#C2D01D",
        bg: "#F8F8F8",
        card: "#FFFFFF",
        line: "#E9E9EB",
        "text-dim": "#9C9C9E",
        green: "#16A34A",
        "green-bg": "#DCFCE7",
        red: "#DC2626",
        "red-bg": "#FEE2E2",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "sans-serif"],
        display: ["var(--font-baloo)", "sans-serif"],
      },
      transitionTimingFunction: {
        ease: "cubic-bezier(.22,1,.36,1)",
        spring: "cubic-bezier(.34,1.56,.64,1)",
      },
      keyframes: {
        fadeSlideUp: {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        popIn: {
          "0%": { opacity: 0, transform: "scale(.5)" },
          "70%": { transform: "scale(1.08)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        slideDownFade: {
          from: { opacity: 0, transform: "translateY(-8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(215,231,33,.55)" },
          "50%": { boxShadow: "0 0 0 7px rgba(215,231,33,0)" },
        },
      },
      animation: {
        fadeSlideUp: "fadeSlideUp .5s cubic-bezier(.22,1,.36,1) both",
        fadeIn: "fadeIn .4s cubic-bezier(.22,1,.36,1) both",
        popIn: "popIn .4s cubic-bezier(.22,1,.36,1) both",
        slideDownFade: "slideDownFade .3s cubic-bezier(.22,1,.36,1) both",
        pulseGlow: "pulseGlow 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
