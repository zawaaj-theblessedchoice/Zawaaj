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

// Inline script runs synchronously before first paint — no theme flash.
// Public marketing pages are always dark.
// All other pages: use stored preference, fall back to prefers-color-scheme.
const themeInitScript = `
  try {
    var p = window.location.pathname;
    var isPublic = (
      p === '/' ||
      p.startsWith('/pricing') ||
      p.startsWith('/terms') ||
      p.startsWith('/help') ||
      p.startsWith('/privacy')
    );
    if (isPublic) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      var m = localStorage.getItem('zawaaj-theme');
      if (m === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else if (m === 'light') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        // 'system' or no stored preference — follow OS
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
    }
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
