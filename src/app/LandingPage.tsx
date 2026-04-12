'use client'

import { useState } from 'react'
import Link from 'next/link'
import ZawaajLogo from '@/components/ZawaajLogo'
import { PLAN_CONFIG, PLAN_PRICES, PLAN_LABELS } from '@/lib/plan-config'

// ─── Plan data — limits derived from central PLAN_CONFIG ─────────────────────

const PLANS = [
  {
    key: 'free',
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
      'Community events (selected)',
    ],
  },
  {
    key: 'plus',
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
      'Full profile details unlocked',
      'New profile alerts',
      'Priority email support',
      'Full events access',
    ],
  },
  {
    key: 'premium',
    name: PLAN_LABELS.premium,
    monthly: PLAN_PRICES.premium.monthly,
    annual: PLAN_PRICES.premium.annual,
    description: 'Unlimited introductions, concierge matching, and full visibility.',
    cta: 'Get Premium',
    ctaHref: '/signup',
    highlight: false,
    features: [
      `Everything in ${PLAN_LABELS.plus}`,
      `${limitLabel(PLAN_CONFIG.premium.monthlyLimit)} interest expressions / month`,
      'Weekly profile boosts',
      `${PLAN_CONFIG.premium.spotlight} spotlight listing / month`,
      'Concierge matching by admin',
      'See who viewed your profile',
      'Full activity history',
    ],
  },
]

function limitLabel(n: number): string {
  return n === Infinity ? 'Unlimited' : String(n)
}

const COMPACT_COMPARISON = [
  { feature: 'Interest expressions / month', free: limitLabel(PLAN_CONFIG.free.monthlyLimit), plus: limitLabel(PLAN_CONFIG.plus.monthlyLimit), premium: limitLabel(PLAN_CONFIG.premium.monthlyLimit) },
  { feature: 'Profile boost',                 free: '—',                                   plus: '1× / month',                          premium: 'Weekly' },
  { feature: 'Concierge matching',            free: '—',                                   plus: '—',                                   premium: PLAN_CONFIG.premium.concierge ? '✓' : '—' },
  { feature: 'See who viewed you',            free: '—',                                   plus: '—',                                   premium: PLAN_CONFIG.premium.viewTracking ? '✓' : '—' },
  { feature: 'Full profile details',          free: 'Summary',                             plus: PLAN_CONFIG.plus.fullProfile ? '✓' : '—', premium: '✓' },
]

const HOW_IT_WORKS = [
  { n: '01', title: 'Create your family account', body: 'A parent, guardian, or candidate registers. The primary contact for all introductions is always a mother or female guardian.' },
  { n: '02', title: 'Admin review', body: 'Our team reviews every profile personally before it goes live — keeping the community trusted.' },
  { n: '03', title: 'Express interest', body: 'When a profile feels right, express interest. The other family is notified and invited to respond. No contact details are shared at this stage.' },
  { n: '04', title: 'Families connected', body: 'When both families accept, our team verifies the contacts and connects the mothers directly. Only then are details shared.' },
  { n: '05', title: 'Mutual match', body: 'When both parties express interest, the admin is notified and facilitates the introduction.' },
  { n: '06', title: 'Admin introduces families', body: 'Contact details are shared only with explicit consent from both families — never directly between members.' },
]

const VALUES = [
  { icon: '🤝', title: 'Halal by design', body: 'No direct messaging. No photos. No swiping. Every introduction goes through our admin team.' },
  { icon: '🔒', title: 'Privacy first', body: 'Contact details are never shared without explicit verbal consent from both families.' },
  { icon: '🌙', title: 'Faith-centred', body: 'Built for practising Muslims seeking a serious commitment. We respect your values and your wali.' },
  { icon: '👥', title: 'Community trust', body: 'Every profile is manually reviewed. We keep the platform small, safe, and high quality.' },
  { icon: '👨‍👩‍👧', title: 'Family-first by design', body: 'Every introduction connects families, not just individuals. The mother or female guardian is always the point of contact — keeping the process rooted in respect and Islamic tradition.' },
]

