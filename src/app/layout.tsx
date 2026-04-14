import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Amiri } from "next/font/google";
import "./globals.css";

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
    images: [{ url: 'https://www.zawaaj.uk/og-image.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Zawaaj — The Blessed Choice' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zawaaj — The Blessed Choice',
    description: 'A private Muslim matrimonial platform. Family-first, admin-mediated introductions. Mothers connect with mothers. Free to join.',
    images: ['https://www.zawaaj.uk/og-image.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

// Inline script runs synchronously before first paint to avoid theme flash.
// CSS :root is LIGHT by default (no attribute). Dark mode = data-theme="dark" on <html>.
const themeInitScript = `
  try {
    var mode = localStorage.getItem('zawaaj-theme');
    if (mode === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    // 'light', null, or system+light — no attribute; :root is already light
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
