import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHEQ Partner",
  description: "Safer people. Stronger business. Invite-only learning platform.",
  // TODO(brand): swap for the real favicon.ico + brand mark once the SVG
  // logo asset is supplied (see BrandLogo.tsx). This is a generated
  // navy/gold placeholder, not the final brand mark.
  icons: {
    icon: "/brand/favicon.png",
    apple: "/brand/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#011635",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