const FAQS = [
  {
    q: 'How is Zawaaj different from other matrimonial apps?',
    a: 'Zawaaj has no direct messaging and no photo sharing between members. Every introduction is mediated by our admin team, with explicit consent from both families before any contact details are exchanged.',
  },
  {
    q: 'Who reviews the profiles?',
    a: 'Our admin team personally reviews every application before it goes live. This keeps the community trusted and the matches meaningful.',
  },
  {
    q: 'Can I see who expressed interest in me?',
    a: 'One-sided interest is completely private. You\'ll only be notified if there\'s a mutual match — both parties expressed interest within 30 days.',
  },
  {
    q: 'How does the introduction work?',
    a: 'When there\'s a mutual match, our admin contacts both families separately, confirms verbal consent, and then shares contact details. No contact is ever made without consent.',
  },
  {
    q: 'What if I want to pause or withdraw?',
    a: 'You can pause or withdraw your profile at any time from your profile settings. Your data is preserved in case you return.',
  },
  {
    q: 'Is there a free option?',
    a: `Yes. The Voluntary tier gives you full access to browse profiles and send ${PLAN_CONFIG.free.monthlyLimit} interest expressions per month — completely free. Paid plans add more expressions and visibility features.`,
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-base font-medium text-white">{q}</span>
        <span className="text-gold text-xl flex-shrink-0">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="pb-5 text-sm text-white/60 leading-relaxed">{a}</p>}
    </div>
  )
}

function PlanCard({ plan, annual }: { plan: typeof PLANS[number]; annual: boolean }) {
  const price = annual ? plan.annual : plan.monthly
  const saving = annual && plan.monthly > 0

  return (
    <div className={`relative rounded-2xl p-6 flex flex-col gap-5 border ${
      plan.highlight
        ? 'bg-surface-2 border-gold/60 shadow-[0_0_40px_rgba(184,150,12,0.12)]'
        : 'bg-surface-2 border-white/10'
    }`}>
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gold text-black">Most popular</span>
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-white/60">{plan.name}</p>
        <div className="mt-1 flex items-end gap-1">
          {price === 0 ? (
            <span className="text-3xl font-bold text-white">Free</span>
          ) : (
            <>
              <span className="text-3xl font-bold text-white">£{price}</span>
              <span className="text-white/40 mb-1 text-sm">/mo</span>
            </>
          )}
        </div>
        {saving && (
          <span className="mt-1 inline-block text-xs text-gold font-medium">Save 20% · £{plan.annual * 12}/yr</span>
        )}
        <p className="mt-2 text-sm text-white/50">{plan.description}</p>
      </div>

      <ul className="space-y-2 flex-1">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-white/70">
            <span className="text-gold mt-0.5 flex-shrink-0">✓</span>
            {f}
          </li>
        ))}
      </ul>

      <Link
        href={plan.ctaHref}
        className={`block text-center py-3 rounded-xl text-sm font-semibold transition-colors ${
          plan.highlight
            ? 'bg-gold text-black hover:bg-[var(--gold-hover)]'
            : 'border border-white/20 text-white hover:bg-white/5'
        }`}
      >
        {plan.cta}
      </Link>
    </div>
  )
}

// ─── Main landing page ────────────────────────────────────────────────────────

