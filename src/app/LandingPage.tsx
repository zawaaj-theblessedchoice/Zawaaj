'use client'

import { useState } from 'react'
import Link from 'next/link'
import ZawaajLogo from '@/components/ZawaajLogo'
import { PLAN_CONFIG, PLAN_PRICES, PLAN_LABELS } from '@/lib/plan-config'

// ─── Plan data — limits derived from central PLAN_CONFIG ─────────────────────

const PLANS = [
  {
    key: 'free',
    hidden: false,
    name: PLAN_LABELS.free,
    monthly: PLAN_PRICES.free.monthly,
    annual: PLAN_PRICES.free.annual,
    description: 'Everything you need to find your match, with full admin support.',
    cta: 'Create profile',
    ctaHref: '/signup',
    highlight: false,
    features: [
      'Browse all approved profiles',
      'Shortlist profiles privately',
      `${PLAN_CONFIG.free.monthlyLimit} interest expressions / month`,
      'Admin-facilitated introductions',
      'Mutual match notifications',
      'Invitation to selected community events',
    ],
  },
  {
    key: 'plus',
    hidden: true,
    name: PLAN_LABELS.plus,
    monthly: PLAN_PRICES.plus.monthly,
    annual: PLAN_PRICES.plus.annual,
    description: 'More requests, priority support, and greater visibility.',
    cta: 'Get Plus',
    ctaHref: '/signup',
    highlight: true,
    features: [
      `Everything in ${PLAN_LABELS.free}`,
      `${PLAN_CONFIG.plus.monthlyLimit} interest expressions / month`,
      `${PLAN_CONFIG.plus.boosts} profile boost / month`,
      'Detailed profiles provided',
      'New profile alerts',
      'Priority email support',
      'Priority invitation to all community events',
    ],
  },
  {
    key: 'premium',
    hidden: false,
    name: PLAN_LABELS.premium,
    monthly: PLAN_PRICES.premium.monthly,
    annual: PLAN_PRICES.premium.annual,
    description: 'Unlimited introductions, concierge matching, and full visibility.',
    cta: 'Get Premium',
    ctaHref: '/signup',
    highlight: false,
    features: [
      `Everything in ${PLAN_LABELS.free}`,
      `${limitLabel(PLAN_CONFIG.premium.monthlyLimit)} interest expressions / month`,
      'Weekly profile boosts',
      `${PLAN_CONFIG.premium.spotlight} spotlight listing / month`,
      'Concierge matching by admin',
      'See who viewed your profile',
      'Priority invitation to all community events',
    ],
  },
]

function limitLabel(n: number): string {
  return n === Infinity ? 'Unlimited' : String(n)
}

const COMPACT_COMPARISON = [
  { feature: 'Interest expressions / month', free: limitLabel(PLAN_CONFIG.free.monthlyLimit), plus: limitLabel(PLAN_CONFIG.plus.monthlyLimit), premium: limitLabel(PLAN_CONFIG.premium.monthlyLimit) },
  { feature: 'Family profiles',              free: '1',                                    plus: '4',                                   premium: '4' },
  { feature: 'Profile boost',                free: '—',                                    plus: '1× / month',                          premium: 'Weekly' },
  { feature: 'Concierge matching',           free: '—',                                    plus: '—',                                   premium: PLAN_CONFIG.premium.concierge ? 'Yes' : '—' },
  { feature: 'See who viewed you',           free: '—',                                    plus: '—',                                   premium: PLAN_CONFIG.premium.viewTracking ? 'Yes' : '—' },
  { feature: 'Profile access',               free: 'Summary of profiles',                  plus: 'Detailed profiles provided',               premium: 'Detailed profiles provided' },
]

const HOW_IT_WORKS = [
  { n: '01', title: 'Create your family account', body: 'Register as a parent, guardian, or candidate.\nYour verified family account becomes the secure base for all activity.' },
  { n: '02', title: 'Add a candidate profile', body: 'Create a profile for the person seeking marriage.\nEvery profile is personally reviewed before appearing live.' },
  { n: '03', title: 'Browse privately', body: 'View suitable profiles discreetly and express interest.\nNo direct communication takes place at this stage.' },
  { n: '04', title: 'Private response', body: 'The receiving family reviews the interest privately.\nThey may accept or decline respectfully within seven days.' },
  { n: '05', title: 'Mutual interest confirmed', body: 'If both sides wish to proceed, our team is notified.\nWe confirm mutual interest with both families.' },
  { n: '06', title: 'Introduction made', body: 'After verification and consent, contact details are shared.\nNothing is ever released automatically.' },
]

