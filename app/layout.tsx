import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Syllabus App", // Updated to look nicer on the browser tab!
  description: "Automate your syllabus and project deadlines",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-gray-900 bg-gray-50">
        
        {/* Navigation Bar */}
        <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
          <div className="font-bold text-xl text-blue-600 flex items-center gap-2">
            🎓 Syllabus App
          </div>
          <div className="space-x-6 text-sm font-medium flex items-center">
            <a href="/dashboard" className="text-gray-600 hover:text-blue-600 transition-colors">Dashboard</a>
            <a href="/calendar" className="text-gray-600 hover:text-blue-600 transition-colors">Calendar</a>
            
            {/* NEW PROJECTS LINK */}
            <a href="/projects" className="text-gray-600 hover:text-blue-600 transition-colors">Projects</a>
            
            <a href="/login" className="text-red-500 hover:text-red-700 ml-4 border-l border-gray-200 pl-6">Logout</a>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}