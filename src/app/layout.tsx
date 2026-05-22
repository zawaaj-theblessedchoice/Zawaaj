import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Amiri } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner"
import AuthHashCatcher from "@/components/AuthHashCatcher";

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
  title: 'Zawaaj — The Blessed Choice',
  description: 'A family-led matrimonial platform. Private, dignified, admin-mediated introductions.',
  metadataBase: new URL('https://www.zawaaj.uk'),
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'android-chrome', url: '/android-chrome-192x192.png' },
      { rel: 'android-chrome', url: '/android-chrome-512x512.png' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Zawaaj — The Blessed Choice',
    description: 'A family-led matrimonial platform. Private, dignified, admin-mediated introductions.',
    url: 'https://www.zawaaj.uk',
    siteName: 'Zawaaj',
    type: 'website',
    // og:image is served by src/app/opengraph-image.tsx (dynamic edge render)
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zawaaj — The Blessed Choice',
    description: 'A family-led matrimonial platform. Private, dignified, admin-mediated introductions.',
    // twitter:image is auto-derived from opengraph-image.tsx
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

// Inline script: intercept Supabase implicit-flow recovery redirects.
// When /auth/reset-password is not in the Supabase Redirect URL allowlist,
// Supabase falls back to the Site URL and appends #access_token=...&type=recovery.
// This script runs synchronously before any paint or React hydration, so the
// user never sees the wrong page — the browser is redirected immediately.
const authHashScript = `
  try {
    var h = window.location.hash;
    if (h) {
      var p = new URLSearchParams(h.slice(1));
      if (p.get('access_token') && p.get('type') === 'recovery') {
        window.location.replace('/auth/reset-password' + h);
      }
    }
  } catch(e) {}
`;

// Inline script runs synchronously before first paint — no theme flash.
// Public marketing pages are always dark.
// All other pages: use stored preference, fall back to prefers-color-scheme.
// Public/pre-auth pages are always dark — no user preference applies yet.
// Member/admin pages follow stored preference, then OS preference.
const themeInitScript = `
  try {
    var p = window.location.pathname;
    var isAlwaysDark = (
      p === '/' ||
      p.startsWith('/pricing') ||
      p.startsWith('/terms') ||
      p.startsWith('/help') ||
      p.startsWith('/privacy') ||
      p.startsWith('/register') ||
      p.startsWith('/login') ||
      p.startsWith('/signup') ||
      p.startsWith('/forgot-password') ||
      p.startsWith('/pending') ||
      p.startsWith('/auth')
    );
    if (isAlwaysDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      var m = localStorage.getItem('zawaaj-theme');
      if (m === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else if (m === 'light') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        // No stored preference — default to dark (Zawaaj's primary aesthetic).
        // Users can switch to light or system in Settings.
        document.documentElement.setAttribute('data-theme', 'dark');
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
      suppressHydrationWarning
    >
      {/* Runs before first paint — intercepts Supabase recovery hash on any page */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-component */}
      <script dangerouslySetInnerHTML={{ __html: authHashScript }} />
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-component */}
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      <body className="min-h-full flex flex-col">
        <AuthHashCatcher />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
