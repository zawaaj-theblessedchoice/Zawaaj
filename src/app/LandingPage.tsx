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
      'Community events (selected)',
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
      'Full profile details unlocked',
      'New profile alerts',
      'Priority email support',
      'Full events access',
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
  { feature: 'Family profiles',              free: '1',                                    plus: '4',                                   premium: '4' },
  { feature: 'Profile boost',                free: '—',                                    plus: '1× / month',                          premium: 'Weekly' },
  { feature: 'Concierge matching',           free: '—',                                    plus: '—',                                   premium: PLAN_CONFIG.premium.concierge ? 'Yes' : '—' },
  { feature: 'See who viewed you',           free: '—',                                    plus: '—',                                   premium: PLAN_CONFIG.premium.viewTracking ? 'Yes' : '—' },
  { feature: 'Full profile details',         free: 'Summary',                              plus: PLAN_CONFIG.plus.fullProfile ? 'Yes' : '—', premium: 'Yes' },
]

const HOW_IT_WORKS = [
  { n: 1, title: 'Create your family account', body: 'A parent, guardian, or the candidate themselves registers. The primary point of contact throughout is always a mother or female guardian.' },
  { n: 2, title: 'Admin review', body: 'Our team personally reviews every profile before it goes live — keeping the platform trusted and the community high quality.' },
  { n: 3, title: 'Browse & express interest', body: 'When a profile feels right, express interest. One-sided interest remains completely private — the other family is not notified at this stage.' },
  { n: 4, title: 'Mutual interest', body: 'When both families have independently expressed interest in each other, our admin team is notified.' },
  { n: 5, title: 'Admin reaches out', body: 'Our team contacts both families separately to introduce the situation and learn whether they\'d like to proceed.' },
  { n: 6, title: 'Introduction made', body: 'If both families are ready, our admin connects the mothers directly. Contact details are only shared at this final stage.' },
]

