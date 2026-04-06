'use client'

import { useState } from 'react'
import Link from 'next/link'

interface FaqItem {
  q: string
  a: string
}

interface FaqSection {
  title: string
  items: FaqItem[]
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'What is Zawaaj?',
        a: 'Zawaaj is a private, invite-only Muslim matrimonial platform. It is not a dating app — its sole purpose is to facilitate serious matrimonial introductions between Muslim adults who are genuinely seeking marriage in accordance with Islamic principles.',
      },
      {
        q: 'Is there a fee to use Zawaaj?',
        a: 'Zawaaj is completely free for members. There are no subscription fees, no paid features, and no charges for requesting introductions.',
      },
      {
        q: 'How do I join?',
        a: 'Create an account and submit your profile using the sign-up form. Your profile will be reviewed by the admin team before being approved. This typically takes 1–3 business days. You will be notified once your profile is approved and you can access the member directory.',
      },
    ],
  },
  {
    title: 'The Directory',
    items: [
      {
        q: 'Who can see profiles in the directory?',
        a: 'Only approved members of Zawaaj can see other profiles in the directory. Profiles are not publicly accessible and are not indexed by search engines.',
      },
      {
        q: 'Why are profiles shown with initials only?',
        a: 'Privacy is a core value of the platform. Profiles display initials rather than full names to protect members until a formal introduction is made. Full names and contact details are only shared once both families have given verbal consent through the admin.',
      },
      {
        q: 'What information is shown in the directory?',
        a: 'The directory displays non-sensitive fields: approximate age, height, ethnicity, school of thought, education level, profession sector, location, and any attributes or preferences the member has chosen to share. Sensitive information such as contact number, date of birth, and guardian name is never displayed to other members.',
      },
    ],
  },
  {
    title: 'Requesting Introductions',
    items: [
      {
        q: 'How do I request an introduction?',
        a: 'Browse the directory and open a profile that interests you. Click the "Request Introduction" button on the profile page. The admin team will be notified and will begin the facilitation process.',
      },
      {
        q: 'Is there a limit on how many introductions I can request?',
        a: 'Yes. Each profile can send up to 5 introduction requests per calendar month. This is to encourage thoughtful, sincere requests rather than a high-volume approach. The counter resets at the start of each month.',
      },
      {
        q: 'What happens after I request an introduction?',
        a: 'The admin team reviews the request and contacts both families to gauge interest. If both parties are willing, the admin facilitates an introduction — this may be a phone call or meeting arranged between the families. Contact details are only exchanged once both sides have verbally consented through the admin.',
      },
    ],
  },
  {
    title: 'Your Profile',
    items: [
      {
        q: 'How do I edit my profile?',
        a: 'Visit the "My Profile" page from the navigation. You can update your details there. Some changes may require admin review before taking effect.',
      },
      {
        q: 'Can I pause my profile?',
        a: 'Yes. If you need a break — for example, you are pursuing an introduction or need time — you can pause your profile from the My Profile page. A paused profile is hidden from the directory but your account remains active.',
      },
      {
        q: 'How do I withdraw my profile?',
        a: 'You can withdraw your profile at any time from the My Profile page. You will be asked to provide a reason. Once withdrawn, your profile is removed from the directory immediately. Your data is retained for 2 years for audit purposes, after which it is deleted. If you want earlier deletion, contact the admin.',
      },
    ],
  },
  {
    title: 'Etiquette & Conduct',
    items: [
      {
        q: 'What conduct is expected of members?',
        a: 'All members are expected to behave with respect, sincerity, and Islamic etiquette. This is a platform built on trust. Every interaction should reflect that.',
      },
      {
        q: 'Can I contact another member directly?',
        a: 'No. Do not attempt to contact any member or their family outside of the platform\'s facilitated process. All introductions must go through the admin team. Attempting direct unsolicited contact will result in immediate suspension.',
      },
      {
        q: 'How do I report a concern?',
        a: 'If you have any concern about another member\'s conduct or about any interaction on the platform, please contact the admin directly. All reports are handled with confidentiality.',
      },
    ],
  },
]

function AccordionSection({ section }: { section: FaqSection }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function toggle(i: number) {
    setOpenIndex((prev) => (prev === i ? null : i))
  }

  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: '#1A1A1A' }}>
      {/* Section header */}
      <div
        className="px-5 py-4 border-b"
        style={{ borderColor: '#2E2E2E' }}
      >
        <h2
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color: '#B8960C' }}
        >
          {section.title}
        </h2>
      </div>

      {/* Items */}
      <div>
        {section.items.map((item, i) => {
          const isOpen = openIndex === i
          const isLast = i === section.items.length - 1
          return (
            <div
              key={i}
              className={!isLast ? 'border-b' : ''}
              style={{ borderColor: '#2E2E2E' }}
            >
              <button
                type="button"
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                aria-expanded={isOpen}
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: '#F8F6F1' }}
                >
                  {item.q}
                </span>
                <span
                  className="shrink-0 text-base font-bold transition-transform duration-200"
                  style={{
                    color: '#B8960C',
                    display: 'inline-block',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  }}
                  aria-hidden="true"
                >
                  +
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5">
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#C8C5BC' }}
                  >
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-[#F8F6F1] px-4 py-14">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <h1
            className="text-2xl font-bold tracking-tight mb-1"
            style={{ color: '#1A1A1A' }}
          >
            Help &amp; FAQ
          </h1>
          <p className="text-sm" style={{ color: '#6B6B6B' }}>
            Answers to common questions about Zawaaj.
          </p>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-5">
          {FAQ_SECTIONS.map((section) => (
            <AccordionSection key={section.title} section={section} />
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-10 pt-6 border-t" style={{ borderColor: '#D6D2C8' }}>
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
