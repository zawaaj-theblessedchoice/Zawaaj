import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Zawaaj — The Blessed Choice'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Dynamic OG image — shown when zawaaj.uk links are shared on WhatsApp etc.
 * Card layout: dark background, gold accent bar, wordmark, tagline, platform description.
 */
export default function OGImage() {
  const base = 'https://www.zawaaj.uk'
  const gold = '#B8960C'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#111111',
          padding: 0,
        }}
      >
        {/* Gold accent bar at top */}
        <div style={{ width: '100%', height: 6, background: gold, display: 'flex' }} />

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 80px',
          }}
        >
          {/* Wordmark */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${base}/Zawaaj_Word_Only_Transparent.png`}
            width={340}
            height={100}
            alt="Zawaaj"
            style={{ objectFit: 'contain', marginBottom: 28 }}
          />

          {/* Divider */}
          <div style={{ width: 48, height: 1, background: gold, opacity: 0.6, marginBottom: 28, display: 'flex' }} />

          {/* Headline */}
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: '#FFFFFF',
              textAlign: 'center',
              lineHeight: 1.3,
              marginBottom: 18,
              letterSpacing: '-0.01em',
            }}
          >
            A private Muslim matrimonial platform
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: 22,
              color: 'rgba(255,255,255,0.65)',
              textAlign: 'center',
              lineHeight: 1.5,
              maxWidth: 820,
            }}
          >
            Every profile is reviewed. Introductions are admin-facilitated.
            Family-first. Free to join.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 80px',
            borderTop: '1px solid rgba(184,150,12,0.2)',
          }}
        >
          <div style={{ fontSize: 18, color: gold, letterSpacing: '0.04em' }}>
            zawaaj.uk
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
