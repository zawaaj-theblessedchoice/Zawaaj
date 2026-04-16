'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

const SECTIONS = [
  {
    number: '1.',
    title: 'Who We Are',
    body: `Zawaaj (zawaaj.uk) is a private Muslim matrimonial platform. Your personal data is controlled by Ingenious Education Ltd ("the Controller"), and processed by Zawaaj ("the Processor") on the Controller's instructions.\n\nData Controller: Ingenious Education Ltd · privacy@ingenious-education.co.uk\nData Processor: Zawaaj · privacy@zawaaj.uk\n\nFor all data protection matters, contact: privacy@ingenious-education.co.uk`,
  },
  {
    number: '2.',
    title: 'What Data We Collect and Why',
    body: `We collect only the data necessary to provide this service. We collect:\n\n• Identity and contact data: your name (initials only publicly), email address, and your guardian or family contact's name and phone number (held securely, never shared with other members)\n• Profile data: age, location, education, profession, religious practice, and matrimonial preferences\n• Special category data (Article 9): religion and ethnicity — collected on the basis of your explicit consent for the purpose of matrimonial matching\n• Usage data: introduction requests sent and received, saved profiles, notification history\n• Account data: subscription plan, registration path, consent records\n\nWe do not collect: photographs, facial data, national insurance numbers, passport numbers, financial account details, or precise geolocation.`,
  },
  {
    number: '3.',
    title: 'Legal Basis for Processing',
    body: `We process your personal data on the following bases:\n\n• Consent (Article 6(1)(a) and Article 9(2)(a)): your explicit consent, given at registration, for processing your profile data and special category data (religion, ethnicity) for matrimonial matching. You may withdraw consent at any time by withdrawing your profile.\n• Contract (Article 6(1)(b)): processing necessary to provide the platform services you have requested, including account management and email communications.\n• Legitimate interests (Article 6(1)(f)): maintaining the security, integrity, and administration of the platform, fraud prevention, and record-keeping for operational purposes.\n• Legal obligation (Article 6(1)(c)): retaining audit logs and anonymised records to comply with applicable law.`,
  },
  {
    number: '4.',
    title: 'How Your Data Is Used',
    body: `Your personal data is used exclusively for:\n\n• Displaying your profile to other approved members of the opposite gender for matrimonial consideration\n• Facilitating introduction requests between families, mediated by our team\n• Sending you notifications about platform activity relevant to your account\n• Sending transactional emails about your account (verification, password reset, introduction updates)\n• Administering and improving the platform\n\nYour data is never used for advertising, sold to third parties, or shared with any party not listed in this policy.`,
  },
  {
    number: '5.',
    title: 'Who We Share Your Data With',
    body: `Your personal data is shared only with:\n\n• Other approved members (limited to safe profile fields — your contact details are never visible to other members)\n• Our administrative team (full profile access for the purpose of approval, mediation, and safeguarding)\n• Our authorised sub-processors:\n  – Supabase Inc: database hosting (AWS eu-west-2, Ireland) — UK adequacy applies\n  – Vercel Inc: application hosting (EU edge network) — Standard Contractual Clauses\n  – Resend Inc: transactional email delivery (EU data residency) — Standard Contractual Clauses\n\nYour contact details (phone number) are shared with the other family only after both families have given explicit verbal consent, facilitated personally by our team.`,
  },
  {
    number: '6.',
    title: 'How Long We Keep Your Data',
    body: `We retain your data for the following periods:\n\n• Active profile: retained while your account is active\n• Withdrawn or rejected profiles: personal data deleted or anonymised 2 years after withdrawal or rejection\n• Family account contact details: anonymised 3 years after account closure\n• Introduction and match records: anonymised 2 years after creation (match records: 5 years)\n• Audit logs: 7 years (legal obligation)\n• Email delivery logs: 30 days (Resend's data processing terms)\n\nAnonymisation means your name, email, contact number, date of birth, and profile identifier are replaced with irreversible values. The anonymised record cannot be attributed to you.`,
  },
  {
    number: '7.',
    title: 'Your Rights',
    body: `Under UK GDPR, you have the following rights:\n\n• Right of access (Article 15): request a copy of all personal data held about you\n• Right to rectification (Article 16): correct inaccurate data — many fields are self-correctable via your profile\n• Right to erasure (Article 17): request deletion of your account and personal data\n• Right to restriction (Article 18): request that we limit processing of your data\n• Right to data portability (Article 20): receive your data in a machine-readable format\n• Right to object (Article 21): object to processing based on legitimate interests\n• Right to withdraw consent: withdraw consent for profile processing at any time by withdrawing your profile\n\nExercise any of these rights at zawaaj.uk/privacy/rights. We will respond within 30 calendar days.\n\nYou also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk or 0303 123 1113.`,
  },
  {
    number: '8.',
    title: 'Security',
    body: `We protect your data using:\n\n• TLS 1.3 encryption for all data in transit\n• AES-256 encryption for all data at rest\n• Row-level security policies ensuring members can only access data they are authorised to see\n• Immutable audit logging of all data access and modification\n• Role-based access controls limiting staff access to the minimum necessary\n• Cryptographically secure token generation for invite links and email verification\n\nIn the event of a personal data breach, Ingenious Education Ltd will notify the ICO within 72 hours of becoming aware. If the breach is likely to result in a high risk to your rights and freedoms, you will be notified directly without undue delay.`,
  },
  {
    number: '9.',
    title: 'Cookies',
    body: `We use only strictly necessary cookies to operate the platform:\n\n• Authentication session cookie: required to keep you signed in. This cookie is set by Supabase and is essential for the platform to function. It expires when your session ends or after 7 days if you remain signed in.\n\nWe do not use analytics cookies, advertising cookies, or any third-party tracking. You may disable cookies in your browser settings, but this will prevent you from accessing the platform.`,
  },
  {
    number: '10.',
    title: 'Changes to This Policy',
    body: `We will notify registered members by email of any material changes to this Privacy Policy at least 14 days before they take effect. The date of the most recent update is shown at the top of this page. Continued use of the platform after a change takes effect constitutes acceptance of the updated policy.`,
  },
]

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen px-4 py-14" style={{ background: 'var(--surface, #111111)' }}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#B8960C' }}>
            ZAWAAJ
          </h1>
          <p className="text-base font-semibold" style={{ color: '#fff' }}>
            Privacy Policy
          </p>
          <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Last updated: April 2026 · Effective: April 2026
          </p>
          <p className="mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Data Controller: Ingenious Education Ltd &middot; Data Processor: Zawaaj
          </p>
        </div>

        {/* Intro */}
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 10,
            background: 'rgba(184,150,12,0.05)',
            border: '0.5px solid rgba(184,150,12,0.25)',
            marginBottom: 36,
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            This Privacy Policy explains what personal data Zawaaj collects, how it is used,
            how long it is kept, and what your rights are. Zawaaj processes your data as a
            Data Processor on behalf of <strong style={{ color: '#fff' }}>Ingenious Education Ltd</strong>,
            who is the Data Controller. For all privacy matters, contact{' '}
            <a href="mailto:privacy@ingenious-education.co.uk" style={{ color: '#B8960C' }}>
              privacy@ingenious-education.co.uk
            </a>.
          </p>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-8">
          {SECTIONS.map((section) => (
            <section key={section.number}>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#fff' }}>
                {section.number} {section.title}
              </h2>
              <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {section.body}
              </div>
            </section>
          ))}
        </div>

        {/* Rights CTA */}
        <div
          style={{
            marginTop: 40,
            padding: '20px 24px',
            borderRadius: 12,
            background: 'rgba(184,150,12,0.07)',
            border: '0.5px solid rgba(184,150,12,0.3)',
            textAlign: 'center',
          }}
        >
          <p className="text-sm font-semibold mb-2" style={{ color: '#B8960C' }}>
            Exercise your data rights
          </p>
          <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Request your data, correct information, or delete your account — all self-service.
          </p>
          <Link
            href="/privacy/rights"
            style={{
              display: 'inline-block',
              padding: '9px 22px',
              borderRadius: 8,
              background: '#B8960C',
              color: '#111',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            My data rights →
          </Link>
        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-6 border-t flex items-center gap-6" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => router.back()}
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: '#B8960C', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            &larr; Back
          </button>
          <Link href="/terms" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
            Terms &amp; Conditions
          </Link>
          <a href="mailto:privacy@zawaaj.uk" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
            Contact
          </a>
        </div>
      </div>
    </main>
  )
}
