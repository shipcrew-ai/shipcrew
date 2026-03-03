import type { Metadata } from "next";
import "./globals.css";
import { ThemeSync } from "@/components/ThemeSync";

export const metadata: Metadata = {
  title: "ShipCrew",
  description: "Your AI crew that builds software",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="h-screen overflow-hidden bg-mesh relative noise text-slack-text antialiased">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