export default function LandingPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="min-h-screen" data-theme="dark" style={{ background: 'var(--surface)', color: 'var(--text-primary)' }}>

      {/* ── Nav ── 3-column grid: [CTA left] [links centred] [sign-in right] */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-surface/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-16 grid grid-cols-3 items-center">

          {/* Left — primary CTA */}
          <div className="flex items-center">
            {isLoggedIn ? (
              <Link href="/browse" className="text-sm font-semibold px-4 py-2 rounded-xl bg-gold text-black hover:bg-[var(--gold-hover)] transition-colors">
                Browse profiles →
              </Link>
            ) : (
              <Link
                href="/signup"
                className="text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
                style={{
                  background: 'var(--gold)',
                  color: '#000',
                  letterSpacing: '-0.01em',
                }}
              >
                Create profile
              </Link>
            )}
          </div>

          {/* Centre — navigation links */}
          <div className="hidden md:flex items-center justify-center gap-7 text-sm text-white/60">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#values" className="hover:text-white transition-colors">Our values</a>
            <a href="#membership" className="hover:text-white transition-colors">Membership</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          {/* Mobile placeholder so grid stays balanced */}
          <div className="md:hidden" />

          {/* Right — sign in */}
          <div className="flex items-center justify-end">
            {!isLoggedIn && (
              <Link
                href="/login"
                className="text-sm font-medium px-5 py-2 rounded-xl border transition-colors hover:text-white hover:bg-white/5"
                style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}
              >
                Sign in
              </Link>
            )}
          </div>

        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-4xl mx-auto px-5 pt-16 pb-20 text-center">
        {/* Logo — 3× larger, centred, above the badge. tagline=false because
            the logo image already contains ZAWAAJ + THE BLESSED CHOICE text */}
        <div className="flex justify-center mb-8">
          <ZawaajLogo size={330} tagline={false} />
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/8 text-gold text-xs font-medium mb-8">
          🌙 Invite-only · Admin-mediated · Halal by design
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
          A blessed path to<br />
          <span style={{ color: 'var(--gold)' }}>your spouse</span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed mb-10">
          Zawaaj is a family-first matrimonial platform. Mothers connect with mothers.
          Every introduction is admin-verified, dignified, and private.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isLoggedIn ? (
            <Link href="/browse" className="px-8 py-3.5 rounded-xl text-sm font-semibold bg-gold text-black hover:bg-[var(--gold-hover)] transition-colors">
              Browse profiles →
            </Link>
          ) : (
            <>
              <Link href="/signup" className="px-8 py-3.5 rounded-xl text-sm font-semibold bg-gold text-black hover:bg-[var(--gold-hover)] transition-colors">
                Create your profile →
              </Link>
              <Link href="/login" className="px-8 py-3.5 rounded-xl text-sm font-medium border border-white/20 text-white/80 hover:text-white hover:bg-white/5 transition-colors">
                Sign in
              </Link>
            </>
          )}
        </div>
        {/* Increased opacity so the caption is legible against the dark bg */}
        <p className="mt-6 text-sm text-white/50 tracking-wide">
          Invite-only platform · All profiles manually reviewed · UK-based
        </p>
      </section>

      {/* ── Trust bar ── */}
      <section className="border-y border-white/8 bg-surface-2">
        <div className="max-w-5xl mx-auto px-5 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { icon: '👩‍👩‍👧', label: 'Mother-to-mother introductions', sub: 'Verified by our team' },
            { icon: '👁‍🗨', label: 'No photos shared', sub: 'Focused on character & values' },
            { icon: '✅', label: 'Every profile verified', sub: 'Manual review before going live' },
            { icon: '🤲', label: 'Wali-respecting', sub: 'Both families consulted before contact' },
          ].map(t => (
            <div key={t.label} className="flex flex-col items-center gap-2">
              <span className="text-2xl">{t.icon}</span>
              <p className="text-sm font-medium text-white">{t.label}</p>
              <p className="text-xs text-white/40">{t.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-5 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">The process</p>
          <h2 className="text-3xl font-bold text-white">How Zawaaj works</h2>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map(s => (
            <div key={s.n} className="bg-surface-2 rounded-2xl p-6 border border-white/8">
              <p className="text-gold text-xs font-bold mb-3">{s.n}</p>
              <p className="font-semibold text-white mb-2">{s.title}</p>
              <p className="text-sm text-white/50 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Values ── */}
      <section id="values" className="bg-surface-2 border-y border-white/8">
        <div className="max-w-5xl mx-auto px-5 py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">What we stand for</p>
            <h2 className="text-3xl font-bold text-white">Our values</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="bg-surface-3 rounded-2xl p-6 border border-white/8 flex gap-5">
                <span className="text-2xl flex-shrink-0 mt-0.5">{v.icon}</span>
                <div>
                  <p className="font-semibold text-white mb-1">{v.title}</p>
                  <p className="text-sm text-white/50 leading-relaxed">{v.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="membership" className="max-w-5xl mx-auto px-5 py-24">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">Membership</p>
          <h2 className="text-3xl font-bold text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-white/50 text-sm">All tiers include full admin support and mediated introductions.</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 mt-6 bg-surface-2 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!annual ? 'bg-gold text-black' : 'text-white/50 hover:text-white'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${annual ? 'bg-gold text-black' : 'text-white/50 hover:text-white'}`}
            >
              Annual <span className="text-xs ml-1 font-normal opacity-70">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {PLANS.map(p => <PlanCard key={p.key} plan={p} annual={annual} />)}
        </div>

        {/* Compact comparison */}
        <div className="bg-surface-2 rounded-2xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-4 text-xs font-semibold text-white/40 uppercase tracking-wide px-6 py-3 bg-surface-3 border-b border-white/8">
            <span className="col-span-1">Feature</span>
            <span className="text-center">Voluntary</span>
            <span className="text-center">Plus</span>
            <span className="text-center">Premium</span>
          </div>
          {COMPACT_COMPARISON.map((row, i) => (
            <div key={row.feature} className={`grid grid-cols-4 px-6 py-3 text-sm ${i % 2 === 0 ? '' : 'bg-white/2'}`}>
              <span className="text-white/60 col-span-1">{row.feature}</span>
              <span className="text-center text-white/50">{row.free}</span>
              <span className="text-center text-white/80">{row.plus}</span>
              <span className="text-center text-gold font-medium">{row.premium}</span>
            </div>
          ))}
          <div className="px-6 py-3 border-t border-white/8 text-center">
            <Link href="/pricing" className="text-sm text-gold hover:underline">
              View full comparison →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-surface-2 border-y border-white/8">
        <div className="max-w-4xl mx-auto px-5 py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">Stories</p>
            <h2 className="text-3xl font-bold text-white">From our community</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { initials: 'S.A.', quote: 'The admin-mediated process made me feel completely comfortable. My parents were involved from the very beginning.', location: 'London' },
              { initials: 'M.R.', quote: 'I appreciated that there was no pressure and no direct contact. Everything was handled with respect and care.', location: 'Birmingham' },
              { initials: 'F.K.', quote: 'Finally a platform that actually respects Islamic values. The team were helpful and quick to respond throughout.', location: 'Manchester' },
            ].map(t => (
              <div key={t.initials} className="bg-surface-3 rounded-2xl p-6 border border-white/8 flex flex-col gap-4">
                <p className="text-sm text-white/60 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-xs font-bold text-gold">
                    {t.initials[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.initials}</p>
                    <p className="text-xs text-white/40">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="max-w-3xl mx-auto px-5 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">Questions</p>
          <h2 className="text-3xl font-bold text-white">Frequently asked</h2>
        </div>
        <div>
          {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-surface-2 border-y border-gold/20">
        <div className="max-w-2xl mx-auto px-5 py-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Begin your search with <span style={{ color: 'var(--gold)' }}>barakah</span>
          </h2>
          <p className="text-white/50 text-sm mb-8">
            Join a platform built with Islamic values at its core. Private, trusted, and admin-supported.
          </p>
          <Link href="/signup" className="inline-block px-10 py-4 rounded-xl text-sm font-semibold bg-gold text-black hover:bg-[var(--gold-hover)] transition-colors">
            Create your profile →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-surface border-t border-white/8">
        <div className="max-w-5xl mx-auto px-5 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <ZawaajLogo size={44} tagline={true} />
            <p className="text-xs text-white/30">© {new Date().getFullYear()} Zawaaj. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-white/40">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/help" className="hover:text-white transition-colors">Help</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
