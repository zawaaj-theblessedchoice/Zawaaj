'use client'

import ZawaajLogo from '@/components/ZawaajLogo'

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
  {
    number: '11.',
    title: 'Data Controller & Processor',
    body: `The Data Controller for personal data processed through the Zawaaj platform is Ingenious Education Ltd, a company incorporated in England and Wales. Ingenious Education Ltd determines the purposes and means of processing your personal data and is responsible for ensuring that processing is carried out lawfully in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. Zawaaj (zawaaj.uk) acts as a Data Processor, processing your personal data solely on the instructions of Ingenious Education Ltd and in accordance with a Data Processing Agreement entered into pursuant to Article 28 UK GDPR. If you have any questions about how your data is processed, please contact Ingenious Education Ltd directly.`,
  },
  {
    number: '12.',
    title: 'Your Data Protection Rights',
    body: `As a Data Subject under UK GDPR, you have the following rights: (a) Right of Access (Article 15) — request a copy of the personal data we hold about you; (b) Right to Rectification (Article 16) — request correction of inaccurate data; (c) Right to Erasure (Article 17) — request deletion of your data where there is no overriding legal basis for retention; (d) Right to Restriction (Article 18) — request that we limit processing of your data in certain circumstances; (e) Right to Data Portability (Article 20) — receive your data in a structured, machine-readable format; (f) Right to Object (Article 21) — object to processing based on legitimate interests. You may exercise any of these rights via the Privacy & Data Rights section of your account settings (zawaaj.uk/privacy/rights). We will respond within 30 days. You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk if you believe your data protection rights have been infringed.`,
  },
  {
    number: '13.',
    title: 'Cookies',
    body: `Zawaaj uses strictly necessary cookies only. These cookies are essential for the platform to function — they manage your login session and protect against cross-site request forgery (CSRF). No analytics cookies, advertising cookies, or third-party tracking technologies are used on this platform. You cannot opt out of strictly necessary cookies without also opting out of the platform itself. For full details, please read our Privacy Policy at zawaaj.uk/privacy.`,
  },
  {
    number: '14.',
    title: 'Changes to These Terms',
    body: `Ingenious Education Ltd reserves the right to update these Terms & Conditions at any time. Where changes are material, registered members will be notified by email. Continued use of the platform following notification of changes constitutes acceptance of the revised terms. The date at the top of this page reflects the date of the most recent update.`,
  },
]

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 py-14" style={{ background: 'var(--surface)' }}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-10 text-center">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <ZawaajLogo size={72} tagline={true} />
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Terms &amp; Conditions
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Last updated: April 2026
          </p>
        </div>

        {/* Bismillah */}
        <div className="mb-8 text-center">
          <p style={{ fontSize: 22, color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.03em', margin: '0 0 6px' }}>
            بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            In the name of Allah, the Most Gracious, the Most Merciful
          </p>
        </div>

        {/* Intro */}
        <p className="mb-10 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
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
              <h2 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: clause.number === '3.' ? 'var(--gold)' : 'var(--text-primary)' }}>
                {clause.number} {clause.title}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {clause.body}
              </p>
            </section>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-6 border-t flex items-center justify-between flex-wrap gap-4" style={{ borderColor: 'var(--border-default)' }}>
          <button
            onClick={() => {
              // Terms opens in a new tab from the registration form.
              // window.close() closes the tab and returns the user to the form.
              if (window.opener || window.history.length <= 1) {
                window.close()
              } else {
                window.history.back()
              }
            }}
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            &larr; Close and return to form
          </button>
          <a
            href="/privacy"
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--gold)', textDecoration: 'none' }}
          >
            Privacy Policy &rarr;
          </a>
        </div>

      </div>
    </main>
  )
}
