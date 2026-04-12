'use client'

import { useState } from 'react'
import Link from 'next/link'
import ZawaajLogo from '@/components/ZawaajLogo'

// ─── Full comparison table data ───────────────────────────────────────────────

type CellValue = string | boolean

const SECTIONS: Array<{
  title: string
  rows: Array<{ feature: string; desc: string; free: CellValue; plus: CellValue; premium: CellValue }>
}> = [
  {
    title: 'Access & discovery',
    rows: [
      { feature: 'Profile creation', desc: 'Create and submit your profile for admin review', free: true, plus: true, premium: true },
      { feature: 'Discover profiles', desc: 'Browse all approved profiles with filters and sorting', free: true, plus: true, premium: true },
      { feature: 'Shortlist profiles', desc: 'Save profiles privately to revisit before requesting', free: true, plus: true, premium: true },
      { feature: 'Compatibility highlights', desc: 'Auto-generated match points vs your preferences', free: true, plus: true, premium: true },
      { feature: 'Full profile detail', desc: 'Extended bio, faith depth, lifestyle notes — on received interests', free: 'Summary only', plus: true, premium: true },
      { feature: 'New profile alerts', desc: 'Notified when matching profiles are listed', free: false, plus: true, premium: true },
    ],
  },
  {
    title: 'Introductions',
    rows: [
      { feature: 'Monthly interest expressions / profile', desc: 'Interest expressions per profile per calendar month', free: '5', plus: '15', premium: 'Unlimited' },
      { feature: 'Candidate profiles', desc: 'Number of candidate profiles per family account', free: 'Up to 2', plus: 'Up to 4', premium: 'Up to 4' },
      { feature: 'Mutual match notifications', desc: 'Alert when mutual interest confirmed', free: true, plus: true, premium: true },
      { feature: 'Admin-facilitated introduction', desc: 'Admin personally shares contact details on confirmation', free: true, plus: true, premium: true },
      { feature: 'Dedicated manager', desc: 'Named manager assigned to your family account', free: false, plus: false, premium: true },
      { feature: 'Manager follow-up after introduction', desc: 'Manager checks in after introductions are made', free: false, plus: false, premium: true },
      { feature: 'Concierge matching', desc: 'Admin proactively suggests compatible profiles', free: false, plus: false, premium: true },
    ],
  },
  {
    title: 'Visibility & reach',
    rows: [
      { feature: 'Profile boost', desc: 'Featured at top of browse results temporarily', free: false, plus: '1× / month', premium: 'Weekly' },
      { feature: 'Spotlight listing', desc: 'Pinned with badge at top of browse sections for 7 days', free: false, plus: false, premium: '1× / month' },
      { feature: 'See who viewed your profile', desc: 'View when members open your profile, with timestamps', free: false, plus: false, premium: true },
      { feature: 'Profile share link', desc: 'Private auth-gated link to share with family/contacts', free: true, plus: true, premium: true },
    ],
  },
  {
    title: 'Support & extras',
    rows: [
      { feature: 'Email support', desc: 'Contact the Zawaaj team for help', free: 'Standard', plus: 'Priority', premium: 'Priority' },
      { feature: 'Events access', desc: 'Community and family events', free: 'Selected only', plus: true, premium: true },
      { feature: 'Activity history', desc: 'Past requests, matches, and interactions', free: 'Last 30 days', plus: 'Full', premium: 'Full' },
      { feature: 'Light & dark mode', desc: 'Theme preference in settings', free: true, plus: true, premium: true },
    ],
  },
]

