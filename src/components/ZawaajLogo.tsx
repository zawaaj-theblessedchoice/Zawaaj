interface Props {
  className?: string
  /** Explicit pixel width. If omitted, width is auto (preserves aspect ratio). */
  width?: number
  /** Pixel height of the logo. Defaults to 48. */
  height?: number
  style?: React.CSSProperties
  /** @deprecated Use height instead — maps 1:1 to height, width becomes auto */
  size?: number
  /** @deprecated No longer needed — transparent PNG renders on any background */
  tagline?: boolean
  /** @deprecated No longer used */
  variant?: 'light' | 'dark'
}

export function ZawaajLogo({ className, width, height, size, style }: Props) {
  // New logo is square (1024×1024). Always let width be auto unless explicitly set.
  const resolvedHeight = height ?? size ?? 48

  return (
    <img
      src="/Zawaaj_Logo_Transparent.png"
      alt="Zawaaj — The Blessed Choice"
      width={width ?? resolvedHeight}   // needed for next/image SSR but overridden by style
      height={resolvedHeight}
      className={className}
      style={{ height: resolvedHeight, width: width ?? 'auto', ...style }}
    />
  )
}

export default ZawaajLogo
