import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motors & Heritage | Classic and Performance Automobiles",
  description:
    "A considered collection of classic, vintage, and performance automobiles.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