const VALUES = [
  {
    title: 'Halal and dignified by design',
    body: 'No direct messaging. No photos. Every introduction goes through our admin team.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  },
  {
    title: 'Privacy first',
    body: 'Contact details are never shared until both families are ready to proceed — coordinated personally by our team.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  },
  {
    title: 'Faith-centred',
    body: 'Built for Muslims who take marriage seriously.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c-2 0-3.5 1.8-3.5 3.5H15.5C15.5 3.8 14 2 12 2Z"/><rect x="3.5" y="7" width="3" height="13" rx="0.5"/><path d="M3.5 7c0-1.3 3-1.3 3 0"/><rect x="17.5" y="7" width="3" height="13" rx="0.5"/><path d="M17.5 7c0-1.3 3-1.3 3 0"/><rect x="8.5" y="5.5" width="7" height="14.5" rx="0.5"/><path d="M10 20c0-2 4-2 4 0"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  },
  {
    title: 'Community trust',
    body: 'Every profile is manually reviewed. We try our best to keep the platform high-quality and safe.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    title: 'Family-guided',
    body: 'Families connect with families — every introduction is coordinated personally by our team, keeping the process dignified and respectful.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    title: 'Guided by people, not algorithms',
    body: 'No automated scoring or matching systems. Real people personally review every profile and facilitate every introduction — because finding the right match deserves human care.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M19 8h2M3 8h2"/><path d="M19 4l1.5-1.5M3.5 10.5 2 12"/><path d="M19 12l1.5 1.5M3.5 5.5 2 4"/></svg>,
  },
]

const FAQS = [
  {
    q: 'How is Zawaaj different from other matrimonial apps?',
    a: 'There is no direct messaging and no photo sharing between members. Every introduction is personally coordinated by our admin team — families speak to families, not strangers to strangers.',
  },
  {
    q: 'Who reviews the profiles?',
    a: 'Our admin team personally reviews every application before it goes live. This keeps the community trusted and the matches meaningful.',
  },
  {
    q: 'Can I see who expressed interest in me?',
    a: 'One-sided interest is completely private — the other family is never notified. You are only informed when interest is mutual and our team is ready to facilitate.',
  },
  {
    q: 'How does the introduction work?',
    a: 'When interest is mutual, our admin team reaches out to both families separately. If both are ready to proceed, we connect both families directly and facilitate the introduction personally.',
  },
  {
    q: 'What if I want to pause or withdraw?',
    a: 'You can pause or withdraw your profile at any time from your profile settings. Your data is preserved in case you return.',
  },
  {
    q: 'Is there a free option?',
    a: `Yes. The Community Access tier gives you full access to browse profiles and send ${PLAN_CONFIG.free.monthlyLimit} interest expressions per month — completely free. Our Premium plan adds more expressions and visibility features.`,
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-br">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-base font-medium text-ink">{q}</span>
        <span className="text-gold text-xl flex-shrink-0">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="pb-5 text-sm text-dim leading-relaxed">{a}</p>}
    </div>
  )
}

function PlanCard({ plan, annual }: { plan: typeof PLANS[number]; annual: boolean }) {
  const price = annual ? plan.annual : plan.monthly
  const saving = annual && plan.monthly > 0

  return (
    <div className={`relative rounded-2xl p-6 flex flex-col gap-5 border ${
      plan.highlight
        ? 'bg-surface-2 border-gold/40 shadow-[0_0_24px_rgba(184,150,12,0.08)]'
        : 'bg-surface-2 border-br'
    }`}>
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gold text-black">Most popular</span>
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-dim">{plan.name}</p>
        <div className="mt-1 flex items-end gap-1">
          {price === 0 ? (
            <span className="text-3xl font-bold text-ink">Free</span>
          ) : (
            <>
              <span className="text-3xl font-bold text-ink">£{price}</span>
              <span className="text-muted mb-1 text-sm">/mo</span>
            </>
          )}
        </div>
        {saving && (
          <span className="mt-1 inline-block text-xs text-gold font-medium">Save 20% · £{plan.annual * 12}/yr</span>
        )}
        <p className="mt-2 text-sm text-muted">{plan.description}</p>
      </div>

      <ul className="space-y-2 flex-1">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-dim">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#7A6020', flexShrink: 0, marginTop: 2 }}>
              <path d="M3 8l3.5 3.5L13 4.5" stroke="#7A6020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {f}
          </li>
        ))}
      </ul>

      {/* Mobile plan highlights — shown instead of comparison table */}
      <div className="md:hidden mt-1">
        {COMPACT_COMPARISON.map(row => {
          const val = row[plan.key as 'free' | 'plus' | 'premium']
          if (val === '—') return null
          return (
            <div key={row.feature} className="flex items-center gap-2 text-xs text-muted mt-1">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M3 8l3.5 3.5L13 4.5" stroke="#7A6020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{row.feature}: <span className="text-dim">{val}</span></span>
            </div>
          )
        })}
      </div>

      <Link
        href={plan.ctaHref}
        className="block text-center py-3 rounded-xl text-sm font-semibold transition-colors bg-gold text-black hover:bg-[var(--gold-hover)]"
      >
        {plan.cta}
      </Link>
    </div>
  )
}

