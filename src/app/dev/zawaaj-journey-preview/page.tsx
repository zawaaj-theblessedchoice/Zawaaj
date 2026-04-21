'use client'

import { useState } from 'react'
import {
  ZawaajUnifiedJourneyMap,
  type Variant,
} from '@/components/marketing/ZawaajUnifiedJourneyMap'

// ─── Preview shell ─────────────────────────────────────────────────────────────

const VARIANT_META: Record<Variant, { label: string; desc: string; bgHint: string }> = {
  A: {
    label:  'A — Editorial (light)',
    desc:   'Warm ivory · hairline gold lanes · typographic nodes · minimal luxury',
    bgHint: '#F7F5F0',
  },
  B: {
    label:  'B — Structured (dark)',
    desc:   'Deep black · role header cards · bordered phase blocks · premium workflow',
    bgHint: '#0A0A0A',
  },
}

export default function ZawaajJourneyPreviewPage() {
  const [variant, setVariant] = useState<Variant>('A')
  const [showBoth, setShowBoth] = useState(false)

  return (
    <>
      {/* ── Sticky review toolbar ── */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(12,12,12,0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}>
        {/* Zawaaj wordmark */}
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#B8960C',
          letterSpacing: '0.08em',
          marginRight: 8,
          flexShrink: 0,
        }}>
          ZAWAAJ
        </span>

        <span style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
          marginRight: 6,
          flexShrink: 0,
        }}>
          Journey Map · Review
        </span>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

        {/* Variant buttons */}
        {(Object.entries(VARIANT_META) as [Variant, typeof VARIANT_META[Variant]][]).map(([v, meta]) => (
          <button
            key={v}
            onClick={() => { setVariant(v); setShowBoth(false) }}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              background: variant === v && !showBoth ? '#B8960C' : 'rgba(255,255,255,0.06)',
              border: variant === v && !showBoth
                ? 'none'
                : '1px solid rgba(255,255,255,0.12)',
              color: variant === v && !showBoth ? '#000' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            {meta.label}
          </button>
        ))}

        {/* Show both toggle */}
        <button
          onClick={() => setShowBoth(b => !b)}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            background: showBoth ? 'rgba(255,255,255,0.12)' : 'transparent',
            border: '1px solid rgba(255,255,255,0.12)',
            color: showBoth ? '#fff' : 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          Show both
        </button>

        {/* Right-side note */}
        <span style={{
          marginLeft: 'auto',
          fontSize: 10.5,
          color: 'rgba(255,255,255,0.25)',
          fontStyle: 'italic',
          flexShrink: 0,
        }}>
          Standalone review — homepage unchanged
        </span>
      </div>

      {/* ── Variant description bar ── */}
      {!showBoth && (
        <div style={{
          position: 'fixed',
          top: 45,
          left: 0,
          right: 0,
          zIndex: 999,
          background: `${VARIANT_META[variant].bgHint}ee`,
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid rgba(${variant === 'A' ? '0,0,0' : '255,255,255'},0.07)`,
          padding: '7px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 11, color: '#B8960C', fontWeight: 600 }}>
            Variant {variant}
          </span>
          <span style={{
            fontSize: 11,
            color: variant === 'A' ? '#7A7570' : '#5A5A5A',
          }}>
            {VARIANT_META[variant].desc}
          </span>
        </div>
      )}

      {/* ── Component render area ── */}
      <div style={{ paddingTop: showBoth ? 48 : 72 }}>
        {showBoth ? (
          <>
            {/* Label A */}
            <div style={{
              background: '#111',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#B8960C', letterSpacing: '0.08em' }}>
                VARIANT A
              </span>
              <span style={{ fontSize: 11, color: '#555' }}>
                Editorial / Luxury Minimal · Light
              </span>
            </div>
            <ZawaajUnifiedJourneyMap variant="A" />

            {/* Label B */}
            <div style={{
              background: '#111',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#B8960C', letterSpacing: '0.08em' }}>
                VARIANT B
              </span>
              <span style={{ fontSize: 11, color: '#555' }}>
                Structured Premium Workflow · Dark
              </span>
            </div>
            <ZawaajUnifiedJourneyMap variant="B" />
          </>
        ) : (
          <ZawaajUnifiedJourneyMap variant={variant} />
        )}

        {/* ── Design notes footer ── */}
        <div style={{
          background: '#0A0A0A',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '48px 32px',
          maxWidth: 860,
          margin: '0 auto',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B8960C', marginBottom: 24 }}>
            Design notes
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {[
              {
                head: 'Recommended variant',
                body: "Variant A. The ivory/editorial treatment is warmer, more trust-building, and better suited for the Zawaaj brand. It communicates elegance without tech-startup energy. Variant B works well as an alternate within the site's dark sections.",
              },
              {
                head: 'Three-role representation',
                body: "Each column maps to one role — Family, Candidate, Admin. Nodes sit on a continuous vertical track line per lane. At Phase 4, all lanes converge with a gold-tinted background band, making the 'everything flows to Admin' logic immediately visible.",
              },
              {
                head: 'Why it fits Zawaaj',
                body: "The swim-lane format communicates governance. No other matrimonial platform shows the admin as a lane-level actor. That structural choice immediately signals this is mediated, not casual — which is Zawaaj's core differentiation.",
              },
              {
                head: 'Not yet wired',
                body: 'This component is review-only. No homepage or global layout has been modified. To ship, replace the existing "How it works" section in LandingPage.tsx with <ZawaajUnifiedJourneyMap variant="A" />.',
              },
            ].map(note => (
              <div key={note.head}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                  {note.head}
                </p>
                <p style={{ fontSize: 12, color: '#5A5A5A', lineHeight: 1.7, margin: 0 }}>
                  {note.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
