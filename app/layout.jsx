
import "./globals.css";
import OfflineSetup from "./OfflineSetup";

export const metadata = {
  icons: { icon: "/rounded-v.svg", shortcut: "/rounded-v.svg" },
  title: "Victor Alabi Daniel — Portfolio",
  description: "Software developer learning by building practical solutions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><OfflineSetup/>{children}</body>
    </html>
  );
}
