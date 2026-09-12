import { Poppins, Baloo_2 } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-baloo",
});

export const metadata = {
  title: "Roasify",
  description: "Live product-level ROAS across Meta, Google, and Shopify.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${poppins.variable} ${baloo.variable}`}>
      <body className="bg-bg text-navy font-sans antialiased">{children}</body>
    </html>
  );
}
