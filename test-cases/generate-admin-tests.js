/**
 * Zawaaj — Super Admin Test Cases
 * Run: node test-cases/generate-admin-tests.js
 * Outputs: test-cases/Zawaaj_Tests_SuperAdmin.xlsx
 */

const XLSX = require('xlsx')
const path = require('path')

// ─── Column headers ───────────────────────────────────────────────────────────
const COLS = [
  'Test ID',
  'Who\'s needed',
  'Tester',
  'Category',
  'Test Case',
  'Pre-conditions',
  'Steps',
  'Expected Behaviour',
  'Actual Behaviour',
  'Pass / Fail',
  'Notes',
]

// ─── Helper ───────────────────────────────────────────────────────────────────
let counter = 1
function id(prefix) {
  return `${prefix}-${String(counter++).padStart(3, '0')}`
}

function row(prefix, category, testCase, preconditions, steps, expected, who = 'Self') {
  return {
    'Test ID': id(prefix),
    'Who\'s needed': who,
    'Tester': '',
    'Category': category,
    'Test Case': testCase,
    'Pre-conditions': preconditions,
    'Steps': steps,
    'Expected Behaviour': expected,
    'Actual Behaviour': '',
    'Pass / Fail': '',
    'Notes': '',
  }
}

// ─── Sheet 1 — Parent Registration Path A ────────────────────────────────────
counter = 1
const parentPathARows = [
  row('PAR-A', 'Registration', 'Check email uniqueness at step 0',
    'No existing account with email',
    '1. Go to /register\n2. Enter email\n3. Click Next',
    'Proceeds to step 1; no error', 'Self'),

  row('PAR-A', 'Registration', 'Email already taken at step 0',
    'Email exists in auth.users',
    '1. Go to /register\n2. Enter existing email\n3. Click Next',
    'Error: "An account with this email already exists." — cannot proceed', 'Self'),

  row('PAR-A', 'Registration', 'Complete 8-step registration wizard — candidate details',
    'Valid email; no existing account',
    '1. Complete steps 1-3: candidate personal info (name, DOB, location, profession, education, faith, bio)',
    'Form validates each step before allowing Next', 'Self'),

  row('PAR-A', 'Registration', 'Guardian / contact details step (step 4)',
    'No invite token; continuing registration',
    '1. Complete step 4: guardian name, contact number, relationship',
    'Guardian fields required; cannot skip', 'Self'),

  row('PAR-A', 'Registration', 'Preferences step',
    'On step 5',
    '1. Complete partner preferences (age range, location, school of thought, ethnicity)',
    'All fields optional; can proceed without selecting', 'Self'),

  row('PAR-A', 'Registration', 'Terms & consent step',
    'On step 7',
    '1. Check consent and terms boxes\n2. Click Submit',
    'Cannot submit without both boxes checked', 'Self'),

  row('PAR-A', 'Registration', 'Successful registration',
    'All steps complete; valid data',
    '1. Click Submit on final step',
    'Account created; family account created; profile created with status=pending; redirect to /pending', 'Self'),

  row('PAR-A', 'Post-registration', 'Pending page after registration',
    'Just completed registration',
    '1. After redirect to /pending',
    'Clock icon shown; "Application submitted — JazakAllahu Khayran" message; sign-out link', 'Self'),

  row('PAR-A', 'Post-registration', 'Profile not visible in browse before approval',
    'Profile status = pending',
    '1. Sign in as another member\n2. Browse member directory',
    'Newly registered profile not visible', 'Super Admin + Member'),

  row('PAR-A', 'Family account', 'Family account created on registration',
    'Completed Path A registration',
    '1. In Supabase / admin families view, search by contact email',
    'Family account row exists with contact_full_name, contact_email, registration_path = direct', 'Super Admin'),

  row('PAR-A', 'Family account', 'Admin can view family details after Path A',
    'As admin; on /admin/families',
    '1. Search for family\n2. Open family row',
    'Contact details, family members, invite tokens all visible', 'Super Admin'),
]

