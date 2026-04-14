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
          position: 'relative',
        }}
      >
        {/* Subtle gold radial glow behind logo */}
        <div
          style={{
            position: 'absolute',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(184,150,12,0.18) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -60%)',
          }}
        />

        {/* Full logo — Zawaaj_Logo_Transparent.png (Arabic + English mark) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${base}/Zawaaj_Logo_Transparent.png`}
          width={320}
          height={320}
          alt="Zawaaj"
          style={{ objectFit: 'contain', position: 'relative' }}
        />

        {/* Tagline */}
        <div
          style={{
            marginTop: 28,
            fontSize: 26,
            color: 'rgba(184,150,12,0.75)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase' as const,
            position: 'relative',
          }}
        >
          The Blessed Choice
        </div>

        {/* Domain watermark */}
        <div
          style={{
            marginTop: 12,
            fontSize: 15,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.12em',
            position: 'relative',
          }}
        >
          zawaaj.uk
        </div>
      </div>
    ),
    { ...size },
  )
}
