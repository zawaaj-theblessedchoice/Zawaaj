import type { Metadata } from "next";
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
  title: "Zawaaj",
  description: "Find your perfect match on Zawaaj — a private, invite-only Muslim matrimonial platform.",
  metadataBase: new URL("https://www.zawaaj.uk"),
  openGraph: {
    title: "Zawaaj",
    description: "Find your perfect match on Zawaaj — a private, invite-only Muslim matrimonial platform.",
    url: "https://www.zawaaj.uk",
    siteName: "Zawaaj",
    images: [
      {
        url: "https://www.zawaaj.uk/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Zawaaj — Private Muslim Matrimonial",
      },
    ],
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zawaaj",
    description: "Find your perfect match on Zawaaj — a private, invite-only Muslim matrimonial platform.",
    images: ["https://www.zawaaj.uk/opengraph-image"],
  },
};

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
