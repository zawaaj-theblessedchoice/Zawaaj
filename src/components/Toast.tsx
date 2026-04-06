'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  onDone: () => void
}

export default function Toast({ message, onDone }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slide up immediately
    const show = requestAnimationFrame(() => setVisible(true))

    // Fade out after 2.8s, then notify parent to unmount
    const hide = setTimeout(() => setVisible(false), 2800)
    const done = setTimeout(() => onDone(), 3200) // matches fade-out duration

    return () => {
      cancelAnimationFrame(show)
      clearTimeout(hide)
      clearTimeout(done)
    }
  }, [onDone])

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '12px'})`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        zIndex: 9999,
        pointerEvents: 'none',

        /* Pill */
        padding: '8px 18px',
        borderRadius: 999,
        background: 'var(--surface-3)',
        border: '0.5px solid var(--border-gold)',

        /* Text */
        color: 'var(--gold-light)',
        fontSize: 12.5,
        fontWeight: 400,
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </div>
  )
}
