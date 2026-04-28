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
        <nav className="bg-[#367C2B] text-white p-3 shadow">
          <div className="max-w-6xl mx-auto flex flex-wrap gap-4 text-sm font-semibold items-center">
            <Link href="/dashboard" className="text-[#FFDE00] font-bold text-base">
              JDC Transportation
            </Link>

            <Link href="/dashboard" className="hover:text-[#FFDE00]">
              Dashboard
            </Link>
            <Link href="/check-out" className="hover:text-[#FFDE00]">
              Check Out
            </Link>
            <Link href="/check-in" className="hover:text-[#FFDE00]">
              Check In
            </Link>
            <Link href="/cars" className="hover:text-[#FFDE00]">
              Cars
            </Link>
            <Link href="/people" className="hover:text-[#FFDE00]">
              People
            </Link>
            <Link href="/history" className="hover:text-[#FFDE00]">
              History
            </Link>
            <Link href="/admin" className="hover:text-[#FFDE00]">
              Admin
            </Link>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}