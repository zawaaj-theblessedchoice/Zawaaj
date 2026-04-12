interface AvatarInitialsProps {
  initials: string
  gender: string | null   // kept for API compatibility — no longer affects colour
  size?: 'sm' | 'md' | 'lg' | 'xl'
  goldBorder?: boolean
}

export default function AvatarInitials({
  initials,
  size = 'md',
  goldBorder = false,
}: AvatarInitialsProps) {
  // Gold palette — matches the active sidebar tab treatment across light and dark themes
  const bg    = 'rgba(184, 150, 12, 0.13)'
  const color = 'var(--gold)'

  const sizeClass =
    size === 'sm' ? 'w-[42px] h-[42px] text-xs' :
    size === 'lg' ? 'w-16 h-16 text-xl' :
    size === 'xl' ? 'w-20 h-20 text-2xl' :
    'w-12 h-12 text-sm'

  const borderStyle = goldBorder
    ? { border: '1.5px solid rgba(184, 150, 12, 0.5)' }
    : { border: '1px solid rgba(184, 150, 12, 0.2)' }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}
      style={{ backgroundColor: bg, color, ...borderStyle }}
    >
      {initials.trim().slice(0, 3)}
    </div>
  )
}