// ─── Homepage events types ────────────────────────────────────────────────────

export interface HomepageEvent {
  id: string
  title: string
  event_date: string
  location_text: string | null
  is_online: boolean
  event_category: string | null
  organiser: string | null
  organiser_label: string | null
  price_gbp: number
}

const CATEGORY_LABELS: Record<string, string> = {
  workshop: 'Workshop',
  webinar: 'Webinar',
  matrimonial: 'Matrimonial',
  community: 'Community',
}

function formatHomepageEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function HomepageEventCard({ event }: { event: HomepageEvent }) {
  const showRohBadge = event.organiser === 'radiance_of_hope' || event.organiser === 'both'
  const categoryLabel = event.event_category ? CATEGORY_LABELS[event.event_category] : null
  const locationLabel = event.is_online ? 'Online' : (event.location_text ?? null)

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--border-default)',
        borderTop: '3px solid var(--gold)',
        borderRadius: 14,
        padding: '20px 22px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {categoryLabel && (
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: 'var(--gold)',
            background: 'var(--gold-muted)',
            border: '0.5px solid var(--border-gold)',
            borderRadius: 999,
            padding: '2px 8px',
          }}>
            {categoryLabel}
          </span>
        )}
        {showRohBadge && (
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: '#0d9488',
            background: 'rgba(13,148,136,0.1)',
            border: '0.5px solid rgba(13,148,136,0.3)',
            borderRadius: 999,
            padding: '2px 8px',
          }}>
            {event.organiser_label ?? 'Radiance of Hope'}
          </span>
        )}
      </div>

      <h3 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
        {event.title}
      </h3>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
            <rect x="1" y="2.5" width="11" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
            <path d="M1 5.5h11M4.5 1v3M8.5 1v3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
          {formatHomepageEventDate(event.event_date)}
        </span>
        {locationLabel && (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="11" height="12" viewBox="0 0 12 13" fill="none" style={{ flexShrink: 0 }}>
              <path d="M6 1a3.5 3.5 0 0 1 3.5 3.5C9.5 7.5 6 12 6 12S2.5 7.5 2.5 4.5A3.5 3.5 0 0 1 6 1Z" stroke="currentColor" strokeWidth="1.1" />
              <circle cx="6" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1.1" />
            </svg>
            {locationLabel}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: event.price_gbp > 0 ? 'var(--text-primary)' : '#0d9488' }}>
          {event.price_gbp > 0 ? `£${event.price_gbp}` : 'Free'}
        </span>
      </div>
    </div>
  )
}

// ─── Main landing page ────────────────────────────────────────────────────────

