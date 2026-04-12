import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminHelpPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: role } = await supabase.rpc('zawaaj_get_role')
  if (role !== 'super_admin' && role !== 'manager') redirect('/')

  const isSuperAdmin = role === 'super_admin'

  return (
    <div className="min-h-screen" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text)' }}>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>Admin Help</h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>
            How roles, workflows, and responsibilities work on Zawaaj.
          </p>
        </div>

        {/* ── 1. Roles Overview ── */}
        <Section title="Roles overview">
          {isSuperAdmin && (
            <RoleCard
              title="Super Admin"
              badge="Full access"
              badgeColor="#B8960C"
              items={[
                'Full visibility across all members and introduction requests',
                'Assign managers to mutual introduction requests',
                'Override any status at any stage',
                'Promote members to Manager role',
                'Access all admin sub-pages (subscriptions, concierge, import)',
              ]}
            />
          )}
          <RoleCard
            title="Manager"
            badge="Scoped access"
            badgeColor="#60a5fa"
            items={[
              'Work only on introductions that have been assigned to you',
              'Move assigned requests from in-progress to complete',
              'Cannot access full dashboard, settings, or member management',
              'Cannot assign other managers or override status',
            ]}
          />
        </Section>

        {/* ── 2. Introduction Workflow ── */}
        <Section title="Introduction workflow">
          <p className="text-sm mb-5" style={{ color: 'var(--admin-muted)' }}>
            Every introduction request follows this path from first expression of interest to facilitation.
          </p>

          <div className="flex flex-col gap-2">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.status} className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                  style={{ background: step.color + '22', color: step.color, border: `1px solid ${step.color}44` }}
                >
                  {i + 1}
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{step.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--admin-muted)' }}>{step.description}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl leading-relaxed" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', fontSize: 14, color: 'var(--admin-muted)' }}>
            Admin involvement begins at <span style={{ color: 'var(--admin-text)' }}>admin_pending</span>. Everything before that is handled between the members.
          </div>
        </Section>

        {/* ── 3. Your Responsibilities (role-aware) ── */}
        <Section title="Your responsibilities">
          {isSuperAdmin ? (
            <ul className="space-y-3">
              {[
                'Monitor all pending and mutual requests from the Introductions page',
                'Assign a manager to each mutual request as soon as possible',
                'Step in and override status when a manager is unavailable',
                'Promote trusted members to the Manager role via the Managers page',
                'Ensure every member receives the same care regardless of their plan',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--admin-muted)' }}>
                  <span className="mt-0.5 flex-shrink-0" style={{ color: '#B8960C' }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-3">
              {[
                'Check the Introductions page regularly for newly assigned requests',
                'Contact both parties and begin coordinating the introduction',
                'Mark the request as "In progress" once you have made contact',
                'Mark as "Complete" only after both parties have been introduced',
                'Contact a Super Admin if you need to escalate or are unsure how to proceed',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--admin-muted)' }}>
                  <span className="mt-0.5 flex-shrink-0" style={{ color: '#60a5fa' }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* ── 4. Status Glossary ── */}
        <Section title="Status meanings">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {STATUS_GLOSSARY.map(({ status, label, meaning }) => (
              <div key={status} className="py-3 flex items-start gap-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <span
                  className="text-[11px] font-mono px-2 py-0.5 rounded flex-shrink-0 mt-0.5"
                  style={{
                    background: STATUS_COLORS[status]?.bg ?? '#1e1e1e',
                    color: STATUS_COLORS[status]?.text ?? '#9ca3af',
                  }}
                >
                  {label}
                </span>
                <span className="text-sm" style={{ color: 'var(--admin-muted)' }}>{meaning}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 5. Key Rules ── */}
        <Section title="Key rules">
          <ul className="space-y-3">
            {[
              'All members receive the same quality of admin care, regardless of plan tier.',
              'Managers only act on requests that have been explicitly assigned to them.',
              'Contact details are never shared between members directly — admin facilitates this.',
              'Never mark a request as complete before the introduction has actually happened.',
              'If in doubt, escalate to a Super Admin rather than making assumptions.',
            ].map(rule => (
              <li key={rule} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--admin-muted)' }}>
                <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--admin-muted)' }}>—</span>
                {rule}
              </li>
            ))}
          </ul>
        </Section>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--admin-muted)' }}>
        {title}
      </h2>
      <div className="rounded-xl p-5" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
        {children}
      </div>
    </section>
  )
}

function RoleCard({
  title,
  badge,
  badgeColor,
  items,
}: {
  title: string
  badge: string
  badgeColor: string
  items: string[]
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</span>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: badgeColor + '22', color: badgeColor, border: `1px solid ${badgeColor}44` }}
        >
          {badge}
        </span>
      </div>
      <ul className="space-y-1.5 pl-1">
        {items.map(item => (
          <li key={item} className="text-sm flex items-start gap-2" style={{ color: 'var(--admin-muted)' }}>
            <span style={{ color: badgeColor }} className="flex-shrink-0 mt-0.5">·</span>
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-3" style={{ borderBottom: '1px solid var(--admin-border)' }} />
    </div>
  )
}

// ─── Static config ────────────────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  { status: 'pending', label: 'Pending', description: 'Sender has made a request — waiting for the recipient to respond.', color: '#9ca3af' },
  { status: 'responded', label: 'Responded', description: 'Recipient has replied using a positive or decline template.', color: '#B8960C' },
  { status: 'mutual_confirmed', label: 'Mutual confirmed', description: 'Both parties expressed interest — a match has been created.', color: '#B8960C' },
  { status: 'admin_pending', label: 'Admin pending', description: 'Match is waiting to be assigned to an admin manager.', color: '#a5b4fc' },
  { status: 'admin_assigned', label: 'Assigned', description: 'A manager has been assigned and will begin coordination.', color: '#60a5fa' },
  { status: 'admin_in_progress', label: 'In progress', description: 'Manager has contacted both parties and is facilitating.', color: '#a3e635' },
  { status: 'admin_completed', label: 'Completed', description: 'Introduction has been facilitated. Both parties have been connected.', color: '#4ade80' },
]

const STATUS_GLOSSARY = [
  { status: 'pending',           label: 'pending',           meaning: 'Waiting for the recipient to respond to the request.' },
  { status: 'responded_positive',label: 'responded +',       meaning: 'Recipient accepted using a positive template.' },
  { status: 'mutual_confirmed',  label: 'mutual',            meaning: 'Both parties interested — match row created.' },
  { status: 'admin_pending',     label: 'admin pending',     meaning: 'Awaiting manager assignment from a Super Admin.' },
  { status: 'admin_assigned',    label: 'assigned',          meaning: 'Manager has been assigned — introduction not yet started.' },
  { status: 'admin_in_progress', label: 'in progress',       meaning: 'Manager is actively coordinating the introduction.' },
  { status: 'admin_completed',   label: 'completed',         meaning: 'Introduction has been facilitated successfully.' },
  { status: 'responded_negative',label: 'declined',          meaning: 'Recipient chose not to proceed.' },
  { status: 'expired',           label: 'expired',           meaning: 'Request was not responded to within 7 days.' },
  { status: 'withdrawn',         label: 'withdrawn',         meaning: 'Sender withdrew the request before a response.' },
]

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:            { bg: '#1e1e1e', text: '#9ca3af' },
  responded_positive: { bg: '#052e16', text: '#4ade80' },
  mutual_confirmed:   { bg: '#2a200a', text: '#B8960C' },
  admin_pending:      { bg: '#1e1e2e', text: '#a5b4fc' },
  admin_assigned:     { bg: '#0f2a3f', text: '#60a5fa' },
  admin_in_progress:  { bg: '#1a2000', text: '#a3e635' },
  admin_completed:    { bg: '#052e16', text: '#4ade80' },
  responded_negative: { bg: '#2d1515', text: '#f87171' },
  expired:            { bg: '#1c1c1c', text: '#6b7280' },
  withdrawn:          { bg: '#1c1c1c', text: '#6b7280' },
}
