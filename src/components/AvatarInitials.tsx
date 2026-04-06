interface AvatarInitialsProps {
  initials: string
  gender: string | null
  size?: 'sm' | 'md' | 'lg'
}

export default function AvatarInitials({ initials, gender, size = 'md' }: AvatarInitialsProps) {
  const isFemale = gender === 'female'

  const bg = isFemale ? '#EEEDFE' : '#E6F1FB'
  const color = isFemale ? '#534AB7' : '#185FA5'

  const sizeClasses =
    size === 'sm'
      ? 'w-8 h-8 text-xs'
      : size === 'lg'
      ? 'w-20 h-20 text-2xl'
      : 'w-12 h-12 text-sm'

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ backgroundColor: bg, color }}
    >
      {initials.trim().slice(0, 3)}
    </div>
  )
}
