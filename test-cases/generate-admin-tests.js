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

function row(prefix, category, testCase, preconditions, steps, expected, who = 'Super Admin') {
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
    '1. Go to /register/parent\n2. Enter email\n3. Click Next',
    'Proceeds to step 1; no error'),

  row('PAR-A', 'Registration', 'Email already taken at step 0',
    'Email exists in auth.users',
    '1. Go to /register/parent\n2. Enter existing email\n3. Click Next',
    'Error: "An account with this email already exists." — cannot proceed'),

  row('PAR-A', 'Registration', 'Contact details step',
    'Valid email entered; on step 1',
    '1. Complete contact details: full name, relationship, phone, email\n2. Click Next',
    'All fields required; cannot proceed without completing them'),

  row('PAR-A', 'Registration', 'Male guardian triggers female contact step',
    'On step 1; selected Father or Male guardian as relationship',
    '1. Click Next after entering male guardian details',
    'Extra step appears asking for female family contact or reason for absence'),

  row('PAR-A', 'Registration', 'Form state preserved if user opens T&C mid-wizard',
    'In the middle of completing the wizard (e.g. step 2 filled in)',
    '1. Fill in steps 1–2 of the registration form\n2. Click the Terms of Use link (opens in a new tab)\n3. Close the T&C tab and return to the registration form',
    'All previously entered fields are still filled in — the form has not been cleared',
    'Super Admin + Member'),

  row('PAR-A', 'Registration', 'Terms & confirmation step',
    'On final step',
    '1. Check both consent boxes\n2. Click Create account',
    'Cannot submit without both boxes ticked'),

  row('PAR-A', 'Registration', 'Successful registration',
    'All steps complete; valid data',
    '1. Click Create account on final step',
    'Email verification screen shown; auth user created; family account created with status=active; profile created with status=pending'),

  row('PAR-A', 'Post-registration', 'Email verification screen after registration',
    'Just completed registration',
    '1. Review the screen shown after clicking Create account',
    'Envelope illustration shown; registered email address displayed; "Resend email" button available'),

  row('PAR-A', 'Post-registration', 'Profile not visible in browse before approval',
    'Profile status = pending',
    '1. Sign in as another approved member\n2. Browse member directory',
    'Newly registered profile not visible in browse',
    'Super Admin + Member'),

  row('PAR-A', 'Family account', 'Family account created and active after email verification',
    'Registration completed and email verified',
    '1. Sign in as super_admin\n2. Go to /admin/accounts\n3. Search by contact email',
    'Family account row exists with status = Active; no manual approval required'),

  row('PAR-A', 'Family account', 'Candidate profile visible under family account',
    'As super_admin; on /admin/accounts',
    '1. Search for the family\n2. Click the candidates count to expand the row',
    'Candidate profile shown with status = Pending Review; Approve and Reject buttons visible'),
]

