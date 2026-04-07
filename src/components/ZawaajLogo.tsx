import Image from 'next/image'

interface ZawaajLogoProps {
  /** px size of the logo mark */
  size?: number
  /** show the "THE BLESSED CHOICE" tagline below */
  tagline?: boolean
  /** 'light' = gold on dark bg | 'dark' = gold on light bg (same image, CSS controls bg) */
  variant?: 'light' | 'dark'
}

export default function ZawaajLogo({
  size = 80,
  tagline = true,
}: ZawaajLogoProps) {
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <Image
        src="/logo.png"
        alt="Zawaaj – The Blessed Choice"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
      {tagline && (
        <p
          style={{
            color: 'var(--gold)',
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: '0.30em',
            textTransform: 'uppercase',
            marginTop: 2,
            opacity: 0.85,
          }}
        >
          The Blessed Choice
        </p>
      )}
    </div>
  )
}