// ─── Sheet 2 — Invite Tokens ──────────────────────────────────────────────────
counter = 1
const inviteTokenRows = [
  row('INV', 'Admin — generate token', 'Admin generates child_invite token',
    'Signed in as super_admin; on /admin/families',
    '1. Find a family account\n2. Click "Invite child"\n3. Copy generated URL',
    'Token created in zawaaj_invite_tokens with purpose=child_invite; URL displayed', 'Super Admin'),

  row('INV', 'Admin — generate token', 'Admin generates guardian_invite token',
    'Signed in as super_admin',
    '1. Find a family account\n2. Click "Invite guardian"\n3. Copy generated URL',
    'Token created with purpose=guardian_invite; URL displayed', 'Super Admin'),

  row('INV', 'Admin — email token', 'Admin emails invite token to candidate',
    'Token generated; candidate email on file',
    '1. After generating token URL\n2. Click "✉ Email invite to [email]"',
    'Email sent to candidate with registration link; "Email sent" confirmation shown', 'Super Admin'),

  row('INV', 'Token validation', 'Valid token accepted on /register/child page',
    'Valid unexpired token URL',
    '1. Open /register/child?token=<valid_token>',
    'Gold "Invited registration" badge shown; guardian step skipped; pre-filled fields visible', 'Super Admin + Member'),

  row('INV', 'Token validation', 'Expired token shows error',
    'Token older than 7 days',
    '1. Open /register/child?token=<expired_token>',
    'Error screen: "This invitation has expired"; link to request new one', 'Super Admin + Member'),

  row('INV', 'Token validation', 'Already-used token shows error',
    'Token previously used (accepted_at set)',
    '1. Open /register/child?token=<used_token>',
    'Error screen: "This invitation has already been used"', 'Super Admin + Member'),

  row('INV', 'Token validation', 'Invalid/nonexistent token shows error',
    'Made-up token string',
    '1. Open /register/child?token=FAKEXXX',
    'Error screen: "Invalid invitation link"', 'Self'),

  row('INV', 'Step skipping', 'Guardian step skipped when token present',
    'Valid token accepted',
    '1. Step through form with token\n2. Observe step count',
    'Guardian details step (step 4) not shown; EFFECTIVE_TOTAL = 7 steps total', 'Super Admin + Member'),

  row('INV', 'Step skipping', 'Pre-filled guardian fields from token',
    'Token contains candidate name and email',
    '1. Open form with valid token',
    'Email field pre-filled from token; candidate name pre-filled if stored', 'Super Admin + Member'),

  row('INV', 'Auto-linkage', 'Profile linked to existing family account on submit',
    'Valid token; completed all steps',
    '1. Complete registration with valid token\n2. Submit',
    'New profile created; family_account_id set to existing family account; NO new family account created', 'Super Admin + Member'),

  row('INV', 'Auto-linkage', 'Token marked as used after successful registration',
    'Valid token; registration completed',
    '1. Complete registration\n2. Try to use same token URL again',
    'Token accepted_at is now set; second attempt shows "already used" error', 'Super Admin + Member'),

  row('INV', 'Auto-linkage', 'Admin can see linked profile under family account',
    'Registration completed via invite token',
    '1. Go to /admin/families\n2. Open the family account that issued the token',
    'New member profile appears under family account members list', 'Super Admin'),

  row('INV', 'Admin — families view', 'Families page lists all family accounts',
    'Signed in as super_admin',
    '1. Navigate to /admin/families',
    'All family accounts listed with contact info, member count, registration path', 'Super Admin'),

  row('INV', 'Admin — families view', 'Filter families by registration path',
    'On /admin/families',
    '1. Apply filter for "direct" or "child_direct"',
    'List updates to show only matching families', 'Super Admin'),

  row('INV', 'Admin — families view', 'Search families by name or email',
    'On /admin/families',
    '1. Type in search box',
    'Results filter to matching families', 'Super Admin'),
]