// ─── Sheet 2 — Invite Tokens ──────────────────────────────────────────────────
counter = 1
const inviteTokenRows = [
  row('INV', 'Admin — generate token', 'Admin generates child_invite token',
    'Signed in as super_admin; on /admin/accounts or /admin/families',
    '1. Find a family account\n2. Click "Invite child"\n3. Copy generated URL',
    'Token created in zawaaj_invite_tokens with purpose=child_invite; URL displayed'),

  row('INV', 'Admin — generate token', 'Admin generates guardian_invite token',
    'Signed in as super_admin',
    '1. Find a family account\n2. Click "Invite guardian"\n3. Copy generated URL',
    'Token created with purpose=guardian_invite; URL displayed'),

  row('INV', 'Admin — email token', 'Admin emails invite token to candidate',
    'Token generated; candidate email on file',
    '1. After generating token URL\n2. Click "✉ Email invite to [email]"',
    'Email sent to candidate with registration link; "Email sent" confirmation shown'),

  row('INV', 'Token validation', 'Valid token accepted on /register/child page',
    'Valid unexpired token URL',
    '1. Open /register/child?token=<valid_token>',
    'Gold "Invited registration" badge shown; guardian step skipped; pre-filled fields visible',
    'Super Admin + Member'),

  row('INV', 'Token validation', 'Expired token shows error',
    'Token older than 7 days',
    '1. Open /register/child?token=<expired_token>',
    'Error screen: "This invitation has expired"; link to request new one',
    'Super Admin + Member'),

  row('INV', 'Token validation', 'Already-used token shows error',
    'Token previously used (accepted_at set)',
    '1. Open /register/child?token=<used_token>',
    'Error screen: "This invitation has already been used"',
    'Super Admin + Member'),

  row('INV', 'Token validation', 'Invalid/nonexistent token shows error',
    'Made-up token string',
    '1. Open /register/child?token=FAKEXXX',
    'Error screen: "Invalid invitation link"',
    'Self'),

  row('INV', 'Step skipping', 'Guardian step skipped when token present',
    'Valid token accepted',
    '1. Step through form with token\n2. Observe step count',
    'Guardian details step (step 4) not shown; effective total is one step fewer',
    'Super Admin + Member'),

  row('INV', 'Step skipping', 'Pre-filled guardian fields from token',
    'Token contains candidate name and email',
    '1. Open form with valid token',
    'Email field pre-filled from token; candidate name pre-filled if stored',
    'Super Admin + Member'),

  row('INV', 'Auto-linkage', 'Profile linked to existing family account on submit',
    'Valid token; completed all steps',
    '1. Complete registration with valid token\n2. Submit',
    'New profile created; family_account_id set to existing family account; no new family account created',
    'Super Admin + Member'),

  row('INV', 'Auto-linkage', 'Token marked as used after successful registration',
    'Valid token; registration completed',
    '1. Complete registration\n2. Try to use same token URL again',
    'Token accepted_at is now set; second attempt shows "already used" error',
    'Super Admin + Member'),

  row('INV', 'Auto-linkage', 'Admin can see linked profile under family account',
    'Registration completed via invite token',
    '1. Go to /admin/accounts\n2. Find the family account that issued the token\n3. Click candidates count to expand',
    'New candidate profile appears with status = Pending Review'),
]

// ─── Sheet 3 — Events Management ─────────────────────────────────────────────
counter = 1
const adminEventsRows = [
  row('EVT', 'Admin events', 'Admin can access /admin/events',
    'Signed in as super_admin',
    '1. Click "Events" in admin sidebar\n2. Or navigate to /admin/events',
    'Events management page loads with list of all events'),

  row('EVT', 'Admin events', 'Create a new upcoming event',
    'On /admin/events',
    '1. Click "+ New event"\n2. Enter title, date, location, registration URL\n3. Set status to Upcoming\n4. Click Create',
    'Event created; appears in list with Upcoming badge; visible to members on /events'),

  row('EVT', 'Admin events', 'Create event without registration URL',
    'On /admin/events; new event modal open',
    '1. Enter title and date\n2. Leave registration URL blank\n3. Create',
    'Event created; member-facing page shows "Registration details coming soon"'),

  row('EVT', 'Admin events', 'Edit an existing event',
    'Event exists in list',
    '1. Click Edit on an event\n2. Update location or status\n3. Save',
    'Changes saved; event card updated immediately in admin list'),

  row('EVT', 'Admin events', 'Mark event as Ended',
    'Upcoming event exists',
    '1. Edit event\n2. Change status to "Ended"\n3. Save',
    'Status badge changes to Ended; event no longer appears in members\' upcoming section'),

  row('EVT', 'Admin events', 'Enable show_in_history for past event',
    'Event with status = ended',
    '1. Edit event\n2. Check "Show in past events history"\n3. Save',
    'Event appears in "Past events" section on member-facing /events page'),

  row('EVT', 'Admin events', 'Add attendance note to past event',
    'Ended event',
    '1. Edit event\n2. Add attendance note (e.g. "47 attendees")\n3. Save',
    'Note displayed on past event card for members'),

  row('EVT', 'Admin events', 'Archive an event',
    'Any non-archived event',
    '1. Click Archive button\n2. Confirm prompt',
    'Event status → archived; disappears from member view; still visible in admin list with "Archived" filter'),

  row('EVT', 'Admin events', 'Filter events by status in admin',
    'Multiple events in different statuses',
    '1. Click Upcoming / Ended / Archived filter tabs',
    'List filters to show only matching events'),

  row('EVT', 'Member events', 'Member sees upcoming events',
    'Upcoming event exists',
    '1. Sign in as member\n2. Navigate to /events',
    'Upcoming event card with gold left border, date, location, register button',
    'Super Admin + Member'),

  row('EVT', 'Member events', 'Member sees past events',
    'Event with status=ended and show_in_history=true',
    '1. Navigate to /events\n2. Scroll to past events',
    'Past event listed with date and attendance note if set',
    'Super Admin + Member'),

  row('EVT', 'Member events', 'Archived events hidden from members',
    'Event with status=archived',
    '1. Navigate to /events',
    'Archived event not visible anywhere on member events page',
    'Super Admin + Member'),
]

