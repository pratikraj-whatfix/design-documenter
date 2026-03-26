import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Design Documenter - Cursor to Confluence",
  description:
    "Turn your Cursor AI chat sessions into structured design documentation on Confluence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 min-h-screen">
        {children}
      </body>
    </html>
  );
}
