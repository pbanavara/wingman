import type { Metadata } from "next";
import "./globals.css";
import "./lib/envSetup";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "Wingman – AI Copilot for Account Executives",
  description:
    "From drowning in admin work to closing more deals—built for sales teams on the road. Post‑meeting capture, real‑time customer intel, and CRM automation for Salesforce, HubSpot, and Sheets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