// ─── Sheet 4 — Admin Accounts Management ──────────────────────────────────────
counter = 1
const adminAccountsRows = [
  row('ACC', 'Accounts page', 'Access /admin/accounts from sidebar',
    'Signed in as super_admin',
    '1. Click "Accounts" in the admin sidebar (under Dashboard section)',
    '/admin/accounts loads; table shows all family accounts with columns: Contact, Plan, Status, Candidates, Last Active, Registered'),

  row('ACC', 'Accounts page', 'Accounts not accessible to managers',
    'Signed in as manager',
    '1. Try to navigate to /admin/accounts',
    'Redirected away (403 or to /admin/introductions); Accounts not visible in sidebar',
    'Manager'),

  row('ACC', 'Status badges', 'Active account shows green "Active" badge',
    'Family account with status = active',
    '1. On /admin/accounts\n2. Locate an account that has verified their email',
    'Green "Active" badge in the Status column'),

  row('ACC', 'Status badges', 'Unverified account shows blue "Invited" badge',
    'Family account with status = pending_email_verification',
    '1. On /admin/accounts\n2. Locate a newly registered account that has not verified email yet',
    'Blue "Invited" badge in the Status column'),

  row('ACC', 'Status badges', 'Suspended account shows grey "Inactive" badge',
    'Family account with status = suspended',
    '1. On /admin/accounts\n2. Locate a suspended account',
    'Grey "Inactive" badge in the Status column'),

  row('ACC', 'Candidates', 'Expand candidates row',
    'Family account with at least one candidate profile',
    '1. On /admin/accounts\n2. Click the candidates count button on a family row',
    'Candidate sub-rows appear showing: initials avatar, name, gender, age, location, status badge, and action buttons'),

  row('ACC', 'Candidates', 'Pending badge on candidates button when review needed',
    'Family account has a candidate profile with status = pending',
    '1. On /admin/accounts\n2. Look at the candidates count button for that family',
    'An amber number badge appears on the button showing the count of pending-review profiles; those families start expanded automatically'),

  row('ACC', 'Candidates', 'Approve a pending candidate profile inline',
    'Candidate profile with status = Pending Review visible in expanded row',
    '1. Expand the family\'s candidate rows\n2. Click "Approve" next to the pending candidate',
    'Status badge changes to "Approved" immediately; Approve button replaced with Pause button'),

  row('ACC', 'Candidates', 'Reject a pending candidate profile inline',
    'Candidate profile with status = Pending Review',
    '1. Expand the family\'s candidate rows\n2. Click "Reject"',
    'Status badge changes to "Rejected"; Approve button appears for future reinstatement'),

  row('ACC', 'Candidates', 'Pause an approved candidate profile inline',
    'Candidate profile with status = Approved',
    '1. Expand the family\'s candidate rows\n2. Click "Pause"',
    'Status badge changes to "Paused"; profile disappears from member browse'),

  row('ACC', 'Candidates', 'Re-approve a paused or rejected profile inline',
    'Candidate profile with status = Paused or Rejected',
    '1. Expand the family\'s candidate rows\n2. Click "Approve"',
    'Status badge changes to "Approved"; profile reappears in member browse'),

  row('ACC', 'Candidates', 'View full profile from accounts page',
    'Candidate row visible in expanded accounts view',
    '1. Click "View" next to any candidate',
    'Navigates to /admin/profile/[id] — full admin profile view with all sensitive fields'),

  row('ACC', 'Last Active', 'Last active column shows relative time for signed-in users',
    'Family account where the guardian has signed in before',
    '1. On /admin/accounts\n2. Look at the Last Active column for an active account',
    'Relative time shown (e.g. "3d ago", "2h ago")'),

  row('ACC', 'Last Active', 'Last active shows dash for unverified accounts',
    'Family account that has never signed in (status = Invited)',
    '1. On /admin/accounts\n2. Look at Last Active column for an Invited account',
    'Dash (—) shown in Last Active column'),

  row('ACC', 'Delete account', 'Delete a family account with confirmation',
    'Family account exists on /admin/accounts',
    '1. Click the bin/delete icon on a family row\n2. Read the confirmation prompt\n3. Click OK',
    'Account disappears from the list; family account, linked profiles, and auth users all removed'),

  row('ACC', 'Delete account', 'Cancel delete shows no change',
    'Family account exists on /admin/accounts',
    '1. Click the bin/delete icon on a family row\n2. Click Cancel on the confirmation prompt',
    'Nothing changes; account remains in the list'),

  row('ACC', 'Search & filter', 'Search by contact name',
    'On /admin/accounts',
    '1. Type a guardian\'s name in the search box',
    'Only accounts with matching contact name appear; case-insensitive'),

  row('ACC', 'Search & filter', 'Search by email address',
    'On /admin/accounts',
    '1. Type part of an email address in the search box',
    'Only accounts with matching contact email appear'),

  row('ACC', 'Search & filter', 'Status tab counts are accurate',
    'On /admin/accounts with a mix of Active, Invited, and Inactive accounts',
    '1. Note the count shown in each tab label',
    'Active, Invited, and Inactive counts add up to the total shown in the All tab'),
]