export default function LandingPage({ isLoggedIn = false, featuredEvents = [] }: { isLoggedIn?: boolean; featuredEvents?: HomepageEvent[] }) {
  const [annual, setAnnual] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)', color: 'var(--text-primary)' }}>

      {/* ── Nav ── logo left | links centre | CTA right */}
      <nav className="sticky top-0 z-50 border-b border-br bg-surface/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-16 grid grid-cols-2 md:grid-cols-3 items-center">

          {/* Left — logo only */}
          <div className="flex items-center">
            <Link href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <img src="/zawaaj-wordmark.png" alt="Zawaaj" style={{ height: 28, width: 'auto' }} />
            </Link>
          </div>

          {/* Centre — navigation links (desktop) */}
          <div className="hidden md:flex items-center justify-center gap-5 text-sm text-dim">
            <a href="#how-it-works" className="hover:text-ink transition-colors whitespace-nowrap">How it works</a>
            <a href="#values" className="hover:text-ink transition-colors whitespace-nowrap">Our values</a>
            <a href="#membership" className="hover:text-ink transition-colors whitespace-nowrap">Membership</a>
            <Link href="/events" className="hover:text-ink transition-colors whitespace-nowrap">Events</Link>
            <a href="#faq" className="hover:text-ink transition-colors whitespace-nowrap">FAQ</a>
          </div>

          {/* Right — primary action (desktop) + hamburger (mobile) */}
          <div className="flex items-center justify-end gap-3">
            {/* Desktop CTAs */}
            {isLoggedIn ? (
              <Link
                href="/browse"
                className="hidden md:inline-flex text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
                style={{ background: 'var(--gold)', color: '#000' }}
              >
                Browse profiles →
              </Link>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border-default)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border-default)' }}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
                  style={{ background: 'var(--gold)', color: '#000' }}
                >
                  Create profile
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
              className="md:hidden p-2 rounded-lg"
              style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {menuOpen ? (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M4 4l14 14M18 4L4 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>

        </div>

        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-200 ${menuOpen ? 'max-h-96' : 'max-h-0'}`}
          style={{ borderTop: menuOpen ? '0.5px solid var(--border-default)' : 'none' }}
        >
          <div className="flex flex-col py-3">
            {[
              { href: '#how-it-works', label: 'How it works' },
              { href: '#values', label: 'Our values' },
              { href: '#membership', label: 'Membership' },
              { href: '/events', label: 'Events' },
              { href: '#faq', label: 'FAQ' },
            ].map(link => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                className="px-5 py-3 text-sm text-dim hover:text-ink hover:bg-surface-3 transition-colors">
                {link.label}
              </a>
            ))}
            {!isLoggedIn ? (
              <>
                <a href="/login" onClick={() => setMenuOpen(false)}
                  className="px-5 py-3 text-sm text-dim hover:text-ink hover:bg-surface-3 transition-colors border-t border-br">
                  Sign in
                </a>
                <a href="/signup" onClick={() => setMenuOpen(false)}
                  className="mx-5 mt-2 mb-3 py-3 text-sm font-semibold text-center rounded-xl transition-colors"
                  style={{ background: 'var(--gold)', color: '#000' }}>
                  Create profile
                </a>
              </>
            ) : (
              <a href="/browse" onClick={() => setMenuOpen(false)}
                className="mx-5 mt-2 mb-3 py-3 text-sm font-semibold text-center rounded-xl transition-colors"
                style={{ background: 'var(--gold)', color: '#000' }}>
                Browse profiles →
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-4xl mx-auto px-4 md:px-5 pt-1 pb-3 md:pt-2 md:pb-4 text-center">
        {/* Arabic calligraphy logo */}
        <div className="flex justify-center" style={{ marginBottom: -8 }}>
          <ZawaajLogo height={400} />
        </div>
        <h1 className="text-[2rem] sm:text-5xl md:text-6xl font-bold text-ink leading-tight tracking-tight mb-3">
          A dignified path to<br />
          <span style={{ color: 'var(--gold)' }}>your spouse</span>
        </h1>
        <p className="text-base text-dim max-w-xl mx-auto leading-relaxed mb-5">
          Zawaaj is a private, family-aligned matrimonial platform.<br />
          Every profile is reviewed, every introduction admin-verified.<br />
          No direct messaging or casual chatting. No time-wasting.<br />
          Just a proper, family-led process.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
          {isLoggedIn ? (
            <Link href="/browse" className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-semibold bg-gold text-black hover:bg-[var(--gold-hover)] transition-colors">
              Browse profiles →
            </Link>
          ) : (
            <>
              <Link href="/signup" className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-semibold bg-gold text-black hover:bg-[var(--gold-hover)] transition-colors">
                Create your profile →
              </Link>
              <Link href="/login" className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-medium border border-br text-dim hover:text-ink hover:bg-surface-3 transition-colors">
                Sign in
              </Link>
            </>
          )}
        </div>
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gold/30 bg-gold/8 text-gold text-sm font-semibold">
          For Families Serious About Marriage
        </div>
      </section>

      {/* ── Quranic ayah ── */}
      <section style={{ background: 'var(--gold-muted)', borderTop: '0.5px solid var(--border-gold)', borderBottom: '0.5px solid var(--border-gold)' }}>
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-20 text-center flex flex-col items-center gap-6">
          {/* Arabic */}
          <p
            dir="rtl"
            lang="ar"
            style={{
              fontFamily: 'var(--font-amiri), "Amiri", "Scheherazade New", serif',
              fontSize: 'clamp(1.35rem, 3vw, 1.95rem)',
              lineHeight: 2,
              color: 'var(--gold)',
              fontWeight: 400,
              textAlign: 'center',
              letterSpacing: '0.01em',
              maxWidth: '44rem',
            }}
          >
            وَمِنۡ اٰيٰتِهٖۤ اَنۡ خَلَقَ لَكُمۡ مِّنۡ اَنۡفُسِكُمۡ اَزۡوَاجًا لِّتَسۡكُنُوۡۤا اِلَيۡهَا وَجَعَلَ بَيۡنَكُمۡ مَّوَدَّةً وَّرَحۡمَةً ؕ اِنَّ فِىۡ ذٰلِكَ لَاٰيٰتٍ لِّقَوۡمٍ يَّتَفَكَّرُوۡنَ ٢١
          </p>
          {/* Divider */}
          <div style={{ width: 40, height: 1, background: 'var(--border-gold)', flexShrink: 0 }} />
          {/* English translation */}
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, fontStyle: 'italic', maxWidth: '36rem', fontWeight: 400 }}>
            &ldquo;And among His Signs is that He created for you mates from amongst yourselves, that you may dwell in tranquillity with them, and He has put love and mercy between your hearts. Verily in that are Signs for those who reflect.&rdquo;
          </p>
          {/* Reference */}
          <p style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 500 }}>
            — Surah Ar-Rum, 30:21
          </p>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <section className="border-y border-br bg-surface-2">
        <div className="max-w-5xl mx-auto px-4 md:px-5 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            {
              label: 'Parent to parent introductions', sub: 'Verified by our team',
              icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
            },
            {
              label: 'No photos shared', sub: 'Focused on character & values',
              icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
            },
            {
              label: 'Every profile verified', sub: 'Manual review before going live',
              icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
            },
            {
              label: 'Wali-respecting', sub: 'Both families consulted before contact',
              icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
            },
          ].map(t => (
            <div key={t.label} className="flex flex-col items-center gap-2">
              <div style={{ color: 'var(--gold)', marginBottom: 2 }}>{t.icon}</div>
              <p className="text-sm font-medium text-ink">{t.label}</p>
              <p className="text-xs text-muted">{t.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-4 md:px-5 py-12 md:py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">The Zawaaj Process</p>
          <h2 className="text-3xl font-bold text-ink mb-4">A Dignified Path to Marriage</h2>
          <p className="text-sm text-muted max-w-lg mx-auto leading-relaxed">A private, family-led journey in six simple steps — built on trust, dignity, and sincere intent.</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map(s => (
            <div key={s.n} className="bg-surface-2 rounded-2xl p-6 border border-br">
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, background: 'var(--gold-muted)', border: '1px solid var(--border-gold)', borderRadius: 999, padding: '3px 10px', display: 'inline-block' }}>
                  Step {s.n}
                </span>
              </div>
              <p className="font-semibold text-ink mb-2">{s.title}</p>
              <p className="text-sm text-muted leading-relaxed" style={{ whiteSpace: 'pre-line' }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Values ── */}
      <section id="values" className="bg-surface-2 border-y border-br">
        <div className="max-w-5xl mx-auto px-4 md:px-5 py-12 md:py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">What we stand for</p>
            <h2 className="text-3xl font-bold text-ink">Our values</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="bg-surface-3 rounded-2xl p-6 border border-br">
                <div className="flex items-center gap-3 mb-2">
                  <div style={{ flexShrink: 0 }}>{v.icon}</div>
                  <p className="font-semibold text-ink">{v.title}</p>
                </div>
                <p className="text-sm text-muted leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="membership" className="max-w-5xl mx-auto px-4 md:px-5 py-12 md:py-24">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">Membership</p>
          <h2 className="text-3xl font-bold text-ink mb-4">Simple, transparent pricing</h2>
          <p className="text-muted text-sm">All tiers include full admin support and mediated introductions.</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 mt-6 bg-surface-2 border border-br rounded-xl p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!annual ? 'bg-gold text-black' : 'text-muted hover:text-ink'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${annual ? 'bg-gold text-black' : 'text-muted hover:text-ink'}`}
            >
              Annual <span className="text-xs ml-1 font-normal opacity-70">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12 w-full max-w-2xl mx-auto">
          {PLANS.filter(p => !p.hidden).map(p => <PlanCard key={p.key} plan={p} annual={annual} />)}
        </div>

        {/* Compact comparison — visible on all screens */}
        <div className="bg-surface-2 rounded-2xl border border-br overflow-x-auto max-w-2xl mx-auto">
          <div className="grid grid-cols-3 text-xs font-semibold text-muted uppercase tracking-wide px-6 py-3 bg-surface-3 border-b border-br min-w-[380px]">
            <span className="col-span-1">Feature</span>
            <span className="text-center">Community Access</span>
            <span className="text-center">Premium</span>
          </div>
          {COMPACT_COMPARISON.map((row, i) => (
            <div key={row.feature} className={`grid grid-cols-3 px-6 py-3 text-sm min-w-[380px] ${i % 2 === 0 ? '' : 'bg-surface-3/40'}`}>
              <span className="text-dim col-span-1">{row.feature}</span>
              <span className="text-center text-muted">{row.free}</span>
              <span className="text-center text-gold font-medium">{row.premium}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-surface-2 border-y border-br">
        <div className="max-w-4xl mx-auto px-4 md:px-5 py-12 md:py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-3xl font-bold text-ink">From our community</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { initials: 'S.A.', quote: 'The admin-mediated process made me feel completely comfortable. My parents were involved from the very beginning.', location: 'London' },
              { initials: 'M.R.', quote: 'I appreciated that there was no pressure and no direct contact. Everything was handled with respect and care.', location: 'Birmingham' },
              { initials: 'F.K.', quote: 'Finally a platform that actually respects Islamic values. The team were helpful and quick to respond throughout.', location: 'Manchester' },
            ].map(t => (
              <div key={t.initials} className="bg-surface-3 rounded-2xl p-6 border border-br flex flex-col gap-4">
                <p className="text-sm text-dim leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-xs font-bold text-gold">
                    {t.initials[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{t.initials}</p>
                    <p className="text-xs text-muted">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Events ── */}
      {featuredEvents.length > 0 && (
        <section id="events" className="max-w-5xl mx-auto px-4 md:px-5 py-12 md:py-24">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">Community</p>
            <h2 className="text-3xl font-bold text-ink mb-4">Upcoming events</h2>
            <p className="text-muted text-sm max-w-xl mx-auto">
              Our workshops and community sessions are delivered in partnership with Radiance of Hope — a charity committed to strengthening Muslim families.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {featuredEvents.map(ev => (
              <HomepageEventCard key={ev.id} event={ev} />
            ))}
          </div>
          <div className="text-center">
            <Link href="/events" className="inline-block px-6 py-3 rounded-xl text-sm font-medium border border-br text-dim hover:text-ink hover:border-gold transition-colors">
              View all events →
            </Link>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section id="faq" className="max-w-3xl mx-auto px-4 md:px-5 py-12 md:py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">Questions</p>
          <h2 className="text-3xl font-bold text-ink">Frequently asked</h2>
        </div>
        <div>
          {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-surface-2 border-y border-gold/20">
        <div className="max-w-2xl mx-auto px-4 md:px-5 py-10 md:py-20 text-center">
          <h2 className="text-3xl font-bold text-ink mb-4">
            Begin your search with <span style={{ color: 'var(--gold)' }}>barakah</span>
          </h2>
          <p className="text-muted text-sm mb-8">
            Join a platform built with Islamic values at its core.<br />
            Private, trusted, and admin-supported.
          </p>
          <Link href="/signup" className="inline-block px-10 py-4 rounded-xl text-sm font-semibold bg-gold text-black hover:bg-[var(--gold-hover)] transition-colors">
            Create your profile →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-surface border-t border-br">
        <div className="max-w-5xl mx-auto px-4 md:px-5 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <p className="text-xs text-muted">© {new Date().getFullYear()} Zawaaj. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-x-8 gap-y-2 text-sm text-muted mx-auto md:mx-0">
            <a href="#how-it-works" className="hover:text-ink transition-colors">How it works</a>
            <Link href="/pricing" className="hover:text-ink transition-colors">Pricing</Link>
            <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
            <Link href="/terms" className="hover:text-ink transition-colors">Terms</Link>
            <Link href="/help" className="hover:text-ink transition-colors">Help</Link>
            <Link href="/login" className="hover:text-ink transition-colors">Sign in</Link>
          </div>
        </div>
        <div className="border-t border-br">
          <p className="max-w-5xl mx-auto px-4 md:px-5 py-4 text-xs text-muted text-center md:text-left">
            Zawaaj is operated by Ingenious Education Ltd. Net proceeds support Radiance of Hope, a charitable organisation currently undergoing registration.
          </p>
        </div>
      </footer>
    </div>
  )
}
