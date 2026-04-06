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
          className="text-xs tracking-[0.25em] uppercase font-medium"
          style={{ color: '#B8960C' }}
        >
          The Blessed Choice
        </p>
      )}
    </div>
  )
}