// ─── Build workbook ───────────────────────────────────────────────────────────

function makeSheet(rows) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: COLS })

  ws['!cols'] = [
    { wch: 12 },  // Test ID
    { wch: 20 },  // Who's needed
    { wch: 18 },  // Tester
    { wch: 22 },  // Category
    { wch: 40 },  // Test Case
    { wch: 34 },  // Pre-conditions
    { wch: 50 },  // Steps
    { wch: 50 },  // Expected Behaviour
    { wch: 30 },  // Actual Behaviour
    { wch: 12 },  // Pass / Fail
    { wch: 24 },  // Notes
  ]

  return ws
}

const wb = XLSX.utils.book_new()

XLSX.utils.book_append_sheet(wb, makeSheet(parentPathARows),   '1. Parent Registration Path A')
XLSX.utils.book_append_sheet(wb, makeSheet(inviteTokenRows),   '2. Invite Tokens')
XLSX.utils.book_append_sheet(wb, makeSheet(adminEventsRows),   '3. Events Management')
XLSX.utils.book_append_sheet(wb, makeSheet(adminAccountsRows), '4. Admin Accounts')

const outPath = path.join(__dirname, 'Zawaaj_Tests_SuperAdmin.xlsx')
XLSX.writeFile(wb, outPath)
console.log(`Written: ${outPath}`)
console.log(`Total: ${parentPathARows.length + inviteTokenRows.length + adminEventsRows.length + adminAccountsRows.length} test cases`)
