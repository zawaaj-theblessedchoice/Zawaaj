'use client'

import { useEffect, useRef, useState } from 'react'

// ─── Standalone colour palette ─────────────────────────────────────────────────
// All values are literal hex / rgba — no globals.css dependency.

const C = {
  // Gold
  gold:         '#B8960C',
  goldLight:    '#D4AF37',
  goldMuted:    'rgba(184,150,12,0.09)',
  goldHair:     'rgba(184,150,12,0.28)',
  goldBorder:   'rgba(184,150,12,0.22)',
  goldBorderHi: 'rgba(184,150,12,0.40)',

  // Light variant surfaces
  ivoryBg:      '#F7F5F0',   // warm off-white page
  ivorySurface: '#FDFCF9',   // card surface
  ink:          '#111111',
  inkMid:       '#2B2825',
  dim:          '#5A5450',
  muted:        '#9A928A',
  borderLight:  'rgba(0,0,0,0.065)',
  borderMid:    'rgba(0,0,0,0.10)',

  // Dark variant surfaces
  darkBg:       '#0A0A0A',
  darkSurface:  '#111111',
  darkCard:     '#181818',
  darkBorder:   'rgba(255,255,255,0.06)',
  darkBorderHi: 'rgba(255,255,255,0.11)',
  darkText:     '#E5E1D8',
  darkDim:      '#8A8580',
  darkMuted:    '#5A5A5A',

  // Role accent — admin
  admin:        '#7C83FF',
  adminMuted:   'rgba(124,131,255,0.11)',
  adminBorder:  'rgba(124,131,255,0.28)',

  // Role accent — candidate (neutral warm)
  cand:         '#A09890',
  candMuted:    'rgba(160,152,144,0.10)',
  candBorder:   'rgba(160,152,144,0.25)',
} as const

// ─── Journey data ──────────────────────────────────────────────────────────────

interface Step {
  label:   string
  detail:  string
  note?:   string
}

interface Phase {
  id:       string
  num:      number
  group:    string
  isMerge?: boolean
  family:   Step
  cand:     Step
  admin:    Step
}

const PHASES: Phase[] = [
  {
    id: 'start', num: 1, group: 'Begin',
    family: {
      label:  'Parent / guardian registers',
      detail: 'Guardian creates the family account and submits contact details for verification',
      note:   'Path A',
    },
    cand: {
      label:  'Candidate registers',
      detail: 'Candidate creates their own profile independently and submits it for review',
      note:   'Path B',
    },
    admin: {
      label:  'Submission received',
      detail: 'Our team receives the registration and queues it for careful review',
    },
  },
  {
    id: 'alignment', num: 2, group: 'Family alignment',
    family: {
      label:  'Representative joins',
      detail: 'The family representative accepts their invite and links to the account',
    },
    cand: {
      label:  'Profile under review',
      detail: 'The Zawaaj team reviews all profile details before it can go live',
    },
    admin: {
      label:  'Profile approved',
      detail: 'Admin verifies every detail and approves the profile for the directory',
      note:   'Reviewed by our team',
    },
  },
  {
    id: 'matching', num: 3, group: 'Private matching',
    family: {
      label:  'Family ready to proceed',
      detail: 'Representative confirms the family is ready and manages the contact route',
    },
    cand: {
      label:  'Browse privately',
      detail: 'Candidate explores the directory and may shortlist profiles of interest',
      note:   'No direct messaging',
    },
    admin: {
      label:  'Progress monitored',
      detail: 'Admin tracks mutual interests and ensures the process moves forward',
    },
  },
  {
    id: 'introduction', num: 4, group: 'Introduction',
    isMerge: true,
    family: {
      label:  'Contact details received',
      detail: 'Representative receives the other family\'s verified contact information',
      note:   'Contact shared only here',
    },
    cand: {
      label:  'Introduction confirmed',
      detail: 'Candidate is informed that the introduction has been formally made',
    },
    admin: {
      label:  'Admin facilitates',
      detail: 'Admin verifies both families\' contacts and makes the formal introduction',
      note:   'Family-led confirmation',
    },
  },
]

const ROLES = [
  {
    key:   'family' as const,
    label: 'Family / Representative',
    color:  C.gold,
    muted:  C.goldMuted,
    border: C.goldBorder,
  },
  {
    key:   'cand' as const,
    label: 'Candidate',
    color:  C.cand,
    muted:  C.candMuted,
    border: C.candBorder,
  },
  {
    key:   'admin' as const,
    label: 'Zawaaj Admin',
    color:  C.admin,
    muted:  C.adminMuted,
    border: C.adminBorder,
  },
]

// ─── Scroll-reveal hook ────────────────────────────────────────────────────────

function useReveal(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setOn(true); return }
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, on }
}

