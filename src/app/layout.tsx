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
  title: "Zawaaj",
  description: "A trusted matrimonial platform",
};

// Inline script runs synchronously before first paint to avoid theme flash.
// CSS :root defaults to dark — only override to light when explicitly chosen.
const themeInitScript = `
  try {
    var mode = localStorage.getItem('zawaaj-theme');
    if (mode === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else if (mode === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    // 'dark' or no preference — no attribute needed; CSS :root is already dark
  } catch(e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-component */}
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
