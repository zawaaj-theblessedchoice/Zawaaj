'use client'

import { useRouter } from 'next/navigation'

const CLAUSES = [
  {
    number: '1.',
    title: 'Platform Purpose',
    body: `Zawaaj is a private, invite-only Muslim matrimonial platform operated under the domain zawaaj.uk. It is not a dating application. Its sole purpose is to facilitate serious matrimonial introductions between Muslim families who are genuinely seeking marriage in accordance with Islamic principles. Use of this platform for any other purpose is strictly prohibited.`,
  },
  {
    number: '2.',
    title: 'Eligibility',
    body: `To register on Zawaaj, the candidate must: (a) be at least 18 years of age; (b) be Muslim; and (c) be genuinely and sincerely seeking marriage. Accounts are managed by a parent, guardian, or the candidate themselves. By submitting a profile, you confirm that all information provided is truthful and accurate. The admin team reserves the right to verify eligibility at any time and to remove any profile found to be ineligible or misleading.`,
  },
  {
    number: '3.',
    title: 'Islamic Declaration (Oath)',
    body: `By completing registration and ticking the confirmation box, you make a solemn declaration before Allah (SWT) — بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ — that: (a) all information you have provided is truthful and accurate to the best of your knowledge; (b) your intentions are honourable and your purpose is the lawful pursuit of marriage; and (c) you will use this platform in good faith and in accordance with Islamic principles at all times. This declaration carries the weight of an Islamic oath (qasam) and must be taken with full sincerity.`,
  },
  {
    number: '4.',
    title: 'Data Sharing & Legal Basis',
    body: `Your consent, captured explicitly at the point of registration, forms the legal basis under which Zawaaj processes and shares your personal data with other approved members (GDPR Article 6(1)(a) — consent). You may withdraw consent at any time by withdrawing your profile. Withdrawal of consent does not affect the lawfulness of processing carried out prior to withdrawal. Please see Clause 9 for data retention information.`,
  },
  {
    number: '5.',
    title: 'Privacy',
    body: `Your profile is visible only to other approved members of the platform. Profiles are not publicly indexed; robots.txt instructs all search engines not to index any page of this platform. Your contact details (phone number and guardian's name) are never shared with another member or their family without bilateral verbal consent having been confirmed by the admin. Your date of birth is never displayed to other members; only your approximate age is shown.`,
  },
  {
    number: '6.',
    title: 'Code of Conduct',
    body: `All members are expected to conduct themselves with respect, dignity, and Islamic etiquette at all times. You must not attempt to contact any other member or their family outside of the platform's facilitated introduction process. Unsolicited or inappropriate communications will result in immediate suspension. The admin team's authority on matters of conduct is final. If you have a concern about another member's conduct, please contact the admin directly.`,
  },
  {
    number: '7.',
    title: 'Introduction Process',
    body: `Zawaaj operates a family-first introduction model. Interest expressions are private — the other family is not notified until interest is mutual. When mutual interest is confirmed, our admin team contacts both families separately. Contact details are shared only when both families have given verbal consent to proceed. Introductions are always parent-to-parent or guardian-to-guardian, coordinated personally by our admin team.`,
  },
  {
    number: '8.',
    title: 'Admin Authority',
    body: `The Zawaaj admin team may, at its sole discretion and without prior notice, approve, reject, pause, suspend, or permanently remove any profile from the platform. Decisions made by the admin team regarding eligibility, profile status, or introductions are final and not subject to appeal. The admin team acts in the best interests of the platform and its members.`,
  },
  {
    number: '9.',
    title: 'Limitation of Liability',
    body: `Zawaaj provides an introduction service only. We do not verify every piece of information submitted by members, and we make no guarantees, representations, or warranties regarding the suitability, character, or intentions of any member. We are not responsible for the outcome of any introduction, meeting, or marriage. Use of this platform is entirely at your own risk. Zawaaj, its operators, and its administrators shall not be liable for any loss, harm, or damage arising from use of this platform.`,
  },
  {
    number: '10.',
    title: 'Withdrawal & Data Retention',
    body: `You may withdraw your profile at any time by contacting the admin or using the withdrawal option in your profile settings. Upon withdrawal, your profile will be removed from the directory immediately and marked as withdrawn. Your personal data will be retained for a period of 2 years from the date of withdrawal for audit and safeguarding purposes, after which it will be permanently deleted. If you wish to request earlier deletion of your data, please contact the admin directly. Requests will be processed in accordance with applicable data protection law.`,
  },
]

export default function TermsPage() {
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
            Terms &amp; Conditions
          </p>
          <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Last updated: April 2026
          </p>
        </div>

        {/* Bismillah */}
        <div className="mb-8 text-center">
          <p style={{ fontSize: 22, color: '#B8960C', fontWeight: 600, letterSpacing: '0.03em', margin: '0 0 6px' }}>
            بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
            In the name of Allah, the Most Gracious, the Most Merciful
          </p>
        </div>

        {/* Intro */}
        <p className="mb-10 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Please read these Terms &amp; Conditions carefully before using the Zawaaj platform. By creating a profile and using this service, you agree to be bound by these terms in full, including the Islamic Declaration in Clause 3. If you do not agree, please do not use the platform.
        </p>

        {/* Clauses */}
        <div className="flex flex-col gap-8">
          {CLAUSES.map((clause) => (
            <section key={clause.number}
              style={clause.number === '3.' ? {
                padding: '16px 20px',
                borderRadius: 10,
                background: 'rgba(184,150,12,0.05)',
                border: '0.5px solid rgba(184,150,12,0.25)',
              } : undefined}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: clause.number === '3.' ? '#B8960C' : '#fff' }}>
                {clause.number} {clause.title}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {clause.body}
              </p>
            </section>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-6 border-t flex items-center gap-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => router.back()}
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: '#B8960C', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            &larr; Return to form
          </button>
        </div>

      </div>
    </main>
  )
}
