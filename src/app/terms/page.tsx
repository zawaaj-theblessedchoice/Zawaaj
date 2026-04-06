import Link from 'next/link'

export const metadata = {
  title: 'Terms & Conditions — Zawaaj',
}

const CLAUSES = [
  {
    number: '1.',
    title: 'Platform Purpose',
    body: `Zawaaj is a private, invite-only Muslim matrimonial platform operated under the domain zawaaj.uk. It is not a dating application. Its sole purpose is to facilitate serious matrimonial introductions between Muslim adults who are genuinely seeking marriage in accordance with Islamic principles. Use of this platform for any other purpose is strictly prohibited.`,
  },
  {
    number: '2.',
    title: 'Eligibility',
    body: `To register on Zawaaj, you must: (a) be at least 18 years of age; (b) be Muslim; and (c) be genuinely and sincerely seeking marriage. By submitting a profile, you confirm that all information provided is truthful and accurate. The admin team reserves the right to verify eligibility at any time and to remove any profile found to be ineligible or misleading.`,
  },
  {
    number: '3.',
    title: 'Data Sharing & Legal Basis',
    body: `Your consent, captured explicitly at the point of registration, forms the legal basis under which Zawaaj processes and shares your personal data with other approved members (GDPR Article 6(1)(a) — consent). You may withdraw consent at any time by withdrawing your profile. Withdrawal of consent does not affect the lawfulness of processing carried out prior to withdrawal. Please see Clause 8 for data retention information.`,
  },
  {
    number: '4.',
    title: 'Privacy',
    body: `Your profile is visible only to other approved members of the platform. Profiles are not publicly indexed; robots.txt instructs all search engines not to index any page of this platform. Your contact details (phone number and guardian's name) are never shared with another member or their family without bilateral verbal consent having been confirmed by the admin. Your date of birth is never displayed; only your approximate age is shown to other members.`,
  },
  {
    number: '5.',
    title: 'Code of Conduct',
    body: `All members are expected to conduct themselves with respect, dignity, and Islamic etiquette at all times. You must not attempt to contact any other member or their family outside of the platform's facilitated introduction process. Unsolicited or inappropriate communications will result in immediate suspension. The admin team's authority on matters of conduct is final. If you have a concern about another member's conduct, please contact the admin directly.`,
  },
  {
    number: '6.',
    title: 'Admin Authority',
    body: `The Zawaaj admin team may, at its sole discretion and without prior notice, approve, reject, pause, suspend, or permanently remove any profile from the platform. Decisions made by the admin team regarding eligibility, profile status, or introductions are final and not subject to appeal. The admin team acts in the best interests of the platform and its members.`,
  },
  {
    number: '7.',
    title: 'Limitation of Liability',
    body: `Zawaaj provides an introduction service only. We do not verify every piece of information submitted by members, and we make no guarantees, representations, or warranties regarding the suitability, character, or intentions of any member. We are not responsible for the outcome of any introduction, meeting, or marriage. Use of this platform is entirely at your own risk. Zawaaj, its operators, and its administrators shall not be liable for any loss, harm, or damage arising from use of this platform.`,
  },
  {
    number: '8.',
    title: 'Withdrawal & Data Retention',
    body: `You may withdraw your profile at any time by contacting the admin or using the withdrawal option in your profile settings. Upon withdrawal, your profile will be removed from the directory immediately and marked as withdrawn. Your personal data will be retained for a period of 2 years from the date of withdrawal for audit and safeguarding purposes, after which it will be permanently deleted. If you wish to request earlier deletion of your data, please contact the admin directly. Requests will be processed in accordance with applicable data protection law.`,
  },
]

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F8F6F1] px-4 py-14">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-10 text-center">
          <h1
            className="text-3xl font-bold tracking-tight mb-2"
            style={{ color: '#B8960C' }}
          >
            ZAWAAJ
          </h1>
          <p className="text-base font-semibold" style={{ color: '#1A1A1A' }}>
            Terms &amp; Conditions
          </p>
          <p className="mt-1 text-xs" style={{ color: '#6B6B6B' }}>
            Last updated: April 2026
          </p>
        </div>

        {/* Intro */}
        <p
          className="mb-10 text-sm leading-relaxed"
          style={{ color: '#3A3A3A' }}
        >
          Please read these Terms &amp; Conditions carefully before using the
          Zawaaj platform. By creating a profile and using this service, you
          agree to be bound by these terms in full. If you do not agree, please
          do not use the platform.
        </p>

        {/* Clauses */}
        <div className="flex flex-col gap-8">
          {CLAUSES.map((clause) => (
            <section key={clause.number}>
              <h2
                className="text-sm font-bold uppercase tracking-wider mb-2"
                style={{ color: '#1A1A1A' }}
              >
                {clause.number} {clause.title}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: '#3A3A3A' }}>
                {clause.body}
              </p>
            </section>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-6 border-t" style={{ borderColor: '#D6D2C8' }}>
          <Link
            href="/login"
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: '#B8960C' }}
          >
            &larr; Back to login
          </Link>
        </div>

      </div>
    </main>
  )
}