const VALUES = [
  { title: 'Halal by design', body: 'No direct messaging. No photos. No swiping. Every introduction goes through our admin team.' },
  { title: 'Privacy first', body: 'Contact details are never shared until both families are ready to proceed — coordinated personally by our team.' },
  { title: 'Faith-centred', body: 'Built for practising Muslims seeking a serious commitment. We respect your values and your wali.' },
  { title: 'Community trust', body: 'Every profile is manually reviewed. We keep the platform small, safe, and high quality.' },
  { title: 'Family-first by design', body: 'Every introduction connects families, not just individuals. The mother or female guardian is always the point of contact — keeping the process rooted in respect and Islamic tradition.' },
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
    a: 'When interest is mutual, our admin team reaches out to both families separately. If both are ready to proceed, we connect the mothers directly and facilitate the introduction personally.',
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
            <div key={row.feature} className="flex items-center gap-2 text-xs text-white/50 mt-1">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M3 8l3.5 3.5L13 4.5" stroke="#7A6020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{row.feature}: <span className="text-white/70">{val}</span></span>
            </div>
          )
        })}
      </div>

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
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen" data-theme="dark" style={{ background: 'var(--surface)', color: 'var(--text-primary)' }}>

      {/* ── Nav ── logo left | links centre | CTA right */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-surface/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-16 grid grid-cols-2 md:grid-cols-3 items-center">

          {/* Left — logo only */}
          <div className="flex items-center">
            <Link href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <img src="/zawaaj-wordmark.png" alt="Zawaaj" style={{ height: 28, width: 'auto' }} />
            </Link>
          </div>

          {/* Centre — navigation links (desktop) */}
          <div className="hidden md:flex items-center justify-center gap-7 text-sm text-white/60">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#values" className="hover:text-white transition-colors">Our values</a>
            <a href="#membership" className="hover:text-white transition-colors">Membership</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
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
                  style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#fff'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.3)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.7)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
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
              style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}
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
          style={{ borderTop: menuOpen ? '0.5px solid rgba(255,255,255,0.1)' : 'none' }}
        >
          <div className="flex flex-col py-3">
            {[
              { href: '#how-it-works', label: 'How it works' },
              { href: '#values', label: 'Our values' },
              { href: '#membership', label: 'Membership' },
              { href: '#faq', label: 'FAQ' },
            ].map(link => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                className="px-5 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                {link.label}
              </a>
            ))}
            {!isLoggedIn ? (
              <>
                <a href="/login" onClick={() => setMenuOpen(false)}
                  className="px-5 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors border-t border-white/10">
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
      <section className="max-w-4xl mx-auto px-4 md:px-5 pt-2 pb-4 md:pt-3 md:pb-6 text-center">
        {/* Arabic calligraphy logo */}
        <div className="flex justify-center mb-1">
          <ZawaajLogo height={280} />
        </div>
        <h1 className="text-[2rem] sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-4">
          A dignified path to<br />
          <span style={{ color: 'var(--gold)' }}>your spouse</span>
        </h1>
        <p className="text-lg text-white/60 max-w-xl mx-auto leading-relaxed mb-6">
          Zawaaj is a private, family-aligned matrimonial platform. Every profile is reviewed, every introduction admin-verified. No direct messaging or casual chatting. No time-wasting. Just a proper, family-led process.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
          {isLoggedIn ? (
            <Link href="/browse" className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-semibold bg-gold text-black hover:bg-[var(--gold-hover)] transition-colors">
              Browse profiles →
            </Link>
          ) : (
            <>
              <Link href="/signup" className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-semibold bg-gold text-black hover:bg-[var(--gold-hover)] transition-colors">
                Create your profile →
              </Link>
              <Link href="/login" className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-medium border border-white/20 text-white/80 hover:text-white hover:bg-white/5 transition-colors">
                Sign in
              </Link>
            </>
          )}
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/8 text-gold text-sm font-medium">
          For Families Serious About Marriage
        </div>
      </section>

      {/* ── Quranic ayah ── */}
      <section style={{ background: 'rgba(184,150,12,0.04)', borderTop: '0.5px solid rgba(184,150,12,0.12)', borderBottom: '0.5px solid rgba(184,150,12,0.12)' }}>
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
          <div style={{ width: 40, height: 1, background: 'rgba(184,150,12,0.3)', flexShrink: 0 }} />
          {/* English translation */}
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, fontStyle: 'italic', maxWidth: '36rem', fontWeight: 400 }}>
            &ldquo;And among His Signs is that He created for you mates from amongst yourselves, that you may dwell in tranquillity with them, and He has put love and mercy between your hearts. Verily in that are Signs for those who reflect.&rdquo;
          </p>
          {/* Reference */}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', fontWeight: 500 }}>
            — Surah Ar-Rum, 30:21
          </p>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <section className="border-y border-white/8 bg-surface-2">
        <div className="max-w-5xl mx-auto px-4 md:px-5 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Mother-to-mother introductions', sub: 'Verified by our team' },
            { label: 'No photos shared', sub: 'Focused on character & values' },
            { label: 'Every profile verified', sub: 'Manual review before going live' },
            { label: 'Wali-respecting', sub: 'Both families consulted before contact' },
          ].map(t => (
            <div key={t.label} className="flex flex-col items-center gap-2">
              <p className="text-sm font-medium text-white">{t.label}</p>
              <p className="text-xs text-white/40">{t.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-4 md:px-5 py-12 md:py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">The process</p>
          <h2 className="text-3xl font-bold text-white">How Zawaaj works</h2>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map(s => (
            <div key={s.n} className="bg-surface-2 rounded-2xl p-6 border border-white/8">
              <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.7, marginBottom: 4 }}>
                Step No. {s.n}
              </div>
              <p className="font-semibold text-white mb-2">{s.title}</p>
              <p className="text-sm text-white/50 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Values ── */}
      <section id="values" className="bg-surface-2 border-y border-white/8">
        <div className="max-w-5xl mx-auto px-4 md:px-5 py-12 md:py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">What we stand for</p>
            <h2 className="text-3xl font-bold text-white">Our values</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="bg-surface-3 rounded-2xl p-6 border border-white/8">
                <p className="font-semibold text-white mb-1">{v.title}</p>
                <p className="text-sm text-white/50 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="membership" className="max-w-5xl mx-auto px-4 md:px-5 py-12 md:py-24">
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
        <div className="grid md:grid-cols-2 gap-5 mb-12 max-w-2xl mx-auto">
          {PLANS.filter(p => !p.hidden).map(p => <PlanCard key={p.key} plan={p} annual={annual} />)}
        </div>

        {/* Compact comparison — hidden on mobile */}
        <div className="hidden md:block bg-surface-2 rounded-2xl border border-white/10 overflow-hidden max-w-2xl mx-auto">
          <div className="grid grid-cols-3 text-xs font-semibold text-white/40 uppercase tracking-wide px-6 py-3 bg-surface-3 border-b border-white/8">
            <span className="col-span-1">Feature</span>
            <span className="text-center">Voluntary</span>
            <span className="text-center">Premium</span>
          </div>
          {COMPACT_COMPARISON.map((row, i) => (
            <div key={row.feature} className={`grid grid-cols-3 px-6 py-3 text-sm ${i % 2 === 0 ? '' : 'bg-white/2'}`}>
              <span className="text-white/60 col-span-1">{row.feature}</span>
              <span className="text-center text-white/50">{row.free}</span>
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
        <div className="max-w-4xl mx-auto px-4 md:px-5 py-12 md:py-24">
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
      <section id="faq" className="max-w-3xl mx-auto px-4 md:px-5 py-12 md:py-24">
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
        <div className="max-w-2xl mx-auto px-4 md:px-5 py-10 md:py-20 text-center">
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
        <div className="max-w-5xl mx-auto px-4 md:px-5 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <ZawaajLogo height={44} />
            <p className="text-xs text-white/30">© {new Date().getFullYear()} Zawaaj. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-x-8 gap-y-2 text-sm text-white/40 mx-auto md:mx-0">
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
