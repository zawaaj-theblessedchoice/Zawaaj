export type HelpBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'callout'; title: string; body: string }
  | { type: 'step'; number: number; title: string; body: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }

export interface HelpArticle {
  slug: string
  title: string
  deck: string
  category: string
  readTime: number
  related: string[]
  blocks: HelpBlock[]
}

export interface HelpCategory {
  id: string
  title: string
  description: string
  icon: 'clock' | 'person' | 'envelope' | 'lock' | 'people' | 'search' | 'star' | 'gear'
  articleCount: number
}

export const CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    description: 'How Zawaaj works, creating your account, and what to expect.',
    icon: 'clock',
    articleCount: 6,
  },
  {
    id: 'your-profile',
    title: 'Your profile',
    description: 'Building a strong profile and understanding the approval process.',
    icon: 'person',
    articleCount: 7,
  },
  {
    id: 'introductions',
    title: 'Introductions',
    description: 'The introduction system — requests, confirmed interest, and facilitation.',
    icon: 'envelope',
    articleCount: 8,
  },
  {
    id: 'privacy',
    title: 'Privacy & safety',
    description: 'How your data is protected and what others can see.',
    icon: 'lock',
    articleCount: 6,
  },
  {
    id: 'families',
    title: 'Guidance for families',
    description: 'For parents and family members involved in the search.',
    icon: 'people',
    articleCount: 6,
  },
  {
    id: 'discovering',
    title: 'Discovering profiles',
    description: 'Browsing, filtering, shortlisting, and compatibility.',
    icon: 'search',
    articleCount: 6,
  },
  {
    id: 'membership',
    title: 'Membership & billing',
    description: 'Community Access, Plus, and Premium plans — billing, upgrading, and what each tier includes.',
    icon: 'star',
    articleCount: 6,
  },
  {
    id: 'account',
    title: 'Account settings',
    description: 'Password, preferences, notifications, and account management.',
    icon: 'gear',
    articleCount: 4,
  },
]

