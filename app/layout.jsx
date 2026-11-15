
import "./globals.css";
import OfflineSetup from "./OfflineSetup";
import Script from "next/script";

export const metadata = {
  icons: { icon: "/rounded-v.svg", shortcut: "/rounded-v.svg" },
  title: "Victor Alabi Daniel — Portfolio",
  description: "Software developer learning by building practical solutions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><Script id="portfolio-theme-before-paint" strategy="beforeInteractive">{`try { var saved = localStorage.getItem("victor-portfolio-theme"); if (saved === "dark" || saved === "light") document.documentElement.dataset.theme = saved; } catch (e) {}`}</Script></head>
      <body><OfflineSetup/>{children}</body>
    </html>
  );
}
