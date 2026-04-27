import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "JDC Transportation",
  description: "Tournament transportation tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-black text-white p-3">
          <div className="max-w-6xl mx-auto flex flex-wrap gap-3 text-sm">
            <Link href="/">Login</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/check-out">Check Out</Link>
            <Link href="/check-in">Check In</Link>
            <Link href="/cars">Cars</Link>
            <Link href="/people">People</Link>
            <Link href="/history">History</Link>
            <Link href="/admin">Admin</Link>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}