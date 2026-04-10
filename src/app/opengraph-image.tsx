import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'

export const alt = 'Zawaaj — Private Muslim Matrimonial'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  // Read logo from the filesystem so it works in both dev and production
  const logoPath = path.join(process.cwd(), 'public', 'logo.png')
  const logoData = await readFile(logoPath)
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111110',
          gap: 32,
        }}
      >
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="Zawaaj"
          style={{ width: 340, objectFit: 'contain' }}
        />

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <p
            style={{
              fontSize: 22,
              color: '#AAA49D',
              margin: 0,
              fontFamily: 'sans-serif',
              letterSpacing: '-0.01em',
            }}
          >
            Private Muslim Matrimonial
          </p>
          <div
            style={{
              width: 48,
              height: 2,
              background: '#C49A10',
              borderRadius: 1,
            }}
          />
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
