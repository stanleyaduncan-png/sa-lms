import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LMS Platform",
  description: "Invite-only learning management platform",
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