export const ARTICLES: HelpArticle[] = [
  // ─── getting-started ────────────────────────────────────────────────────────
  {
    slug: 'what-is-zawaaj',
    title: 'What is Zawaaj and how is it different?',
    deck: 'Zawaaj is a private, invite-only Muslim matrimonial platform built around family values, Islamic etiquette, and genuine intentions. Here is what makes it different from anything else you may have tried.',
    category: 'getting-started',
    readTime: 3,
    related: ['how-it-works-overview', 'member-guidelines', 'etiquette-on-zawaaj'],
    blocks: [
      {
        type: 'p',
        text: 'Most matrimonial services are designed to maximise sign-ups. Zawaaj is designed to maximise sincerity. We are a small, curated platform where every profile is reviewed by a human before it goes live — and where every introduction goes through a proper facilitation process rather than being left to two strangers to navigate alone.',
      },
      {
        type: 'h2',
        text: 'Not a dating app',
      },
      {
        type: 'p',
        text: 'Zawaaj has no messaging between members. There is no swiping, no likes, no direct chat. Instead, when you express interest in someone, we handle the introduction — contacting both families, gathering verbal consent, and only then facilitating a first contact. This is how many families prefer it to work.',
      },
      {
        type: 'h2',
        text: 'Invite-only and private',
      },
      {
        type: 'p',
        text: 'We do not advertise publicly or allow open sign-ups. Every member joins through a personal invite or a referral from someone who trusts the platform. This keeps the community small, serious, and safe.',
      },
      {
        type: 'callout',
        title: 'Profiles are never publicly visible',
        body: 'Your profile cannot be found on Google. Only approved members can see the directory. We actively block search engine indexing.',
      },
      {
        type: 'h2',
        text: 'Family-centred by design',
      },
      {
        type: 'p',
        text: 'Parents and guardians can manage a profile on behalf of a son or daughter. The whole process is built so that families can be involved as much or as little as the member wishes — and every introduction requires consent from both sides before details are exchanged.',
      },
    ],
  },
  {
    slug: 'how-it-works-overview',
    title: 'How Zawaaj works — an overview',
    deck: 'From creating your profile to receiving an introduction, here is the full journey on Zawaaj in plain language.',
    category: 'getting-started',
    readTime: 4,
    related: ['creating-your-account', 'profile-approval-process', 'how-introductions-work'],
    blocks: [
      {
        type: 'step',
        number: 1,
        title: 'Create your profile',
        body: 'Sign up and complete the multi-step registration form. You will provide personal details, lifestyle information, your preferences for a spouse, and a short bio. The whole form takes around 15–20 minutes.',
      },
      {
        type: 'step',
        number: 2,
        title: 'Wait for approval',
        body: 'Our team reviews every profile before it goes live. This typically takes 1–3 business days. We may contact you if we have questions. You will receive an email once your profile is approved.',
      },
      {
        type: 'step',
        number: 3,
        title: 'Browse the directory',
        body: 'Once approved, you can browse profiles of opposite-gender members. Profiles show non-sensitive details — age, location, education, school of thought, and a bio. You can filter and shortlist profiles you would like to revisit.',
      },
      {
        type: 'step',
        number: 4,
        title: 'Request an introduction',
        body: 'When you find someone you feel is worth exploring, you can send an introduction request. How many you can send per month depends on your membership tier (Community Access members get 2, Plus members get 5, Premium members get 10). The request is private — the other member does not see your name, only that someone has expressed interest.',
      },
      {
        type: 'step',
        number: 5,
        title: 'Mutual interest',
        body: 'If the other member responds positively to your request, mutual interest is confirmed automatically and our team is notified.',
      },
      {
        type: 'step',
        number: 6,
        title: 'Admin facilitates',
        body: 'We contact both families, explain the situation, and gather verbal consent. Only once both sides say yes do we share contact details and facilitate a proper introduction.',
      },
      {
        type: 'callout',
        title: 'No direct messaging',
        body: 'Members cannot contact each other directly on Zawaaj. All introductions are facilitated by our team. This protects everyone involved.',
      },
    ],
  },
  {
    slug: 'creating-your-account',
    title: 'Creating your account',
    deck: 'A step-by-step guide to signing up and submitting your profile for review.',
    category: 'getting-started',
    readTime: 3,
    related: ['profile-approval-process', 'after-profile-submission', 'creating-a-good-profile'],
    blocks: [
      {
        type: 'p',
        text: 'Signing up for Zawaaj is straightforward, but we do ask for quite a bit of information. This is intentional — a detailed profile helps us facilitate better introductions and shows other members that you are serious.',
      },
      {
        type: 'h2',
        text: 'Before you start',
      },
      {
        type: 'ul',
        items: [
          'You will need a valid email address',
          'Have some time set aside — the form has multiple steps and takes around 15–20 minutes',
          'Think about what you want to say in your bio beforehand',
          'You will need to read and agree to our terms before submitting',
        ],
      },
      {
        type: 'h2',
        text: 'The sign-up steps',
      },
      {
        type: 'ol',
        items: [
          'Enter your email and choose a password',
          'Provide your personal details (name, date of birth, gender)',
          'Add lifestyle details (education, profession, location)',
          'Share your Islamic practice and background',
          'Describe your family situation and preferences',
          'Write your bio',
          'Set your preferences for a spouse',
          'Review and submit',
        ],
      },
      {
        type: 'callout',
        title: 'Your profile is not live until approved',
        body: 'Submitting the form does not immediately make your profile visible. Our team reviews every submission before it is approved. You will receive an email when your profile is live.',
      },
      {
        type: 'p',
        text: 'If you need to pause partway through, your progress may not be saved — so it is best to complete the form in one sitting if you can.',
      },
    ],
  },
  {
    slug: 'profile-approval-process',
    title: 'The profile approval process',
    deck: 'Here is what happens after you submit your profile, and what our team looks for during the review.',
    category: 'getting-started',
    readTime: 3,
    related: ['creating-your-account', 'after-profile-submission', 'member-guidelines'],
    blocks: [
      {
        type: 'p',
        text: 'Every profile on Zawaaj is reviewed by a human before it goes live. This is one of the things that makes our community trustworthy — we do not just auto-approve accounts.',
      },
      {
        type: 'h2',
        text: 'What we look for',
      },
      {
        type: 'ul',
        items: [
          'That the profile represents a real person with genuine matrimonial intentions',
          'That the information provided is consistent and believable',
          'That the bio is respectful, appropriate, and written in the spirit of the platform',
          'That the member has agreed to our community guidelines',
        ],
      },
      {
        type: 'h2',
        text: 'How long does it take?',
      },
      {
        type: 'p',
        text: 'Most profiles are reviewed within 1–3 business days. During busy periods it may take a little longer. We will always let you know by email — either to confirm approval or to let you know if we need more information.',
      },
      {
        type: 'callout',
        title: 'We may contact you',
        body: 'Occasionally we will email or call to ask a clarifying question. This is normal and does not mean anything is wrong with your profile. Please respond promptly so we can keep things moving.',
      },
      {
        type: 'h2',
        text: 'What if my profile is not approved?',
      },
      {
        type: 'p',
        text: 'We will always tell you why a profile is not approved and, where possible, give you the chance to address any issues. In most cases, profiles are declined because of an incomplete bio or unclear information — not because of anything more serious.',
      },
    ],
  },
  {
    slug: 'member-guidelines',
    title: 'Member guidelines and community standards',
    deck: 'Zawaaj is built on trust. These are the standards we ask every member to uphold.',
    category: 'getting-started',
    readTime: 4,
    related: ['etiquette-on-zawaaj', 'reporting-a-concern', 'what-is-zawaaj'],
    blocks: [
      {
        type: 'p',
        text: 'Our platform only works when every member treats it — and each other — with respect and sincerity. These guidelines are not bureaucratic rules; they reflect the values we expect all members to already hold.',
      },
      {
        type: 'h2',
        text: 'Sincerity',
      },
      {
        type: 'p',
        text: 'Only join if you are genuinely seeking marriage. Browsing out of curiosity, maintaining multiple active introductions without serious intent, or creating a profile for someone without their knowledge are all violations of this principle.',
      },
      {
        type: 'h2',
        text: 'Honesty',
      },
      {
        type: 'p',
        text: 'Everything in your profile must be truthful. Do not exaggerate qualifications, misrepresent your circumstances, or omit information that would be relevant to a potential match.',
      },
      {
        type: 'h2',
        text: 'No direct contact',
      },
      {
        type: 'p',
        text: 'You must not attempt to contact other members or their families outside the platform. Do not try to identify members from limited profile information. All communication must go through our facilitation process.',
      },
      {
        type: 'callout',
        title: 'Breach of these guidelines',
        body: 'Any serious breach of these guidelines — including unsolicited contact, dishonesty, or inappropriate behaviour — will result in immediate suspension. We take this seriously.',
      },
      {
        type: 'h2',
        text: 'Respect for the process',
      },
      {
        type: 'p',
        text: 'The introduction process takes time. Please be patient and responsive. If you are no longer available — because you are pursuing another introduction, or for any other reason — please pause or withdraw your profile so others are not kept waiting.',
      },
    ],
  },
  {
    slug: 'etiquette-on-zawaaj',
    title: 'Etiquette on Zawaaj',
    deck: 'A gentle guide to navigating the platform with grace, patience, and Islamic values.',
    category: 'getting-started',
    readTime: 3,
    related: ['member-guidelines', 'introduction-etiquette', 'no-response-guidance'],
    blocks: [
      {
        type: 'p',
        text: 'The search for a spouse is one of the most significant journeys in a person\'s life. We hope Zawaaj feels like a dignified and supportive part of that journey — and good etiquette from every member makes that possible.',
      },
      {
        type: 'h2',
        text: 'Be patient',
      },
      {
        type: 'p',
        text: 'Responses take time. Families need to consult with each other. Do not send multiple requests to the same person or contact us repeatedly chasing a response. Trust that our team is working through things.',
      },
      {
        type: 'h2',
        text: 'Be honest, even when declining',
      },
      {
        type: 'p',
        text: 'If you receive an introduction request and you are not interested, it is fine to say so. A clear "no" is kinder than silence. Our team handles these conversations with care and discretion.',
      },
      {
        type: 'h2',
        text: 'Keep the process private',
      },
      {
        type: 'p',
        text: 'Do not share profile information about other members with people outside the facilitation process. Other members have trusted us with their personal details, and that trust extends to you.',
      },
      {
        type: 'callout',
        title: 'Making du\'a',
        body: 'This is a process that benefits from patience and trust in Allah. Many of our members find it helpful to make istikhara at key moments in the process. We hope your journey is one of ease, insha\'Allah.',
      },
    ],
  },

  // ─── your-profile ───────────────────────────────────────────────────────────
  {
    slug: 'creating-a-good-profile',
    title: 'Creating a profile that represents you well',
    deck: 'Your profile is often the first impression someone has of you. Here is how to make it genuine, warm, and effective.',
    category: 'your-profile',
    readTime: 4,
    related: ['writing-your-bio', 'profile-writing-tips', 'profile-fields-explained'],
    blocks: [
      {
        type: 'p',
        text: 'A good profile does not need to be perfect — it needs to be honest. The members who receive the most thoughtful introduction requests are not always the ones with the most impressive credentials; they are the ones whose profiles feel real.',
      },
      {
        type: 'h2',
        text: 'Fill in every field',
      },
      {
        type: 'p',
        text: 'Incomplete profiles make it harder for our team to approve your profile, and harder for other members to get a sense of who you are. Even if a field feels awkward, do your best to complete it — you can always use "prefer not to say" where appropriate.',
      },
      {
        type: 'h2',
        text: 'Write a proper bio',
      },
      {
        type: 'p',
        text: 'The bio is the most important part of your profile. It is where you can speak as yourself, not just tick boxes. See our separate article on writing your bio for detailed guidance.',
      },
      {
        type: 'h2',
        text: 'Be specific where you can',
      },
      {
        type: 'ul',
        items: [
          'Instead of "I love sports", say "I play football most weekends and have a terrible golf handicap"',
          'Instead of "family is important to me", describe what that looks like in practice',
          'Instead of vague religious language, say what your practice actually looks like day-to-day',
        ],
      },
      {
        type: 'callout',
        title: 'Honesty over impression management',
        body: 'It can be tempting to present an idealised version of yourself. But the goal is a lifelong marriage — and that begins with honesty. The right person will appreciate the real you.',
      },
    ],
  },
  {
    slug: 'profile-writing-tips',
    title: 'Profile writing tips',
    deck: 'Practical advice for writing a profile that feels genuine and gives others a real sense of who you are.',
    category: 'your-profile',
    readTime: 3,
    related: ['writing-your-bio', 'creating-a-good-profile', 'profile-fields-explained'],
    blocks: [
      {
        type: 'h2',
        text: 'Write as yourself',
      },
      {
        type: 'p',
        text: 'Read your bio back aloud. Does it sound like something you would actually say? If it reads like a job application, rewrite it in a warmer, more natural voice.',
      },
      {
        type: 'h2',
        text: 'Avoid clichés',
      },
      {
        type: 'ul',
        items: [
          '"I enjoy long walks" — say where you like to walk and why',
          '"Family means everything to me" — everyone says this; describe it',
          '"I am looking for my other half" — what does that actually mean to you?',
          '"I am equally comfortable at home or out" — this tells no one anything',
        ],
      },
      {
        type: 'h2',
        text: 'Mention what matters to you in a marriage',
      },
      {
        type: 'p',
        text: 'What are you hoping your married life will look and feel like? What values do you want to share with your spouse? What kind of home do you want to build together? These are the questions that make someone think "yes, this person gets it".',
      },
      {
        type: 'h2',
        text: 'Keep it a reasonable length',
      },
      {
        type: 'p',
        text: 'Three to five paragraphs is about right. Shorter than that leaves too much unsaid. Longer than that can become overwhelming. You are not writing a memoir — you are opening a door.',
      },
      {
        type: 'callout',
        title: 'Ask someone who knows you to read it',
        body: 'A parent, sibling, or close friend can tell you whether the profile sounds like you — and often catches things you have missed or taken for granted.',
      },
    ],
  },
  {
    slug: 'writing-your-bio',
    title: 'Writing your bio — the most important section',
    deck: 'The bio is where your profile comes alive. It is the one place where you can speak directly and personally — and it makes all the difference.',
    category: 'your-profile',
    readTime: 5,
    related: ['profile-writing-tips', 'creating-a-good-profile', 'profile-fields-explained'],
    blocks: [
      {
        type: 'p',
        text: 'Everything else in your profile — age, education, location — is data. The bio is where you become a person. A well-written bio is the single thing most likely to prompt someone to send an introduction request.',
      },
      {
        type: 'h2',
        text: 'What to include',
      },
      {
        type: 'ul',
        items: [
          'A little about who you are and how you spend your time',
          'What your deen means to you in day-to-day life',
          'What kind of partnership you are hoping for',
          'What you are looking for in a spouse — but in human terms, not a checklist',
          'Anything that gives a real sense of your personality',
        ],
      },
      {
        type: 'h2',
        text: 'A structure that works',
      },
      {
        type: 'ol',
        items: [
          'Open with something true and specific about who you are',
          'Describe your life — work, family, interests',
          'Talk about your faith and what it means to you',
          'Describe what you are hoping for in a marriage',
          'Close warmly — what would you say if you were in the room?',
        ],
      },
      {
        type: 'h2',
        text: 'What to avoid',
      },
      {
        type: 'ul',
        items: [
          'A list of adjectives ("I am kind, caring, and ambitious")',
          'Negativity about past experiences',
          'A long list of requirements for a spouse',
          'Anything that reads as though it was written by a committee',
        ],
      },
      {
        type: 'callout',
        title: 'Be the person you want to attract',
        body: 'If you want a thoughtful, warm, specific bio from the person you end up with — be the person who writes one. It sets the tone for the kind of introduction you will receive.',
      },
    ],
  },
  {
    slug: 'profile-fields-explained',
    title: 'Profile fields explained — what each one means',
    deck: 'A plain-language guide to each section of the profile form, so you know exactly what to put where.',
    category: 'your-profile',
    readTime: 5,
    related: ['creating-a-good-profile', 'editing-your-profile', 'what-others-can-see'],
    blocks: [
      {
        type: 'h2',
        text: 'Personal details',
      },
      {
        type: 'p',
        text: 'Name, date of birth, and gender. Your date of birth is never shown to other members — we display your age and an approximate age range instead.',
      },
      {
        type: 'h2',
        text: 'Location',
      },
      {
        type: 'p',
        text: 'We ask for the city or region where you live. We do not ask for your specific address. This helps members filter by geography and gives a sense of whether relocation might be needed.',
      },
      {
        type: 'h2',
        text: 'Education and profession',
      },
      {
        type: 'p',
        text: 'We ask for both the level/sector (shown to members) and a more specific detail (used by our team for context). You can be as specific or general as you feel comfortable with in the detail fields.',
      },
      {
        type: 'h2',
        text: 'School of thought and religiosity',
      },
      {
        type: 'p',
        text: 'These fields help with compatibility matching. "School of thought" refers to your madhhab or tradition (e.g. Hanafi, Salafi, etc.). "Religiosity" is a self-assessment of how observant you are. Neither of these is used to judge you — they are used to help find compatible matches.',
      },
      {
        type: 'h2',
        text: 'Preferences',
      },
      {
        type: 'p',
        text: 'The preferences section is about what you are looking for in a spouse — age range, location preference, school of thought, and so on. Be honest but not so narrow that you close doors unnecessarily.',
      },
      {
        type: 'callout',
        title: 'Contact details are admin-only',
        body: 'Your contact number and guardian name are never shown to other members. They are used only by our team for facilitation purposes.',
      },
    ],
  },
  {
    slug: 'editing-your-profile',
    title: 'Editing your profile after approval',
    deck: 'You can update your profile at any time. Here is what changes immediately and what may need to be reviewed.',
    category: 'your-profile',
    readTime: 2,
    related: ['profile-fields-explained', 'after-profile-submission', 'sharing-your-profile'],
    blocks: [
      {
        type: 'p',
        text: 'Life changes, and your profile should reflect who you are now. You can edit most fields on the My Profile page at any time.',
      },
      {
        type: 'h2',
        text: 'What updates immediately',
      },
      {
        type: 'ul',
        items: [
          'Your bio',
          'Your preferences',
          'Your lifestyle details (location, job sector, etc.)',
          'Your attributes and spouse preference keywords',
        ],
      },
      {
        type: 'h2',
        text: 'What may need admin review',
      },
      {
        type: 'p',
        text: 'Significant changes — such as updating your marital status, removing a key detail, or substantially rewriting your bio — may be flagged for a quick review. This is rare and usually very quick.',
      },
      {
        type: 'callout',
        title: 'Pausing your profile',
        body: 'If you are pursuing an introduction and want to temporarily step back from the directory, you can pause your profile from the My Profile page. Your profile will not appear in Browse while paused.',
      },
    ],
  },
  {
    slug: 'sharing-your-profile',
    title: 'Sharing your profile with family',
    deck: 'You can share a view of your profile with trusted family members so they can review what others see about you.',
    category: 'your-profile',
    readTime: 2,
    related: ['what-others-can-see', 'shared-profile-links', 'guide-for-parents'],
    blocks: [
      {
        type: 'p',
        text: 'Many members find it helpful to share their profile with a parent or close family member so they can see what the profile looks like to other members.',
      },
      {
        type: 'h2',
        text: 'How to share your profile',
      },
      {
        type: 'p',
        text: 'From the My Profile page, you will find a "Share profile" option. This generates a link that shows a read-only view of your profile — the same view that other members see.',
      },
      {
        type: 'callout',
        title: 'What shared links show',
        body: 'Shared profile links show only what other members can see — not your contact number, guardian name, date of birth, or any admin-only fields. They are safe to share with family.',
      },
      {
        type: 'p',
        text: 'Shared links are for family members only. Please do not share your profile link publicly or on social media.',
      },
    ],
  },
  {
    slug: 'after-profile-submission',
    title: 'What happens after you submit your profile',
    deck: 'You have filled in the form and clicked submit — here is what happens next.',
    category: 'your-profile',
    readTime: 2,
    related: ['profile-approval-process', 'creating-your-account', 'editing-your-profile'],
    blocks: [
      {
        type: 'step',
        number: 1,
        title: 'You receive a confirmation email',
        body: 'As soon as you submit, we send a confirmation to the email address you registered with. This confirms we have received your profile.',
      },
      {
        type: 'step',
        number: 2,
        title: 'Your profile enters the review queue',
        body: 'Our team reviews submissions in order. We aim to review all profiles within 1–3 business days.',
      },
      {
        type: 'step',
        number: 3,
        title: 'We may be in touch',
        body: 'If we have questions about any part of your profile, we will email or call you. Responding promptly speeds things up.',
      },
      {
        type: 'step',
        number: 4,
        title: 'You receive an approval email',
        body: 'Once approved, you receive an email with a link to log in and start browsing. Your profile is now live and visible to approved opposite-gender members.',
      },
      {
        type: 'callout',
        title: 'Check your junk folder',
        body: 'Our emails sometimes end up in spam or junk. If you have not heard from us within 4 business days, please check there first, then get in touch.',
      },
    ],
  },

  // ─── introductions ──────────────────────────────────────────────────────────
  {
    slug: 'how-introductions-work',
    title: 'How introductions work — the complete guide',
    deck: 'The introduction system is at the heart of Zawaaj. Here is everything you need to know about how it works, from first expression of interest to facilitated contact.',
    category: 'introductions',
    readTime: 6,
    related: ['requesting-an-introduction', 'mutual-match-explained', 'after-a-mutual-match'],
    blocks: [
      {
        type: 'p',
        text: 'Unlike messaging-based platforms, Zawaaj does not allow members to contact each other directly. Instead, we facilitate every introduction — which means our team is involved at every step, and contact details are never shared without consent from both sides.',
      },
      {
        type: 'h2',
        text: 'Step one: you send an introduction request',
      },
      {
        type: 'p',
        text: 'When you find a profile you would like to explore, you click "Request introduction". This sends a private signal — the other member does not see your name or any identifying details at this stage.',
      },
      {
        type: 'h2',
        text: 'Step two: the request sits pending',
      },
      {
        type: 'p',
        text: 'Your request remains pending for up to 30 days. During this time, the other member may — independently — also send you a request. Or our team may approach them on your behalf.',
      },
      {
        type: 'h2',
        text: 'Step three: the other member responds',
      },
      {
        type: 'p',
        text: 'Community Access members respond using simple Accept or Decline buttons. Plus and Premium members respond using a formal templated message — all templates begin with Assalamu alaikum. If the response is positive, mutual interest is confirmed and the admin team is notified automatically.',
      },
      {
        type: 'h2',
        text: 'Step four: admin review and facilitation',
      },
      {
        type: 'p',
        text: 'Once mutual interest is confirmed, our team contacts both families to verify and gather verbal consent. We take care to handle this sensitively and do not rush anyone.',
      },
      {
        type: 'h2',
        text: 'Step five: introduction',
      },
      {
        type: 'p',
        text: 'Once both families have consented, we share contact details and facilitate a proper introduction. From here, the families take over.',
      },
      {
        type: 'callout',
        title: 'Our role ends at introduction',
        body: 'We facilitate the introduction and then step back. From that point, the families and the prospective couple conduct their own process in the way that feels right for them.',
      },
    ],
  },
  {
    slug: 'requesting-an-introduction',
    title: 'Requesting an introduction — step by step',
    deck: 'Ready to express interest in someone? Here is exactly how to send a request and what to expect afterwards.',
    category: 'introductions',
    readTime: 3,
    related: ['how-introductions-work', 'monthly-request-limits', 'mutual-match-explained'],
    blocks: [
      {
        type: 'step',
        number: 1,
        title: 'Find a profile you are interested in',
        body: 'Browse the directory and open a profile. Take time to read it properly before deciding.',
      },
      {
        type: 'step',
        number: 2,
        title: 'Click "Request introduction"',
        body: 'On the profile page, you will see a button to request an introduction. Click it to confirm your interest.',
      },
      {
        type: 'step',
        number: 3,
        title: 'The request is sent privately',
        body: 'The other member does not receive your name or any identifying information. They will know someone has expressed interest, but not who.',
      },
      {
        type: 'step',
        number: 4,
        title: 'Track your request',
        body: 'Go to the Introductions page to see all your active requests and their current status.',
      },
      {
        type: 'callout',
        title: 'Monthly request limits apply',
        body: 'Community Access members can send 2 requests per month, Plus members 5, and Premium members 10. Use them thoughtfully — the counter resets on the first of each month.',
      },
      {
        type: 'p',
        text: 'If the other member responds positively, mutual interest is confirmed automatically and our team will begin the facilitation process.',
      },
    ],
  },
  {
    slug: 'monthly-request-limits',
    title: 'Monthly request limits — how they work and why',
    deck: 'Introduction requests are limited per calendar month depending on your membership tier. Here is why we do this and how to make the most of your allowance.',
    category: 'introductions',
    readTime: 3,
    related: ['requesting-an-introduction', 'how-introductions-work', 'introduction-etiquette'],
    blocks: [
      {
        type: 'p',
        text: 'We limit introduction requests because we believe the process works better when people are thoughtful. A platform where you can send unlimited requests in minutes encourages a browsing mentality — lots of low-effort expressions of interest that rarely lead anywhere meaningful.',
      },
      {
        type: 'h2',
        text: 'The limit in numbers',
      },
      {
        type: 'ul',
        items: [
          'Community Access: 2 requests per month',
          'Zawaaj Plus: 5 requests per month',
          'Zawaaj Premium: 10 requests per month',
          'The counter resets on the 1st of each month',
          'Pending requests that expire do not restore your allowance',
          'Requests you withdraw do not restore your allowance either',
        ],
      },
      {
        type: 'callout',
        title: 'Active request limits',
        body: 'In addition to your monthly allowance, there is a cap on how many requests can be pending at once: Community Access members can have 1 active pending request at a time, Plus members 2, and Premium members have no limit on active pending requests.',
      },
      {
        type: 'h2',
        text: 'How to use your allowance wisely',
      },
      {
        type: 'p',
        text: 'Read profiles fully before requesting. Shortlist profiles you are considering and come back to them. Think about whether you genuinely feel this person is worth exploring — not just whether their stats look good on paper.',
      },
      {
        type: 'callout',
        title: 'Quality over quantity',
        body: 'Members who send thoughtful, considered requests tend to get better outcomes than those who rush through their allowance on the first day of each month.',
      },
    ],
  },
  {
    slug: 'mutual-match-explained',
    title: 'Mutual interest confirmed — what it means',
    deck: 'Mutual interest is confirmed when both members have positively responded to each other\'s introduction request. Here is what it means and what happens next.',
    category: 'introductions',
    readTime: 3,
    related: ['after-a-mutual-match', 'how-introductions-work', 'requesting-an-introduction'],
    blocks: [
      {
        type: 'p',
        text: 'Mutual interest is confirmed when you and another member have both positively responded to each other\'s introduction request. The response may be a simple Accept (Community Access) or a formal Assalamu alaikum template (Plus and Premium). Either way, both sides have independently said yes — and that is genuinely significant.',
      },
      {
        type: 'h2',
        text: 'How it is detected',
      },
      {
        type: 'p',
        text: 'The system checks both directions. When you respond positively to a request and the other member has also responded positively to yours, the system automatically confirms mutual interest and notifies the admin team.',
      },
      {
        type: 'h2',
        text: 'What happens when mutual interest is confirmed',
      },
      {
        type: 'p',
        text: 'Our team is notified. We then review the match and begin the facilitation process — contacting both families to confirm interest and gather consent before proceeding.',
      },
      {
        type: 'callout',
        title: 'Mutual interest confirmed is not a guarantee',
        body: 'Mutual interest confirmed means both sides have responded positively — but facilitation still requires verbal consent from both families before any details are shared. Either party can still say no at that stage.',
      },
    ],
  },
  {
    slug: 'after-a-mutual-match',
    title: 'What happens after mutual interest is confirmed',
    deck: 'Both sides have confirmed interest. Here is the step-by-step process our team follows to facilitate an introduction.',
    category: 'introductions',
    readTime: 4,
    related: ['mutual-match-explained', 'how-introductions-work', 'introduction-etiquette'],
    blocks: [
      {
        type: 'step',
        number: 1,
        title: 'Our team is notified',
        body: 'As soon as mutual interest is confirmed, our team receives an automatic alert. We aim to begin the facilitation process within 1–2 business days.',
      },
      {
        type: 'step',
        number: 2,
        title: 'We contact both families',
        body: 'We reach out to both parties — usually by phone or email — to let them know mutual interest has been confirmed and to gauge whether they would like to proceed.',
      },
      {
        type: 'step',
        number: 3,
        title: 'We gather verbal consent',
        body: 'Before sharing any contact details, we need verbal consent from both families. We take our time here and do not pressure anyone.',
      },
      {
        type: 'step',
        number: 4,
        title: 'Introduction is facilitated',
        body: 'Once both sides have consented, we share each family\'s contact details and facilitate the introduction. The families then take it from there.',
      },
      {
        type: 'callout',
        title: 'Please be responsive',
        body: 'When we contact you about a confirmed introduction, please respond promptly. If we cannot reach you within a reasonable time, we may have to pause the process.',
      },
      {
        type: 'p',
        text: 'After an introduction, we may follow up to see how things are progressing — not to intrude, but to be available if you need any support or guidance.',
      },
    ],
  },
  {
    slug: 'when-a-request-expires',
    title: 'When a request expires without a match',
    deck: 'Introduction requests expire after 30 days if mutual interest is not confirmed. Here is what that means and what to do next.',
    category: 'introductions',
    readTime: 2,
    related: ['no-response-guidance', 'requesting-an-introduction', 'monthly-request-limits'],
    blocks: [
      {
        type: 'p',
        text: 'Every introduction request has a 30-day window. If the other member does not also express interest within that time, the request expires automatically.',
      },
      {
        type: 'h2',
        text: 'What expiry means',
      },
      {
        type: 'ul',
        items: [
          'The request moves to "expired" status on your Introductions page',
          'It does not mean the other member saw your request and said no — they may simply not have browsed your profile',
          'It does not affect your reputation on the platform in any way',
          'Your monthly allowance is not restored',
        ],
      },
      {
        type: 'callout',
        title: 'You can request again next month',
        body: 'If your allowance resets and you are still interested in the same profile, you can send a new request. There is no rule against expressing interest in someone more than once.',
      },
      {
        type: 'p',
        text: 'Expiry is a normal part of the process. Not every request will result in a match, and that is okay. The right person is worth being patient for.',
      },
    ],
  },
  {
    slug: 'no-response-guidance',
    title: "What if I don't get a response?",
    deck: "Not hearing back can be disheartening. Here is a grounded way to think about it, and what your options are.",
    category: 'introductions',
    readTime: 3,
    related: ['when-a-request-expires', 'introduction-etiquette', 'monthly-request-limits'],
    blocks: [
      {
        type: 'p',
        text: 'It is natural to feel disappointed when a request expires without a response. Try to remember that on Zawaaj, silence does not necessarily mean rejection — the other member may simply not have visited their profile recently, or may be in the middle of another process.',
      },
      {
        type: 'h2',
        text: 'What you can do',
      },
      {
        type: 'ul',
        items: [
          'Continue browsing and send requests to other profiles',
          'Revisit your own profile — could it communicate who you are more clearly?',
          'Use your shortlist to keep track of profiles you want to come back to',
          'If your allowance resets and you are still interested, you can send a new request',
        ],
      },
      {
        type: 'callout',
        title: 'Do not take it personally',
        body: 'There are many reasons a request might not result in a match that have nothing to do with you. Timing, circumstance, and where someone is in their own journey all play a role.',
      },
      {
        type: 'h2',
        text: 'What not to do',
      },
      {
        type: 'p',
        text: 'Do not attempt to identify the member from their profile and contact them outside the platform. Do not send multiple requests to the same person in the same month. Do not contact us to ask why someone did not respond — we cannot share that information.',
      },
    ],
  },
  {
    slug: 'introduction-etiquette',
    title: "Introduction etiquette — dos and don'ts",
    deck: 'How to navigate the introduction process with grace, respect, and Islamic values.',
    category: 'introductions',
    readTime: 3,
    related: ['etiquette-on-zawaaj', 'no-response-guidance', 'after-a-mutual-match'],
    blocks: [
      {
        type: 'h2',
        text: 'Do',
      },
      {
        type: 'ul',
        items: [
          'Read profiles fully before sending a request',
          'Be honest with our team about your level of interest',
          'Respond promptly when our team contacts you about a match',
          'Pause your profile if you are actively pursuing an introduction',
          'Be kind and clear if you decide not to proceed',
        ],
      },
      {
        type: 'h2',
        text: "Don't",
      },
      {
        type: 'ul',
        items: [
          'Send requests impulsively just because you have allowance remaining',
          'Keep multiple introductions running simultaneously without being transparent',
          'Ghost the process — if you are no longer interested, say so',
          'Try to contact the other member or their family directly',
          'Share details of other members with people outside the process',
        ],
      },
      {
        type: 'callout',
        title: 'Treat others as you would want to be treated',
        body: 'Every profile represents a real person with real feelings and real hopes. The golden rule applies here as much as anywhere.',
      },
    ],
  },

  // ─── privacy ─────────────────────────────────────────────────────────────────
  {
    slug: 'what-others-can-see',
    title: 'What can other members see about me?',
    deck: 'A clear breakdown of which parts of your profile are visible to other members and which are kept private.',
    category: 'privacy',
    readTime: 3,
    related: ['contact-detail-protection', 'shared-profile-links', 'your-data-rights'],
    blocks: [
      {
        type: 'h2',
        text: 'What other members can see',
      },
      {
        type: 'ul',
        items: [
          'Your display initials (not your full name)',
          'Your approximate age and height',
          'Your ethnicity and nationality',
          'Your school of thought and religiosity',
          'Your education level and profession sector',
          'Your location (city or region)',
          'Your bio',
          'Your attributes and spouse preference keywords',
          'Whether you wear hijab or keep a beard',
          'Your marital status and family situation',
          'Your openness to relocation and partner\'s children',
        ],
      },
      {
        type: 'h2',
        text: 'What is never shown to other members',
      },
      {
        type: 'ul',
        items: [
          'Your full name',
          'Your contact number',
          'Your date of birth (only approximate age is shown)',
          'Your guardian\'s name',
          'Your email address',
          'Any admin notes or comments',
          'Your withdrawal reason (if applicable)',
          'Whether you have been flagged as a duplicate profile',
        ],
      },
      {
        type: 'callout',
        title: 'Contact details are shared only with consent',
        body: 'Your phone number and email are only ever shared during a facilitated introduction, and only after both families have given verbal consent.',
      },
    ],
  },
  {
    slug: 'shared-profile-links',
    title: 'Shared profile links — how they work',
    deck: 'Shared profile links let you show your profile to trusted family members without giving them platform access.',
    category: 'privacy',
    readTime: 2,
    related: ['what-others-can-see', 'sharing-your-profile', 'contact-detail-protection'],
    blocks: [
      {
        type: 'p',
        text: 'A shared profile link generates a read-only view of your profile — the same view that other approved members see when they visit your profile. It is useful for showing a parent or sibling what your profile looks like.',
      },
      {
        type: 'h2',
        text: 'What shared links include',
      },
      {
        type: 'p',
        text: 'The link shows everything a member would see: your initials, bio, lifestyle details, and preferences. It does not include your contact details, date of birth, or any admin-only information.',
      },
      {
        type: 'callout',
        title: 'Shared links are for family, not social media',
        body: 'Please only share your profile link with people you trust. Do not post it publicly. If you think your link has been shared inappropriately, contact us and we can generate a new one.',
      },
      {
        type: 'h2',
        text: 'Do shared links expire?',
      },
      {
        type: 'p',
        text: 'Shared links remain active as long as your profile is active. If you withdraw or delete your profile, any previously shared links will stop working.',
      },
    ],
  },
  {
    slug: 'contact-detail-protection',
    title: 'How contact details are protected',
    deck: 'Your phone number and email are among the most sensitive details on your profile. Here is exactly how we protect them.',
    category: 'privacy',
    readTime: 3,
    related: ['what-others-can-see', 'your-data-rights', 'reporting-a-concern'],
    blocks: [
      {
        type: 'p',
        text: 'We take the protection of your contact details very seriously. They are stored securely, never shown to other members, and only shared at the precise moment of a facilitated introduction — and only with your explicit verbal consent.',
      },
      {
        type: 'h2',
        text: 'How contact details are stored',
      },
      {
        type: 'p',
        text: 'Contact details are stored in a separate, admin-only layer of the database. Even if someone were to access the member-facing data, they would not be able to see your number or email.',
      },
      {
        type: 'h2',
        text: 'When they are shared',
      },
      {
        type: 'p',
        text: 'Contact details are only shared during a facilitated introduction, after both families have given verbal consent and our team has confirmed the introduction is proceeding.',
      },
      {
        type: 'callout',
        title: 'We never sell your data',
        body: 'Your information is used only for the purposes of facilitating introductions on the platform. We do not share, sell, or trade your data with third parties.',
      },
    ],
  },
  {
    slug: 'reporting-a-concern',
    title: 'How to report a concern or inappropriate behaviour',
    deck: 'If something does not feel right — on the platform or in the process — please tell us. We take all concerns seriously.',
    category: 'privacy',
    readTime: 2,
    related: ['blocking-guidance', 'member-guidelines', 'your-data-rights'],
    blocks: [
      {
        type: 'p',
        text: 'Zawaaj is a community built on trust. If someone behaves in a way that feels wrong — disrespectful, dishonest, or unsafe — we want to know about it.',
      },
      {
        type: 'h2',
        text: 'What to report',
      },
      {
        type: 'ul',
        items: [
          'Any attempt by another member to contact you outside the platform',
          'Behaviour during a facilitated introduction that felt inappropriate',
          'Information in a profile that you believe is false or misleading',
          'Any interaction with our team that did not feel right',
          'Any safety concern, however small',
        ],
      },
      {
        type: 'h2',
        text: 'How to report',
      },
      {
        type: 'p',
        text: 'Email us at hello@zawaaj.uk with as much detail as you can share. All reports are handled confidentially by the admin team.',
      },
      {
        type: 'callout',
        title: 'Your report will not affect your profile',
        body: 'Raising a concern will never result in any negative consequence for your own profile. We actively encourage members to report anything that does not feel right.',
      },
    ],
  },
  {
    slug: 'blocking-guidance',
    title: 'Blocking guidance',
    deck: 'If you do not want to appear in a specific member\'s browse results, you have options. Here is how it works.',
    category: 'privacy',
    readTime: 2,
    related: ['reporting-a-concern', 'what-others-can-see', 'member-guidelines'],
    blocks: [
      {
        type: 'p',
        text: 'We do not currently have an in-app blocking feature, but you can contact our team if you would like to prevent a specific member from seeing your profile.',
      },
      {
        type: 'h2',
        text: 'How to request a block',
      },
      {
        type: 'p',
        text: 'Email us at hello@zawaaj.uk with the profile in question. We will take action discreetly and promptly. You do not need to explain your reasons in detail — we respect your judgment.',
      },
      {
        type: 'callout',
        title: 'Blocking is confidential',
        body: 'The blocked member will not be notified. They will simply not see your profile in their Browse results.',
      },
      {
        type: 'p',
        text: 'If a concern is serious enough to warrant blocking, it may also be worth making a formal report so we can review the member\'s conduct more broadly.',
      },
    ],
  },
  {
    slug: 'your-data-rights',
    title: 'Your data rights and how to request deletion',
    deck: 'You have the right to access, correct, and delete your personal data. Here is how to exercise those rights.',
    category: 'privacy',
    readTime: 3,
    related: ['contact-detail-protection', 'reporting-a-concern', 'what-others-can-see'],
    blocks: [
      {
        type: 'p',
        text: 'We take your data rights seriously. You have the right to know what data we hold about you, to correct anything that is inaccurate, and to request that your data is deleted.',
      },
      {
        type: 'h2',
        text: 'What data we hold',
      },
      {
        type: 'p',
        text: 'We hold the information you provided during sign-up, any updates you have made to your profile, introduction request records, and any communications between you and our team.',
      },
      {
        type: 'h2',
        text: 'Requesting your data',
      },
      {
        type: 'p',
        text: 'Email hello@zawaaj.uk to request a copy of the data we hold about you. We will respond within 30 days.',
      },
      {
        type: 'h2',
        text: 'Requesting deletion',
      },
      {
        type: 'p',
        text: 'You can delete your account at any time from the Account Settings page. This will remove your profile from the directory immediately. We retain some data for a period of up to two years for audit purposes — if you would like earlier deletion, please contact us.',
      },
      {
        type: 'callout',
        title: 'UK GDPR applies',
        body: 'We operate under UK GDPR. If you believe we are not handling your data correctly, you have the right to raise a complaint with the Information Commissioner\'s Office (ICO).',
      },
    ],
  },

  // ─── families ────────────────────────────────────────────────────────────────
  {
    slug: 'guide-for-parents',
    title: 'A guide for parents managing a profile',
    deck: 'Many parents come to Zawaaj hoping to support their son or daughter in finding a spouse. Welcome — here is how to get the most out of the platform.',
    category: 'families',
    readTime: 5,
    related: ['parent-managed-profiles', 'the-family-role', 'managing-expectations'],
    blocks: [
      {
        type: 'p',
        text: 'You may be managing this profile yourself, or doing this alongside your son or daughter. Either way, we want this process to be as comfortable, dignified, and effective as possible for your family.',
      },
      {
        type: 'h2',
        text: 'What Zawaaj can and cannot do',
      },
      {
        type: 'p',
        text: 'We can connect you with profiles of suitable potential spouses, facilitate introductions with proper consent from both families, and support you through the process. We cannot guarantee a match, cannot speed up someone else\'s decision, and cannot share information about other members beyond what is shown on their profile.',
      },
      {
        type: 'h2',
        text: 'How to approach browsing',
      },
      {
        type: 'p',
        text: 'Start by reading profiles carefully. Look beyond the basic statistics — the bio is where you will find the most useful information. Shortlist profiles that feel genuinely suitable, and take your time before sending requests.',
      },
      {
        type: 'callout',
        title: 'Involve your child',
        body: 'Even if you are managing the profile, it is important that your son or daughter is involved in decisions about who to request introductions with. Their willingness and enthusiasm are what make an introduction meaningful.',
      },
      {
        type: 'h2',
        text: 'Communicating with our team',
      },
      {
        type: 'p',
        text: 'We are approachable and happy to talk. If you have questions about a profile or want to discuss the process, email us at hello@zawaaj.uk. We handle all conversations with care and confidentiality.',
      },
    ],
  },
  {
    slug: 'parent-managed-profiles',
    title: 'Parent-managed profiles — setting up and managing',
    deck: 'If a parent is managing a profile on behalf of their child, here is what to know about setting things up and managing them well.',
    category: 'families',
    readTime: 3,
    related: ['guide-for-parents', 'the-family-role', 'sharing-your-profile'],
    blocks: [
      {
        type: 'p',
        text: 'Zawaaj fully supports parent-managed profiles. This is common, particularly for sisters whose families prefer to be involved in the search. If you are a parent managing a profile, you can do everything a member can do — browse, shortlist, and send requests.',
      },
      {
        type: 'h2',
        text: 'Setting up',
      },
      {
        type: 'p',
        text: 'Sign up using the parent\'s or guardian\'s email address if preferred, but make sure the profile itself accurately represents the candidate — their age, background, preferences, and bio. Our team reviews every profile, and consistency matters.',
      },
      {
        type: 'h2',
        text: 'Multiple candidates',
      },
      {
        type: 'p',
        text: 'If you have multiple children you are managing profiles for, it is possible to have more than one profile linked to the same account. Contact us for guidance on setting this up.',
      },
      {
        type: 'callout',
        title: 'Keep contact details up to date',
        body: 'When an introduction is facilitated, we contact the number or email registered with the profile. Make sure this is a number or address that will be checked regularly.',
      },
    ],
  },
  {
    slug: 'the-family-role',
    title: 'The family role in the process',
    deck: 'In Islamic matrimonial tradition, the family plays an important role. Here is how Zawaaj honours that role within the platform.',
    category: 'families',
    readTime: 3,
    related: ['guide-for-parents', 'the-family-role', 'istikhara-and-the-process'],
    blocks: [
      {
        type: 'p',
        text: 'The role of the family — particularly the wali — is something we take seriously. Zawaaj is not designed to replace family involvement; it is designed to facilitate a process in which families can be as involved as the member wishes.',
      },
      {
        type: 'h2',
        text: 'Consent at every stage',
      },
      {
        type: 'p',
        text: 'We do not facilitate an introduction without verbal consent from both families. This means no contact details are shared until both sides have said yes — through us.',
      },
      {
        type: 'h2',
        text: 'Working with the wali',
      },
      {
        type: 'p',
        text: 'For sisters, we are happy to communicate directly with the wali if that is the family\'s preference. Just let us know when you register or at any point during the process.',
      },
      {
        type: 'callout',
        title: 'We follow your lead',
        body: 'Every family has different expectations and customs. We do not impose a single way of doing things — we adapt to what works best for you within the platform\'s framework.',
      },
    ],
  },
  {
    slug: 'conversation-starters',
    title: 'Conversation starters — how to discuss this with your child',
    deck: 'Starting the matrimonial search can feel delicate. Here are some thoughts on how to open the conversation with care.',
    category: 'families',
    readTime: 3,
    related: ['guide-for-parents', 'managing-expectations', 'the-family-role'],
    blocks: [
      {
        type: 'p',
        text: 'Every family dynamic is different, and there is no one right way to have this conversation. But there are some things that tend to help it go well.',
      },
      {
        type: 'h2',
        text: 'Lead with listening',
      },
      {
        type: 'p',
        text: 'Before talking about the platform or who you might contact, ask your son or daughter about what they are looking for. What matters to them? What are their concerns? Feeling heard makes the whole process feel safer.',
      },
      {
        type: 'h2',
        text: 'Be honest about your involvement',
      },
      {
        type: 'p',
        text: 'If you are planning to manage the profile yourself, say so — and make sure they are comfortable with that. Surprises in this process can cause friction. Agreement from the start makes everything smoother.',
      },
      {
        type: 'h2',
        text: 'Focus on the process, not the outcome',
      },
      {
        type: 'p',
        text: 'Avoid putting pressure on timelines or outcomes. The goal of the conversation is simply to begin a process together — one that feels safe and dignified for everyone involved.',
      },
      {
        type: 'callout',
        title: 'Du\'a first',
        body: 'Many families find it helpful to make du\'a together before embarking on the search. Asking Allah for ease, clarity, and the right outcome sets a beautiful intention for everything that follows.',
      },
    ],
  },
  {
    slug: 'istikhara-and-the-process',
    title: 'Istikhara and the matrimonial process',
    deck: "A reflection on how istikhara fits naturally into the journey of finding a spouse through Zawaaj.",
    category: 'families',
    readTime: 3,
    related: ['etiquette-on-zawaaj', 'managing-expectations', 'conversation-starters'],
    blocks: [
      {
        type: 'p',
        text: 'Istikhara is one of the most beautiful tools available to us in moments of important decision-making. The matrimonial search is one of the most significant decisions a person will make, and istikhara fits naturally into every stage.',
      },
      {
        type: 'h2',
        text: 'When to make istikhara',
      },
      {
        type: 'ul',
        items: [
          'Before submitting a profile — asking Allah for ease and the right outcome',
          'Before sending an introduction request for a specific person',
          'After mutual interest is confirmed, when deciding whether to proceed',
          'At any point when you feel uncertain or need clarity',
        ],
      },
      {
        type: 'p',
        text: 'Istikhara is not a single prayer that produces a yes or no answer. It is a sustained orientation of the heart toward Allah\'s guidance, combined with the best action you can take. Taking a careful, thoughtful approach to each step of the process is itself a form of trust in Allah.',
      },
      {
        type: 'callout',
        title: 'A reminder',
        body: 'Zawaaj is simply a means. The outcome rests with Allah. Do what you can with sincerity and good character, and trust that what is right will come, insha\'Allah.',
      },
    ],
  },
  {
    slug: 'managing-expectations',
    title: 'Managing expectations — a gentle guide',
    deck: 'The matrimonial search rarely goes as planned. Here is a gentle guide to keeping expectations realistic and spirits steady.',
    category: 'families',
    readTime: 3,
    related: ['istikhara-and-the-process', 'no-response-guidance', 'guide-for-parents'],
    blocks: [
      {
        type: 'p',
        text: 'Many families come to us with high hopes — and that is as it should be. But the search for a spouse can take longer than expected, and the process can be emotionally demanding. Being prepared for that makes all the difference.',
      },
      {
        type: 'h2',
        text: 'It takes time',
      },
      {
        type: 'p',
        text: 'We have seen members find a match within a few months, and we have seen others take much longer. There is no typical timeline. Rushing — sending requests impulsively, pushing a process forward before everyone is ready — almost always makes things harder, not easier.',
      },
      {
        type: 'h2',
        text: 'Not every request will result in a match',
      },
      {
        type: 'p',
        text: 'This is completely normal. A request expiring or not being reciprocated is not a reflection of worth — it is simply the nature of a process where both parties need to be independently interested in each other.',
      },
      {
        type: 'callout',
        title: 'Pace yourselves',
        body: 'Take breaks when you need them. Pause the profile if it is all feeling too intense. The search works best when approached with a steady, hopeful heart — not a desperate one.',
      },
      {
        type: 'h2',
        text: 'Celebrate small steps',
      },
      {
        type: 'p',
        text: 'A well-written profile, a shortlist of good candidates, a confirmed introduction — each of these is progress. Recognise them as such.',
      },
    ],
  },

  // ─── discovering ────────────────────────────────────────────────────────────
  {
    slug: 'how-to-browse',
    title: 'How to browse and discover profiles',
    deck: 'The Browse page is your main tool for discovering compatible profiles. Here is how to use it well.',
    category: 'discovering',
    readTime: 3,
    related: ['using-filters', 'using-the-shortlist', 'new-profiles-feature'],
    blocks: [
      {
        type: 'p',
        text: 'The Browse page shows you approved profiles of opposite-gender members. You can browse all profiles, view newly approved ones, or see profiles that are recommended based on your own preferences.',
      },
      {
        type: 'h2',
        text: 'The three tabs',
      },
      {
        type: 'ul',
        items: [
          'Recommended — profiles that match your stated preferences',
          'All profiles — the full directory, sorted by newest first',
          'Shortlist — profiles you have saved',
        ],
      },
      {
        type: 'h2',
        text: 'Opening a profile',
      },
      {
        type: 'p',
        text: 'Click on any profile card to open a detailed view. This shows the full bio, all lifestyle details, and the option to shortlist or request an introduction.',
      },
      {
        type: 'h2',
        text: 'Browsing thoughtfully',
      },
      {
        type: 'p',
        text: 'Resist the urge to browse quickly. Reading a profile carefully takes a few minutes but gives you a much better sense of whether this is someone worth exploring. The best matches often come from people who took time to read rather than scan.',
      },
      {
        type: 'callout',
        title: 'New since your last visit',
        body: 'A badge on the All profiles tab shows how many new profiles have been approved since your last visit. It is a good reason to check in regularly.',
      },
    ],
  },
  {
    slug: 'using-filters',
    title: 'Using filters effectively',
    deck: 'Filters help you narrow the directory to profiles most likely to be compatible. Here is how to use them well — without being too restrictive.',
    category: 'discovering',
    readTime: 3,
    related: ['how-to-browse', 'compatibility-highlights', 'recommended-section'],
    blocks: [
      {
        type: 'p',
        text: 'The Browse page includes filters for age range, location, school of thought, education level, and more. Filters are a useful starting point — but use them as a guide, not a rulebook.',
      },
      {
        type: 'h2',
        text: 'Available filters',
      },
      {
        type: 'ul',
        items: [
          'Age range',
          'Location',
          'School of thought',
          'Education level',
          'Profession sector',
          'Wears hijab / keeps beard',
          'Open to relocation',
        ],
      },
      {
        type: 'h2',
        text: 'A word of caution about over-filtering',
      },
      {
        type: 'p',
        text: 'The more filters you apply, the fewer profiles you see — and some of the most compatible matches come from people who do not fit your initial criteria on paper. A person two years outside your age preference, or in a different city, might be exactly right.',
      },
      {
        type: 'callout',
        title: 'Start broad, then narrow',
        body: 'Try browsing with minimal filters first, and only narrow down if you are genuinely overwhelmed by results. Many members are surprised by who they find when they browse openly.',
      },
    ],
  },
  {
    slug: 'compatibility-highlights',
    title: 'Understanding compatibility highlights',
    deck: 'Profile cards sometimes show compatibility indicators. Here is what they mean and how they are calculated.',
    category: 'discovering',
    readTime: 2,
    related: ['recommended-section', 'using-filters', 'how-to-browse'],
    blocks: [
      {
        type: 'p',
        text: 'When you browse profiles, you may notice small indicators showing areas where a profile is compatible with your own preferences. These are calculated automatically from the preferences you set in your profile.',
      },
      {
        type: 'h2',
        text: 'What is compared',
      },
      {
        type: 'ul',
        items: [
          'Age — does the other person fall within your preferred age range?',
          'Location — are they in or near your preferred area?',
          'School of thought — does it match one of your preferences?',
          'Openness to relocation — are your positions compatible?',
          'Partner\'s children — are your preferences aligned?',
        ],
      },
      {
        type: 'callout',
        title: 'Compatibility indicators are a starting point',
        body: 'A high compatibility score does not mean a match will work, and a lower score does not mean it won\'t. Use the indicators to surface profiles worth exploring — but always read the bio.',
      },
    ],
  },
  {
    slug: 'using-the-shortlist',
    title: 'Using the shortlist feature',
    deck: 'The shortlist lets you save profiles you want to revisit. Here is how to use it as part of a thoughtful browsing process.',
    category: 'discovering',
    readTime: 2,
    related: ['how-to-browse', 'using-filters', 'requesting-an-introduction'],
    blocks: [
      {
        type: 'p',
        text: 'The shortlist is a private list of profiles you have saved. Other members cannot see your shortlist, and the people you shortlist are not notified.',
      },
      {
        type: 'h2',
        text: 'How to shortlist a profile',
      },
      {
        type: 'p',
        text: 'Open any profile and click the bookmark or heart icon. The profile is added to your shortlist immediately.',
      },
      {
        type: 'h2',
        text: 'Using your shortlist well',
      },
      {
        type: 'p',
        text: 'Use the shortlist to keep track of profiles you want to think about before deciding whether to request an introduction. Come back after a day or two and see which ones still feel interesting. This often helps you use your monthly request allowance more thoughtfully.',
      },
      {
        type: 'callout',
        title: 'Profiles can change',
        body: 'A profile you shortlisted last month may have been updated since. It is worth revisiting profiles before requesting an introduction to make sure the information is current.',
      },
    ],
  },
  {
    slug: 'new-profiles-feature',
    title: 'New profiles — what the feature shows',
    deck: 'The "New profiles" indicator shows you profiles that have been approved since your last visit. Here is how to use it.',
    category: 'discovering',
    readTime: 2,
    related: ['how-to-browse', 'recommended-section', 'using-filters'],
    blocks: [
      {
        type: 'p',
        text: 'Every time you visit the Browse page, we record your visit. The next time you come back, we show you a count of new profiles that have been approved since then.',
      },
      {
        type: 'h2',
        text: 'Why it matters',
      },
      {
        type: 'p',
        text: 'New profiles are worth checking first. They are people who have just joined the community and whose profiles have not yet been seen by many members. Being one of the first to express interest is sometimes meaningful.',
      },
      {
        type: 'callout',
        title: 'The count resets on each visit',
        body: 'The "new since last visit" count updates every time you visit the Browse page. So if you browse every day, you will see just the profiles approved in the last 24 hours.',
      },
    ],
  },
  {
    slug: 'recommended-section',
    title: 'The Recommended section explained',
    deck: 'The Recommended tab shows profiles filtered to match your own stated preferences. Here is how it works.',
    category: 'discovering',
    readTime: 2,
    related: ['compatibility-highlights', 'using-filters', 'how-to-browse'],
    blocks: [
      {
        type: 'p',
        text: 'The Recommended tab is the default view when you open Browse. It shows you profiles that meet your stated preferences — the age range, location, school of thought, and other criteria you set when filling in your profile.',
      },
      {
        type: 'h2',
        text: 'How recommendations are generated',
      },
      {
        type: 'p',
        text: 'We filter the opposite-gender approved members against the preferences you have set. If a profile meets most of your criteria, it appears in Recommended. We do not use machine learning or algorithmic ranking — it is a straightforward compatibility filter.',
      },
      {
        type: 'callout',
        title: 'Update your preferences to improve recommendations',
        body: 'If your Recommended tab feels too narrow or too wide, updating your preferences on the My Profile page will immediately affect what appears there.',
      },
      {
        type: 'p',
        text: 'If the Recommended tab returns very few profiles, consider widening your preferences slightly — or switch to the All Profiles tab to browse the full directory.',
      },
    ],
  },

  // ─── membership ──────────────────────────────────────────────────────────────
  {
    slug: 'plans-overview',
    title: 'Plans overview — Community Access, Plus, and Premium',
    deck: 'Zawaaj offers three membership tiers. Here is what each one includes and how to decide which is right for you.',
    category: 'membership',
    readTime: 3,
    related: ['upgrading-your-plan', 'billing-faq', 'monthly-request-limits'],
    blocks: [
      {
        type: 'p',
        text: 'Zawaaj offers a free Community Access tier alongside two paid plans. All members go through the same admin-facilitated introduction process — the tier you choose affects how many introductions you can send and which features are available to you.',
      },
      {
        type: 'h2',
        text: 'Community Access (free)',
      },
      {
        type: 'p',
        text: 'Community Access is free with no credit card required. You can browse approved profiles, shortlist people, and send up to 2 introduction requests per month. When responding to requests, you use simple Accept or Decline buttons — no templated responses. You will see a summary view of profiles — full profile details are available on Plus and above.',
      },
      {
        type: 'h2',
        text: 'Zawaaj Plus',
      },
      {
        type: 'p',
        text: 'Plus gives you 5 introduction requests per month, full profile details for every member, and a monthly profile boost. Plus and Premium members respond to requests using 10 formal Assalamu alaikum templates, giving responses a more considered, Islamic tone. It is ideal for members who are actively searching and want a meaningful step up from the free tier.',
      },
      {
        type: 'h2',
        text: 'Zawaaj Premium',
      },
      {
        type: 'p',
        text: 'Premium gives you 10 introduction requests per month, weekly profile boosts, concierge matching (our team proactively suggests profiles for you), and the ability to see who has viewed your profile. It is for members who want the most from the platform.',
      },
      {
        type: 'callout',
        title: 'No tier is better at finding a match',
        body: 'A thoughtful, sincere Community Access member will often find a match before a Premium member who sends requests carelessly. The tier you choose affects your features, not your chances.',
      },
    ],
  },
  {
    slug: 'upgrading-your-plan',
    title: 'How to upgrade your plan',
    deck: 'Upgrading to Plus or Premium is straightforward. Here is how to do it.',
    category: 'membership',
    readTime: 2,
    related: ['plans-overview', 'billing-faq', 'cancelling-your-plan'],
    blocks: [
      {
        type: 'step',
        number: 1,
        title: 'Go to the Pricing page',
        body: 'From the sidebar, click the "Zawaaj Premium" link, or navigate to /pricing directly.',
      },
      {
        type: 'step',
        number: 2,
        title: 'Choose your plan',
        body: 'Review the Plus and Premium options and select the one that suits you.',
      },
      {
        type: 'step',
        number: 3,
        title: 'Complete payment',
        body: 'You will be taken to a secure Stripe checkout page. Payment is processed securely and your card details are never stored on our servers.',
      },
      {
        type: 'step',
        number: 4,
        title: 'Your plan is updated immediately',
        body: 'Once payment is confirmed, your new plan features are available straight away.',
      },
      {
        type: 'callout',
        title: 'Cancel any time',
        body: 'You can cancel your subscription at any time from the Account Settings page. You will retain your plan features until the end of your billing period.',
      },
    ],
  },
  {
    slug: 'billing-faq',
    title: 'Billing FAQ — common questions answered',
    deck: 'Answers to the most common questions about billing, charges, and subscription management.',
    category: 'membership',
    readTime: 3,
    related: ['plans-overview', 'cancelling-your-plan', 'refund-policy'],
    blocks: [
      {
        type: 'h2',
        text: 'When am I charged?',
      },
      {
        type: 'p',
        text: 'You are charged on the day you upgrade and then on the same date each month (or year, if you chose an annual plan).',
      },
      {
        type: 'h2',
        text: 'What payment methods are accepted?',
      },
      {
        type: 'p',
        text: 'We accept all major credit and debit cards through Stripe. We do not currently accept PayPal, bank transfer, or other payment methods.',
      },
      {
        type: 'h2',
        text: 'Will I receive a receipt?',
      },
      {
        type: 'p',
        text: 'Yes — Stripe sends a receipt to your registered email address after every successful payment.',
      },
      {
        type: 'h2',
        text: 'Can I change plans mid-cycle?',
      },
      {
        type: 'p',
        text: 'Yes. If you upgrade mid-cycle, you pay a prorated amount for the remainder of your current billing period. If you downgrade, the change takes effect at the end of your current period.',
      },
      {
        type: 'callout',
        title: 'Questions about a specific charge?',
        body: 'Email hello@zawaaj.uk with your account email and the amount and date of the charge, and we will look into it for you.',
      },
    ],
  },
  {
    slug: 'cancelling-your-plan',
    title: 'How to cancel your plan',
    deck: 'You can cancel your subscription at any time. Here is how.',
    category: 'membership',
    readTime: 2,
    related: ['billing-faq', 'refund-policy', 'plans-overview'],
    blocks: [
      {
        type: 'step',
        number: 1,
        title: 'Go to Account Settings',
        body: 'From the sidebar, click Settings, then find the Membership section.',
      },
      {
        type: 'step',
        number: 2,
        title: 'Click "Manage subscription"',
        body: 'This takes you to the Stripe billing portal where you can manage or cancel your subscription.',
      },
      {
        type: 'step',
        number: 3,
        title: 'Confirm cancellation',
        body: 'Follow the steps in the Stripe portal to cancel. You will receive a confirmation email.',
      },
      {
        type: 'callout',
        title: 'You keep access until the end of the period',
        body: 'Cancelling does not cut your access immediately. You retain your plan features until the end of the billing period you have already paid for.',
      },
      {
        type: 'p',
        text: 'After cancellation, your account reverts to Community Access automatically. No further charges will be made.',
      },
    ],
  },
  {
    slug: 'voluntary-contribution-explained',
    title: 'Why Community Access is free',
    deck: 'The Community Access tier is genuinely free. Here is our thinking behind it.',
    category: 'membership',
    readTime: 2,
    related: ['plans-overview', 'upgrading-your-plan', 'billing-faq'],
    blocks: [
      {
        type: 'p',
        text: 'We believe that cost should never be a barrier to finding a spouse. Community Access gives every approved member the ability to browse, shortlist, and send introduction requests at no cost. It is not a trial or a stripped-down taster — it is a genuine tier.',
      },
      {
        type: 'h2',
        text: 'What is different about paid plans?',
      },
      {
        type: 'p',
        text: 'Plus and Premium offer more introduction requests per month, full profile detail access, profile boosts, and (for Premium) concierge matching. These features help members who are actively searching get more out of the platform — but they are not required to find a match.',
      },
      {
        type: 'callout',
        title: 'Supporting the platform',
        body: 'Paid memberships help keep Zawaaj running for everyone, including the Community Access members who cannot or choose not to pay. If the platform has been useful to you, upgrading is one way to give back.',
      },
    ],
  },
  {
    slug: 'refund-policy',
    title: 'Our refund policy',
    deck: 'We want you to feel confident about any purchase on Zawaaj. Here is our refund policy in plain language.',
    category: 'membership',
    readTime: 2,
    related: ['billing-faq', 'cancelling-your-plan', 'plans-overview'],
    blocks: [
      {
        type: 'p',
        text: 'We offer refunds on a case-by-case basis. If you were charged in error, experienced a technical issue that prevented you from using your plan, or upgraded by mistake, please contact us within 7 days and we will make it right.',
      },
      {
        type: 'h2',
        text: 'What we do not refund',
      },
      {
        type: 'ul',
        items: [
          'Subscription periods you have already used',
          'Charges where you simply changed your mind after using the service',
          'Charges where you used the plan features during that period',
        ],
      },
      {
        type: 'callout',
        title: 'Get in touch',
        body: 'If you believe you are owed a refund, email hello@zawaaj.uk with your account details and a description of the issue. We will respond within 3 business days.',
      },
    ],
  },

  // ─── account ─────────────────────────────────────────────────────────────────
  {
    slug: 'changing-your-password',
    title: 'How to change your password',
    deck: 'You can update your password from Account Settings or via the forgot password flow.',
    category: 'account',
    readTime: 2,
    related: ['notification-settings', 'deleting-your-account', 'theme-and-appearance'],
    blocks: [
      {
        type: 'h2',
        text: 'From Account Settings',
      },
      {
        type: 'ol',
        items: [
          'Go to Settings from the sidebar',
          'Find the "Password" section',
          'Enter your current password and your new password',
          'Click Save',
        ],
      },
      {
        type: 'h2',
        text: 'If you have forgotten your password',
      },
      {
        type: 'p',
        text: 'Go to the login page and click "Forgot password". Enter your registered email address and we will send you a link to reset your password.',
      },
      {
        type: 'callout',
        title: 'Password security',
        body: 'Choose a password you do not use on other services. A strong password is at least 10 characters long and includes a mix of letters, numbers, and symbols.',
      },
    ],
  },
  {
    slug: 'theme-and-appearance',
    title: 'Theme and appearance settings',
    deck: 'Zawaaj uses a dark theme by default. Here is what appearance options are available.',
    category: 'account',
    readTime: 2,
    related: ['changing-your-password', 'notification-settings', 'deleting-your-account'],
    blocks: [
      {
        type: 'p',
        text: 'The member platform uses a dark theme as its default, which most members find comfortable for extended browsing sessions.',
      },
      {
        type: 'h2',
        text: 'Changing your theme',
      },
      {
        type: 'p',
        text: 'If theme options are available in your account, you can find them in Settings under Appearance. Not all appearance options are available on all versions of the platform.',
      },
      {
        type: 'callout',
        title: 'The help centre is always light',
        body: 'The help centre pages (like this one) always use a light theme for readability, regardless of your app theme setting.',
      },
    ],
  },
  {
    slug: 'notification-settings',
    title: 'Managing your notification preferences',
    deck: 'Control which emails you receive from Zawaaj and how often.',
    category: 'account',
    readTime: 2,
    related: ['changing-your-password', 'theme-and-appearance', 'deleting-your-account'],
    blocks: [
      {
        type: 'p',
        text: 'We send emails for important events: profile approval, introduction request updates, confirmed introductions, and account changes. You can manage which of these you receive from Settings.',
      },
      {
        type: 'h2',
        text: 'Notification types',
      },
      {
        type: 'ul',
        items: [
          'Introduction request updates (new, mutual, expired)',
          'Match facilitation updates',
          'Platform announcements and new features',
          'Events and community news',
        ],
      },
      {
        type: 'callout',
        title: 'Some emails cannot be turned off',
        body: 'Transactional emails — like password resets, billing receipts, and account changes — are always sent regardless of your notification preferences. These are essential for account security.',
      },
    ],
  },
  {
    slug: 'deleting-your-account',
    title: 'How to delete your account',
    deck: 'If you would like to permanently remove your account and data from Zawaaj, here is how.',
    category: 'account',
    readTime: 3,
    related: ['your-data-rights', 'changing-your-password', 'notification-settings'],
    blocks: [
      {
        type: 'p',
        text: 'We are sorry to see you go. If you are leaving because you have found someone, alhamdulillah — please let us know and we will celebrate with you.',
      },
      {
        type: 'h2',
        text: 'Withdrawing vs. deleting',
      },
      {
        type: 'p',
        text: 'Before deleting, consider whether you want to withdraw your profile instead. Withdrawing removes you from the directory while keeping your account intact — so you can return later if circumstances change.',
      },
      {
        type: 'h2',
        text: 'How to delete',
      },
      {
        type: 'ol',
        items: [
          'Go to Settings from the sidebar',
          'Scroll to the "Account" section',
          'Click "Delete account"',
          'Confirm your decision when prompted',
        ],
      },
      {
        type: 'callout',
        title: 'Data retention',
        body: 'Deleting your account removes your profile from the directory immediately. We retain some records for up to two years for audit purposes. If you want earlier full deletion, email hello@zawaaj.uk.',
      },
      {
        type: 'p',
        text: 'If you have an active subscription, please cancel it before deleting your account to avoid any future charges.',
      },
    ],
  },
]

export function getArticle(category: string, slug: string): HelpArticle | undefined {
  return ARTICLES.find(a => a.category === category && a.slug === slug)
}

export function getArticlesByCategory(category: string): HelpArticle[] {
  return ARTICLES.filter(a => a.category === category)
}

export function getAllArticles(): HelpArticle[] {
  return ARTICLES
}
