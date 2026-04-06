interface CompatibilityBarProps {
  score: number // 0 – 100
}

function label(score: number) {
  if (score >= 80) return 'Strong fit'
  if (score >= 65) return 'Good fit'
  return 'Moderate fit'
}

export default function CompatibilityBar({ score }: CompatibilityBarProps) {
  const pct = Math.min(100, Math.max(0, score))

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Track */}
      <div
        style={{
          flex: 1,
          height: 2,
          borderRadius: 1,
          background: 'var(--surface-4)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--gold)',
            borderRadius: 1,
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 400,
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
          minWidth: 64,
          textAlign: 'right',
        }}
      >
        {label(pct)}
      </span>
    </div>
  )
}
