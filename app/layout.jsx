
import "./globals.css";

export const metadata = {
  title: "Victor Alabi Daniel — Portfolio",
  description: "Software developer learning by building practical solutions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
