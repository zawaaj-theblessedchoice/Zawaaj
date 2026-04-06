interface ChipProps {
  label: string
  selected?: boolean
  onClick?: () => void
}

export default function Chip({ label, selected = false, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 400,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s, border-color 0.15s, color 0.15s',

        background: selected ? 'var(--gold-muted)' : 'var(--surface-3)',
        border: selected
          ? '0.5px solid var(--gold-border)'
          : '0.5px solid var(--border-default)',
        color: selected ? 'var(--gold-light)' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  )
}
