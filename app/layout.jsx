import Script from "next/script";
import "./globals.css";
import "./mockups.css";
import { portfolioUrl } from "./projects";

export const metadata = {
  metadataBase: new URL(portfolioUrl),
  title: { default: "Victor Alabi Daniel — Software Developer", template: "%s | Victor Alabi Daniel" },
  description: "Software developer in Abuja building Go command-line tools and practical web prototypes. Explore Boothy, Go-Reloaded, ASCII-Art, and VicFungo.",
  alternates: { canonical: "/" },
  openGraph: {type:"website",locale:"en_NG",url:"/",siteName:"Victor Alabi Daniel",title:"Victor Alabi Daniel — Software Developer",description:"Go foundations. Practical web prototypes. The work and the thinking behind it."},
  twitter: {card:"summary_large_image"},
  icons: {icon:"/icon.svg"},
};
export default function RootLayout({ children }) {
  return <html lang="en" suppressHydrationWarning><body><Script src="/theme-init.js" strategy="beforeInteractive"/><a href="#main-content" className="skipLink">Skip to content</a>{children}</body></html>;
}
