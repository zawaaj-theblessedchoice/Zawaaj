import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Amiri } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Zawaaj — The Blessed Choice",
  description: "A private Muslim matrimonial platform. Family-first, admin-mediated introductions. Mothers connect with mothers. Free to join.",
  metadataBase: new URL("https://www.zawaaj.uk"),
  openGraph: {
    title: 'Zawaaj — The Blessed Choice',
    description: 'A private Muslim matrimonial platform. Family-first, admin-mediated introductions. Mothers connect with mothers. Free to join.',
    url: 'https://www.zawaaj.uk',
    siteName: 'Zawaaj',
    type: 'website',
    // og:image is served by src/app/opengraph-image.tsx (dynamic edge render)
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zawaaj — The Blessed Choice',
    description: 'A private Muslim matrimonial platform. Family-first, admin-mediated introductions. Mothers connect with mothers. Free to join.',
    // twitter:image is auto-derived from opengraph-image.tsx
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

// Inline script runs synchronously before first paint to avoid theme flash.
// HTML element defaults to data-theme="dark". Script removes it only if user
// explicitly chose light.
const themeInitScript = `
  try {
    var mode = localStorage.getItem('zawaaj-theme');
    if (mode === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else if (mode === 'system') {
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.documentElement.removeAttribute('data-theme');
      }
      // system+dark or system — keep data-theme="dark" (already set on element)
    }
    // 'dark', null (no preference) — keep data-theme="dark" (already set on element)
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
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} ${amiri.variable} h-full antialiased`}
    >
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-component */}
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      <body className="min-h-full flex flex-col">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
