import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Funnel Creative Scatter — SSW",
  description:
    "Meta ad performance: CPM unique reach vs. frequency, by spend share.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg text-[#e6edf7] font-sans">
        {children}
      </body>
    </html>
  );
}
