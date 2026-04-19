import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Zawaaj — The Blessed Choice'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Dynamic OG image — shown when zawaaj.uk links are shared on WhatsApp etc.
 * Uses the full circular Arabic logo centred on the dark background.
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${base}/Zawaaj_Logo_Transparent.png`}
          width={520}
          height={520}
          alt="Zawaaj"
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { ...size },
  )
}
