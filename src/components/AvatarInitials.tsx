interface AvatarInitialsProps {
  initials: string
  gender: string | null   // kept for API compatibility — no longer affects colour
  size?: 'sm' | 'md' | 'lg' | 'xl'
  goldBorder?: boolean
}

// Neutral label shown wherever a name/initials would appear for a profile that
// has no derivable name yet (e.g. ~37 of the legacy cohort). Never "XX".
export const NAME_PENDING_LABEL = 'Awaiting details'

// A profile's name is "pending" when there are no real initials to show — the
// import stores 'XX' as the no-name sentinel; treat that and blank as pending.
export function isNamePending(initials: string | null | undefined): boolean {
  const s = (initials ?? '').trim().toUpperCase()
  return s === '' || s === 'XX'
}

// Person silhouette for the pending state — clearly NOT letters, so it reads as
// "no name yet" rather than fake initials. Exported so surfaces that render their
// OWN avatar circle (e.g. admin lists) can show the same silhouette for no-name
// profiles instead of "XX".
export function NameGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="58%" height="58%" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="currentColor" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor" />
    </svg>
  )
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

  const pending = isNamePending(initials)

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}
      style={{ backgroundColor: bg, color, ...borderStyle }}
      title={pending ? NAME_PENDING_LABEL : undefined}
    >
      {pending ? <NameGlyph /> : initials.trim().slice(0, 3)}
    </div>
  )
}