// ─── Sheet 3 — Events Management ─────────────────────────────────────────────
counter = 1
const adminEventsRows = [
  row('EVT', 'Admin events', 'Admin can access /admin/events',
    'Signed in as super_admin',
    '1. Click "Events" in admin sidebar\n2. Or navigate to /admin/events',
    'Events management page loads with list of all events', 'Super Admin'),

  row('EVT', 'Admin events', 'Create a new upcoming event',
    'On /admin/events',
    '1. Click "+ New event"\n2. Enter title, date, location, registration URL\n3. Set status to Upcoming\n4. Click Create',
    'Event created; appears in list with Upcoming badge; visible to members on /events', 'Super Admin'),

  row('EVT', 'Admin events', 'Create event without registration URL',
    'On /admin/events; new event modal open',
    '1. Enter title and date\n2. Leave registration URL blank\n3. Create',
    'Event created; member-facing page shows "Registration details coming soon"', 'Super Admin'),

  row('EVT', 'Admin events', 'Edit an existing event',
    'Event exists in list',
    '1. Click Edit on an event\n2. Update location or status\n3. Save',
    'Changes saved; event card updated immediately in admin list', 'Super Admin'),

  row('EVT', 'Admin events', 'Mark event as Ended',
    'Upcoming event exists',
    '1. Edit event\n2. Change status to "Ended"\n3. Save',
    'Status badge changes to Ended; event no longer appears in members\' upcoming section', 'Super Admin'),

  row('EVT', 'Admin events', 'Enable show_in_history for past event',
    'Event with status = ended',
    '1. Edit event\n2. Check "Show in past events history"\n3. Save',
    'Event appears in "Past events" section on member-facing /events page', 'Super Admin'),

  row('EVT', 'Admin events', 'Add attendance note to past event',
    'Ended event',
    '1. Edit event\n2. Add attendance note (e.g. "47 attendees")\n3. Save',
    'Note displayed on past event card for members', 'Super Admin'),

  row('EVT', 'Admin events', 'Archive an event',
    'Any non-archived event',
    '1. Click Archive button\n2. Confirm prompt',
    'Event status → archived; disappears from member view; still visible in admin list with "Archived" filter', 'Super Admin'),

  row('EVT', 'Admin events', 'Filter events by status in admin',
    'Multiple events in different statuses',
    '1. Click Upcoming / Ended / Archived filter tabs',
    'List filters to show only matching events', 'Super Admin'),

  row('EVT', 'Member events', 'Member sees upcoming events',
    'Upcoming event exists with show_in_history or status=upcoming',
    '1. Sign in as member\n2. Navigate to /events',
    'Upcoming event card with gold left border, date, location, register button', 'Super Admin + Member'),

  row('EVT', 'Member events', 'Member sees past events',
    'Event with status=ended and show_in_history=true',
    '1. Navigate to /events\n2. Scroll to past events',
    'Past event listed with date and attendance note if set', 'Super Admin + Member'),

  row('EVT', 'Member events', 'Archived events hidden from members',
    'Event with status=archived',
    '1. Navigate to /events',
    'Archived event not visible anywhere on member events page', 'Super Admin + Member'),
]

// ─── Build workbook ───────────────────────────────────────────────────────────

function makeSheet(rows) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: COLS })

  // Column widths
  ws['!cols'] = [
    { wch: 12 },  // Test ID
    { wch: 16 },  // Who's needed
    { wch: 18 },  // Tester
    { wch: 20 },  // Category
    { wch: 38 },  // Test Case
    { wch: 32 },  // Pre-conditions
    { wch: 48 },  // Steps
    { wch: 48 },  // Expected Behaviour
    { wch: 30 },  // Actual Behaviour
    { wch: 12 },  // Pass / Fail
    { wch: 24 },  // Notes
  ]

  return ws
}

const wb = XLSX.utils.book_new()

XLSX.utils.book_append_sheet(wb, makeSheet(parentPathARows), '1. Parent Registration Path A')
XLSX.utils.book_append_sheet(wb, makeSheet(inviteTokenRows), '2. Invite Tokens')
XLSX.utils.book_append_sheet(wb, makeSheet(adminEventsRows), '3. Events Management')

const outPath = path.join(__dirname, 'Zawaaj_Tests_SuperAdmin.xlsx')
XLSX.writeFile(wb, outPath)
console.log(`Written: ${outPath}`)
console.log(`Total test cases: ${parentPathARows.length + inviteTokenRows.length + adminEventsRows.length}`)