function Cell({ value }: { value: CellValue }) {
  if (value === true) return <span className="text-[var(--status-success)] text-base">✓</span>
  if (value === false) return <span className="text-white/20 text-base">—</span>
  return <span className="text-white/70 text-xs">{value}</span>
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)

  const plans = [
    { name: 'Voluntary', monthly: 0, annual: 0, highlight: false, ctaLabel: 'Get started', cta: '/signup' },
    { name: 'Zawaaj Plus', monthly: 9, annual: 7, highlight: true, ctaLabel: 'Get Plus', cta: '/signup' },
    { name: 'Zawaaj Premium', monthly: 19, annual: 15, highlight: false, ctaLabel: 'Get Premium', cta: '/signup' },
  ]

  return (
    <div className="min-h-screen" data-theme="dark" style={{ background: 'var(--surface)', color: 'var(--text-primary)' }}>

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-surface/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/"><ZawaajLogo size={32} tagline={false} /></Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/60 hover:text-white px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="text-sm font-semibold px-4 py-2 rounded-xl bg-gold text-black hover:bg-[var(--gold-hover)] transition-colors">
              Create profile
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 py-20">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">Membership</p>
          <h1 className="text-4xl font-bold text-white mb-4">Simple, transparent pricing</h1>
          <p className="text-white/50 max-w-xl mx-auto text-sm leading-relaxed">
            All tiers include admin-mediated introductions — contact details are never shared directly between members.
            Prices in GBP. Cancel or change plan at any time. No contracts.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 mt-8 bg-surface-2 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${!annual ? 'bg-gold text-black' : 'text-white/50 hover:text-white'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${annual ? 'bg-gold text-black' : 'text-white/50 hover:text-white'}`}
            >
              Annual <span className="ml-1 text-xs font-normal opacity-70">· Save 20%</span>
            </button>
          </div>
        </div>

        {/* Price header row */}
        <div className="grid grid-cols-4 gap-4 mb-2">
          <div /> {/* feature column spacer */}
          {plans.map(p => {
            const price = annual ? p.annual : p.monthly
            return (
              <div key={p.name} className={`rounded-2xl p-5 text-center border ${
                p.highlight
                  ? 'bg-surface-2 border-gold/50'
                  : 'bg-surface-2 border-white/10'
              }`}>
                {p.highlight && (
                  <div className="mb-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gold text-black">Popular</span>
                  </div>
                )}
                <p className="text-xs text-white/50 font-medium mb-1">{p.name}</p>
                <div className="flex items-end justify-center gap-1">
                  {price === 0 ? (
                    <span className="text-2xl font-bold text-white">Free</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-white">£{price}</span>
                      <span className="text-white/40 text-xs mb-1">/mo</span>
                    </>
                  )}
                </div>
                {annual && p.monthly > 0 && (
                  <p className="text-xs text-gold mt-1">£{p.annual * 12}/yr · save 20%</p>
                )}
                <Link href={p.cta}
                  className={`mt-3 block py-2 rounded-xl text-xs font-semibold transition-colors ${
                    p.highlight
                      ? 'bg-gold text-black hover:bg-[var(--gold-hover)]'
                      : 'border border-white/15 text-white hover:bg-white/5'
                  }`}>
                  {p.ctaLabel}
                </Link>
              </div>
            )
          })}
        </div>

        {/* Full comparison table */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          {SECTIONS.map((section, si) => (
            <div key={section.title}>
              {/* Section header */}
              <div className="grid grid-cols-4 gap-4 px-5 py-3 bg-surface-3 border-t border-white/8">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wide col-span-1">{section.title}</p>
                <div className="col-span-3" />
              </div>
              {/* Rows */}
              {section.rows.map((row, ri) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-4 gap-4 px-5 py-3.5 items-center ${
                    si % 2 === 0 && ri % 2 === 0 ? 'bg-surface-2' : 'bg-surface'
                  } border-t border-white/5`}
                >
                  <div className="col-span-1">
                    <p className="text-sm text-white font-medium">{row.feature}</p>
                    <p className="text-xs text-white/35 mt-0.5">{row.desc}</p>
                  </div>
                  <div className="text-center"><Cell value={row.free} /></div>
                  <div className="text-center"><Cell value={row.plus} /></div>
                  <div className="text-center"><Cell value={row.premium} /></div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-white/30 mt-8 max-w-2xl mx-auto leading-relaxed">
          All tiers include admin-mediated introductions — contact details are never shared directly between members.
          Prices in GBP. Cancel or change plan at any time. No contracts.
        </p>

        {/* Back to home */}
        <div className="text-center mt-10">
          <Link href="/" className="text-sm text-gold hover:underline">← Back to home</Link>
        </div>
      </div>
    </div>
  )
}
