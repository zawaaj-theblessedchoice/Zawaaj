interface Props {
  className?: string
  width?: number
  height?: number
  style?: React.CSSProperties
  /** @deprecated Use width/height instead */
  size?: number
  /** @deprecated No longer needed — new logo PNG has transparent background */
  tagline?: boolean
  /** @deprecated No longer used */
  variant?: 'light' | 'dark'
}

export function ZawaajLogo({ className, width, height, size, style }: Props) {
  // Support legacy `size` prop: treat as height, derive width at 4:1 ratio
  const resolvedHeight = height ?? size ?? 120
  const resolvedWidth  = width ?? (size ? size * 4 : 120)

  return (
    <img
      src="/Zawaaj_Logo_Transparent.png"
      alt="Zawaaj — The Blessed Choice"
      width={resolvedWidth}
      height={resolvedHeight}
      className={className}
      style={style}
    />
  )
}

export default ZawaajLogo
