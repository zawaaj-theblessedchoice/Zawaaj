'use client'

import { useEffect } from 'react'

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  width?: number
}

export default function SlidePanel({
  open,
  onClose,
  children,
  width = 350,
}: SlidePanelProps) {
  // Lock body scroll while panel is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
          zIndex: 400,
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width,
          background: 'var(--surface-2)',
          borderLeft: '0.5px solid var(--border-default)',
          transform: `translateX(${open ? '0' : '100%'})`,
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 401,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* × close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'sticky',
            top: 14,
            marginLeft: 'auto',
            marginRight: 14,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 27,
            height: 27,
            borderRadius: '50%',
            background: 'var(--surface-3)',
            border: '0.5px solid var(--border-default)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path
              d="M1 1l9 9M10 1L1 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {children}
      </div>
    </>
  )
}