// ─── Inline responsive style injection ────────────────────────────────────────
// Injects a single <style> block. Idempotent — guarded by ID.

const STYLE_ID = 'zjm-styles'
const STYLES = `
  .zjm-lanes {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
  }
  .zjm-lane-col {
    border-left: 1px solid var(--zjm-border, rgba(0,0,0,0.065));
  }
  .zjm-lane-col:first-child {
    border-left: none;
  }
  .zjm-role-headers {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
  }
  @media (max-width: 720px) {
    .zjm-lanes {
      grid-template-columns: 1fr;
    }
    .zjm-lane-col {
      border-left: none;
      border-top: 1px solid var(--zjm-border, rgba(0,0,0,0.065));
    }
    .zjm-lane-col:first-child {
      border-top: none;
    }
    .zjm-role-headers {
      display: none;
    }
    .zjm-mobile-role-tag {
      display: flex !important;
    }
  }
`

function useStyles() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return
    const el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = STYLES
    document.head.appendChild(el)
    return () => { el.remove() }
  }, [])
}

// ─── SVG icons ─────────────────────────────────────────────────────────────────

function FamilyIcon({ s = 16, c = 'currentColor' }: { s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function CandidateIcon({ s = 16, c = 'currentColor' }: { s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
    </svg>
  )
}

function AdminIcon({ s = 16, c = 'currentColor' }: { s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

const ROLE_ICONS = {
  family: FamilyIcon,
  cand:   CandidateIcon,
  admin:  AdminIcon,
}

// ─── Shared section header ─────────────────────────────────────────────────────

function SectionHeader({ dark }: { dark?: boolean }) {
  const { ref, on } = useReveal(0.1)
  return (
    <div
      ref={ref}
      style={{
        textAlign: 'center',
        padding: 'clamp(52px, 8vw, 88px) 24px clamp(40px, 6vw, 68px)',
        maxWidth: 620,
        margin: '0 auto',
        opacity: on ? 1 : 0,
        transform: on ? 'none' : 'translateY(20px)',
        transition: 'opacity 0.65s ease, transform 0.65s ease',
      }}
    >
      <p style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: C.gold,
        marginBottom: 18,
      }}>
        The Zawaaj Journey
      </p>
      <h2 style={{
        fontSize: 'clamp(24px, 4vw, 36px)',
        fontWeight: 700,
        lineHeight: 1.2,
        color: dark ? C.darkText : C.ink,
        margin: '0 0 18px',
        letterSpacing: '-0.01em',
      }}>
        A Clear Family-Led Path<br />to Marriage
      </h2>
      <p style={{
        fontSize: 15,
        color: dark ? C.darkDim : C.dim,
        lineHeight: 1.75,
        margin: 0,
        maxWidth: 480,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        Candidates, representatives, and our team each play a clear role
        in a private and dignified process.
      </p>
    </div>
  )
}

// ─── Principles footer strip ───────────────────────────────────────────────────

const PRINCIPLES = [
  'No direct messaging between members',
  'Contact shared only after introduction',
  'Every profile reviewed by our team',
  'Family representative always central',
]

function PrinciplesStrip({ dark }: { dark?: boolean }) {
  const { ref, on } = useReveal(0.1)
  return (
    <div
      ref={ref}
      style={{
        padding: '28px 0 72px',
        opacity: on ? 1 : 0,
        transition: 'opacity 0.6s ease 0.2s',
      }}
    >
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
        padding: '20px 24px',
        borderRadius: 14,
        background: dark
          ? 'rgba(255,255,255,0.025)'
          : C.ivorySurface,
        border: `1px solid ${dark ? C.darkBorder : C.borderLight}`,
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: dark ? C.darkMuted : C.muted,
          marginRight: 6,
          flexShrink: 0,
        }}>
          Always true
        </span>
        {PRINCIPLES.map(p => (
          <span key={p} style={{
            fontSize: 11.5,
            color: dark ? C.darkDim : C.dim,
            padding: '4px 12px',
            borderRadius: 999,
            border: `0.5px solid ${dark ? C.darkBorderHi : C.borderMid}`,
            background: dark ? 'rgba(255,255,255,0.03)' : 'transparent',
          }}>
            {p}
          </span>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// VARIANT A — Editorial / Luxury Minimal (light, ivory)
// ══════════════════════════════════════════════════════════════════════════════

function PhaseRowA({ phase }: { phase: Phase }) {
  const { ref, on } = useReveal(0.08)

  return (
    <div
      ref={ref}
      style={{
        borderBottom: `1px solid ${phase.isMerge ? C.goldBorderHi : C.borderLight}`,
        background: phase.isMerge
          ? 'linear-gradient(to bottom, rgba(184,150,12,0.05), rgba(184,150,12,0.025))'
          : 'transparent',
        borderLeft:  phase.isMerge ? `2px solid ${C.goldHair}` : 'none',
        borderRight: phase.isMerge ? `2px solid ${C.goldHair}` : 'none',
      }}
    >
      {/* Phase label */}
      <div style={{
        padding: '16px 28px 0',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: on ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}>
        {/* Phase number — large watermark-style */}
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: phase.isMerge ? C.gold : C.muted,
          background: phase.isMerge ? C.goldMuted : 'transparent',
          border: phase.isMerge ? `0.5px solid ${C.goldBorder}` : 'none',
          borderRadius: phase.isMerge ? 999 : 0,
          padding: phase.isMerge ? '3px 12px' : '0',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {phase.isMerge ? (
            <>
              <span style={{ fontSize: 9 }}>◆</span>
              {phase.group}
            </>
          ) : (
            <>
              <span style={{ fontWeight: 400, opacity: 0.5 }}>{phase.num}.</span>
              {phase.group}
            </>
          )}
        </span>
        {phase.num === 1 && (
          <span style={{ fontSize: 11, color: C.muted, fontStyle: 'italic' }}>
            Two entry paths — one journey
          </span>
        )}
        {phase.isMerge && (
          <span style={{ fontSize: 11, color: C.dim, fontStyle: 'italic' }}>
            All paths converge
          </span>
        )}
      </div>

      {/* Three-lane content */}
      <div className="zjm-lanes" style={{ '--zjm-border': C.borderLight } as React.CSSProperties}>
        {ROLES.map(({ key, label, color }, i) => {
          const step = phase[key]
          return (
            <div
              key={key}
              className="zjm-lane-col"
              style={{
                padding: '22px 28px 30px',
                position: 'relative',
                opacity: on ? 1 : 0,
                transform: on ? 'none' : 'translateY(14px)',
                transition: `opacity 0.55s ease ${i * 85}ms, transform 0.55s ease ${i * 85}ms`,
              }}
            >
              {/* Mobile role tag */}
              <div
                className="zjm-mobile-role-tag"
                style={{
                  display: 'none',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>
                  {label}
                </span>
              </div>

              {/* Vertical track line */}
              <div style={{
                position: 'absolute',
                left: 13,
                top: 0,
                bottom: 0,
                width: 1,
                background: `linear-gradient(to bottom, transparent 0px, ${color}30 12px, ${color}30 calc(100% - 12px), transparent 100%)`,
              }} />

              {/* Node dot */}
              <div style={{
                position: 'absolute',
                left: 9,
                top: 28,
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 0 3px ${C.ivoryBg}, 0 0 0 4.5px ${color}45`,
                zIndex: 1,
              }} />

              <div style={{ paddingLeft: 22 }}>
                {/* Note badge */}
                {step.note && (
                  <div style={{
                    display: 'inline-block',
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    color: color,
                    background: `${color}12`,
                    border: `0.5px solid ${color}38`,
                    borderRadius: 999,
                    padding: '2.5px 9px',
                    marginBottom: 9,
                  }}>
                    {step.note}
                  </div>
                )}

                <p style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.ink,
                  margin: '0 0 7px',
                  lineHeight: 1.3,
                }}>
                  {step.label}
                </p>
                <p style={{
                  fontSize: 12.5,
                  color: C.dim,
                  margin: 0,
                  lineHeight: 1.65,
                }}>
                  {step.detail}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VariantA() {
  useStyles()
  const { ref: headerRef, on: headerOn } = useReveal(0.05)

  return (
    <div style={{ background: C.ivoryBg, color: C.ink }}>
      <SectionHeader />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
        {/* Lane role headers — desktop only */}
        <div
          ref={headerRef}
          className="zjm-role-headers"
          style={{
            borderBottom: `1.5px solid ${C.borderMid}`,
            borderTop: `1.5px solid ${C.borderMid}`,
            opacity: headerOn ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}
        >
          {ROLES.map(({ key, label, color }, i) => {
            const Icon = ROLE_ICONS[key]
            return (
              <div
                key={key}
                style={{
                  padding: '18px 28px',
                  borderLeft: i > 0 ? `1px solid ${C.borderMid}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                }}
              >
                <Icon s={17} c={color} />
                <span style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: C.inkMid,
                  letterSpacing: '0.005em',
                }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Phase rows */}
        {PHASES.map(phase => (
          <PhaseRowA key={phase.id} phase={phase} />
        ))}

        {/* Principles strip */}
        <PrinciplesStrip />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// VARIANT B — Structured Premium Workflow (dark)
// ══════════════════════════════════════════════════════════════════════════════

function PhaseRowB({ phase, idx }: { phase: Phase; idx: number }) {
  const { ref, on } = useReveal(0.08)
  const isMerge = !!phase.isMerge

  return (
    <div
      ref={ref}
      style={{
        marginBottom: 14,
        borderRadius: 14,
        border: isMerge
          ? `1px solid ${C.goldBorderHi}`
          : `1px solid ${C.darkBorder}`,
        overflow: 'hidden',
        background: isMerge ? 'rgba(184,150,12,0.055)' : C.darkCard,
        boxShadow: isMerge
          ? `0 0 40px rgba(184,150,12,0.07)`
          : '0 1px 3px rgba(0,0,0,0.3)',
      }}
    >
      {/* Phase header band */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 20px',
        borderBottom: `1px solid ${isMerge ? C.goldBorder : C.darkBorder}`,
        background: isMerge
          ? 'rgba(184,150,12,0.07)'
          : 'rgba(255,255,255,0.02)',
        opacity: on ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}>
        {/* Numbered chip */}
        <span style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          background: isMerge ? C.gold : 'rgba(255,255,255,0.055)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: isMerge ? '#000' : C.darkDim,
          flexShrink: 0,
          letterSpacing: '0',
        }}>
          {phase.num}
        </span>

        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: isMerge ? C.gold : C.darkDim,
        }}>
          {phase.group}
        </span>

        {phase.num === 1 && (
          <span style={{ fontSize: 11, color: C.darkMuted, marginLeft: 2, fontStyle: 'italic' }}>
            Two entry paths
          </span>
        )}
        {isMerge && (
          <span style={{ fontSize: 11, color: `${C.gold}90`, marginLeft: 2, fontStyle: 'italic' }}>
            — All paths converge
          </span>
        )}
      </div>

      {/* Three lane cards */}
      <div className="zjm-lanes" style={{ '--zjm-border': C.darkBorder } as React.CSSProperties}>
        {ROLES.map(({ key, label, color }, i) => {
          const step = phase[key]
          return (
            <div
              key={key}
              className="zjm-lane-col"
              style={{
                padding: '22px 22px 26px',
                borderTop: `2px solid ${color}`,
                opacity: on ? 1 : 0,
                transform: on ? 'none' : 'translateY(10px)',
                transition: `opacity 0.5s ease ${i * 90 + 80}ms, transform 0.5s ease ${i * 90 + 80}ms`,
              }}
            >
              {/* Mobile role tag */}
              <div
                className="zjm-mobile-role-tag"
                style={{
                  display: 'none',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.darkMuted }}>
                  {label}
                </span>
              </div>

              {step.note && (
                <div style={{
                  display: 'inline-block',
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color,
                  background: `${color}14`,
                  border: `0.5px solid ${color}38`,
                  borderRadius: 999,
                  padding: '2.5px 9px',
                  marginBottom: 11,
                }}>
                  {step.note}
                </div>
              )}

              <p style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: C.darkText,
                margin: '0 0 8px',
                lineHeight: 1.3,
              }}>
                {step.label}
              </p>
              <p style={{
                fontSize: 12,
                color: C.darkDim,
                margin: 0,
                lineHeight: 1.65,
              }}>
                {step.detail}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VariantB() {
  useStyles()
  const { ref: rolesRef, on: rolesOn } = useReveal(0.05)

  return (
    <div style={{ background: C.darkBg, color: C.darkText }}>
      <SectionHeader dark />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 0' }}>
        {/* Role header cards */}
        <div
          ref={rolesRef}
          className="zjm-role-headers"
          style={{
            gap: 10,
            marginBottom: 28,
            opacity: rolesOn ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}
        >
          {ROLES.map(({ key, label, color, muted, border }, i) => {
            const Icon = ROLE_ICONS[key]
            return (
              <div
                key={key}
                style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  background: muted,
                  border: `1px solid ${border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginLeft: i > 0 ? 10 : 0,
                  opacity: rolesOn ? 1 : 0,
                  transform: rolesOn ? 'none' : 'translateY(8px)',
                  transition: `opacity 0.45s ease ${i * 80}ms, transform 0.45s ease ${i * 80}ms`,
                }}
              >
                <Icon s={19} c={color} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C.darkText }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Connector hint — "two paths, one journey" */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${C.goldHair})` }} />
          <span style={{ fontSize: 11, color: C.darkMuted, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
            Family or candidate may begin first — both paths lead here
          </span>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${C.goldHair})` }} />
        </div>

        {/* Phase rows */}
        {PHASES.map((phase, idx) => (
          <PhaseRowB key={phase.id} phase={phase} idx={idx} />
        ))}

        {/* Principles strip */}
        <PrinciplesStrip dark />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main export
// ══════════════════════════════════════════════════════════════════════════════

export type Variant = 'A' | 'B'

export interface ZawaajUnifiedJourneyMapProps {
  variant?: Variant
}

export function ZawaajUnifiedJourneyMap({ variant = 'A' }: ZawaajUnifiedJourneyMapProps) {
  return variant === 'A' ? <VariantA /> : <VariantB />
}
