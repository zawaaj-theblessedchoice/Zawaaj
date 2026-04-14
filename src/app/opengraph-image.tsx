import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Zawaaj — The Blessed Choice'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Dynamic OG image — generated at request time on the Vercel edge.
 * Uses the full Zawaaj_Logo_Transparent.png (the detailed logo with Arabic calligraphy)
 * served from the canonical domain so WhatsApp / social scrapers always get it.
 *
 * No other logo files are touched — /zawaaj-wordmark.png, /Zawaaj_Word_Only_Transparent.png
 * and /Zawaaj_Logo_Transparent.png continue to be used exactly as before in the app UI.
 */
export default function OGImage() {
  const base = 'https://www.zawaaj.uk'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111111',
        }}
      >
        {/* Full logo — Zawaaj_Logo_Transparent.png (Arabic + English mark) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${base}/Zawaaj_Logo_Transparent.png`}
          width={600}
          height={600}
          alt="Zawaaj"
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { ...size },
  )
}
