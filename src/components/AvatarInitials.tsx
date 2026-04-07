interface AvatarInitialsProps {
  initials: string
  gender: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  goldBorder?: boolean
}

export default function AvatarInitials({
  initials,
  gender,
  size = 'md',
  goldBorder = false,
}: AvatarInitialsProps) {
  const isFemale = gender === 'female'

  // Dark-theme avatar colours — gender-distinct, readable on dark surfaces
  const bg    = isFemale ? '#2D2455' : '#0D2A3A'
  const color = isFemale ? '#C4BCFF' : '#7BBFE8'

  const sizeClass =
    size === 'sm' ? 'w-[42px] h-[42px] text-xs' :
    size === 'lg' ? 'w-16 h-16 text-xl' :
    size === 'xl' ? 'w-20 h-20 text-2xl' :
    'w-12 h-12 text-sm'

  const borderStyle = goldBorder
    ? { border: '1.5px solid rgba(184, 150, 12, 0.6)' }
    : {}

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}
      style={{ backgroundColor: bg, color, ...borderStyle }}
    >
      {initials.trim().slice(0, 3)}
    </div>
  )
}
