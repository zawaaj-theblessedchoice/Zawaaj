/**
 * Zawaaj — End User Test Cases
 * Run: node test-cases/generate-end-user-tests.js
 * Outputs: test-cases/Zawaaj_Tests_EndUser.xlsx
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

// ─── Sheet 1 — Member Login & Browse ─────────────────────────────────────────
counter = 1
const memberRows = [
  row('MEM', 'Login', 'Sign in with valid credentials',
    'Approved member account exists',
    '1. Go to zawaaj.uk/login\n2. Enter email and password\n3. Click Sign in',
    'Redirect to /browse; sidebar shows member name and avatar', 'Self'),

  row('MEM', 'Login', 'Sign in with wrong password',
    'Account exists',
    '1. Go to /login\n2. Enter correct email, wrong password\n3. Click Sign in',
    'Error message displayed; user remains on login page', 'Self'),

  row('MEM', 'Login', 'Forgot password — reset email flow',
    'Account exists',
    '1. Click "Forgot password"\n2. Enter email\n3. Click send\n4. Open email, click link\n5. Enter new password',
    'Password updated; redirected to /browse', 'Self'),

  row('MEM', 'Browse', 'View browse page — approved profiles only',
    'Signed in as approved member',
    '1. Navigate to /browse',
    'Grid of opposite-gender approved profiles shown; own profile not visible', 'Self'),

  row('MEM', 'Browse', 'Apply school of thought filter',
    'On /browse',
    '1. Open filter panel\n2. Select a school of thought\n3. Apply',
    'Grid refreshes; only profiles matching selection shown', 'Self'),

  row('MEM', 'Browse', 'Apply location filter',
    'On /browse',
    '1. Open filter panel\n2. Type/select a location\n3. Apply',
    'Grid refreshes showing only matching locations', 'Self'),

  row('MEM', 'Browse', 'New profile badge',
    'On /browse; a profile was approved recently',
    '1. Browse grid',
    '"New" gold badge visible on profiles listed within the last 7 days', 'Super Admin'),

  row('MEM', 'Browse', 'Search by initials / name',
    'On /browse',
    '1. Type initials into search box',
    'Grid filters in real-time to matching profiles', 'Self'),

  row('MEM', 'Profile view', 'Open profile modal from browse card',
    'On /browse',
    '1. Click a profile card',
    'Slide panel opens with full profile details; compatibility bar visible', 'Self'),

  row('MEM', 'Profile view', 'Full profile details locked for free tier',
    'Free plan account; viewing another profile',
    '1. Open profile modal',
    'Faith & values section blurred with "Upgrade to Premium" overlay', 'Self'),

  row('MEM', 'Profile view', 'Full profile visible for Premium',
    'Premium plan account',
    '1. Open profile modal',
    'Full faith details, bio, preferences all visible', 'Self'),

  row('MEM', 'Introductions', 'Express interest in a profile',
    'Approved member; monthly limit not reached; no existing request',
    '1. Open a profile modal\n2. Click "Express interest"\n3. Click Confirm',
    'Toast/confirmation shown; button changes to "Interest sent ✓"; count incremented', 'Super Admin + Member'),

  row('MEM', 'Introductions', 'Monthly limit enforced',
    'Member has used all monthly interest expressions',
    '1. Open a profile modal\n2. Attempt to express interest',
    'Button shows "Monthly limit reached"; cannot proceed; upgrade prompt shown for free users', 'Super Admin + Member'),

  row('MEM', 'Introductions', 'View sent introductions',
    'At least one request sent',
    '1. Navigate to /introductions',
    'List of sent requests with status badges (Pending / Accepted / Declined / Expired)', 'Self'),

  row('MEM', 'Introductions', 'View received introduction requests',
    'Member has received a pending request',
    '1. Navigate to /introductions\n2. Check "Received" tab',
    'Pending request card visible with Accept / Decline option (free) or template selection (Premium)', 'Super Admin + Member'),

  row('MEM', 'Introductions', 'Accept a received request',
    'Pending request in received tab',
    '1. Click Accept on a received request\n2. Confirm',
    'Status changes to Accepted; match created; in-app notification shown; both families receive email', 'Super Admin + Member'),

  row('MEM', 'Introductions', 'Decline a received request',
    'Pending request in received tab',
    '1. Click Decline\n2. Confirm',
    'Status changes to Declined; sensitive decline notification sent to sender; no email', 'Super Admin + Member'),

  row('MEM', 'Shortlist', 'Save a profile to shortlist',
    'Viewing a profile modal',
    '1. Click the heart icon on a profile',
    'Heart filled; profile appears in shortlist tab; count updated in sidebar', 'Self'),

  row('MEM', 'Shortlist', 'Remove from shortlist',
    'Profile is saved',
    '1. Click filled heart icon again',
    'Profile removed from shortlist; count decremented', 'Self'),

  row('MEM', 'My Profile', 'View own profile',
    'Signed in as approved member',
    '1. Navigate to /my-profile',
    'Own profile details displayed in read-only view', 'Self'),

  row('MEM', 'My Profile', 'Edit basic info',
    'On /my-profile',
    '1. Click Edit\n2. Update location or profession\n3. Save',
    'Changes saved; profile updated immediately', 'Self'),

  row('MEM', 'My Profile', 'Edit faith fields (female — niqab, abaya)',
    'Signed in as female member; on /my-profile',
    '1. Click Edit\n2. Select niqab and abaya options\n3. Save',
    'Values saved; displayed in faith section on own profile and profile view for Premium viewers', 'Self'),

  row('MEM', 'My Profile', 'Edit Quran engagement (all genders)',
    'On /my-profile',
    '1. Click Edit\n2. Select Quran engagement level\n3. Save',
    'Value saved and displayed in faith section', 'Self'),

  row('MEM', 'My Profile', 'Pause profile',
    'Approved member on /my-profile',
    '1. Click "Pause my profile"',
    'Confirmation prompt shown; on confirm: profile status → paused; no longer visible in browse', 'Self'),

  row('MEM', 'My Profile', 'Withdraw profile',
    'Approved member on /my-profile',
    '1. Click "Withdraw my profile"\n2. Select reason\n3. Confirm',
    'Profile withdrawn; member logged out or redirected to pending page', 'Self'),

  row('MEM', 'Events', 'View upcoming events',
    'Approved member',
    '1. Navigate to /events',
    'Upcoming events listed with date, location, registration link', 'Super Admin'),

  row('MEM', 'Events', 'Register for event via external link',
    'Upcoming event with registration URL',
    '1. Click "Register →" on event card',
    'External registration page opens in new tab', 'Super Admin'),

  row('MEM', 'Pending state', 'New signup — pending approval view',
    'Registered but admin has not approved yet',
    '1. Complete signup\n2. Check /pending page',
    'Clock icon shown with "Application submitted" message and sign-out link', 'Self'),

  row('MEM', 'Pending state', 'Email verification pending state',
    'Account created but email not verified',
    '1. Check /pending page',
    'Envelope icon shown; contact email displayed; "Resend verification" button available', 'Self'),
]

// ─── Sheet 2 — Registration (Self) ───────────────────────────────────────────
counter = 1
const childPathBRows = [
  row('CHD-B', 'Registration', 'Child navigates to /register/child',
    'No invite token; child wants to register independently',
    '1. Go to /register/child',
    'Multi-step form loads; no token banner; all steps including guardian step present', 'Self'),

  row('CHD-B', 'Registration', 'All steps present without invite token',
    'On /register/child with no ?token= param',
    '1. Step through form',
    '8 steps shown including Guardian contact details step (step 4)', 'Self'),

  row('CHD-B', 'Registration', 'Guardian/contact details required (Path B direct)',
    'On step 4 of child registration',
    '1. Leave guardian fields blank\n2. Try to proceed',
    'Validation error; cannot proceed without guardian contact info', 'Self'),

  row('CHD-B', 'Registration', 'Complete child registration — independent',
    'Valid email; no existing account',
    '1. Complete all 8 steps with guardian details\n2. Submit',
    'Auth user created; new family account created; profile created; redirect to /pending', 'Self'),

  row('CHD-B', 'Post-registration', 'Pending state after child direct registration',
    'Just completed child Path B registration',
    '1. Check /pending',
    '"Application submitted" message with clock icon; no email verification pending state', 'Self'),

  row('CHD-B', 'Family account', 'New family account created for independent child',
    'Completed Path B direct registration',
    '1. In admin /admin/families, search by contact email or name',
    'New family account exists with registration_path = child_direct', 'Super Admin'),
]

// ─── Sheet 3 — Privacy & Data Rights ─────────────────────────────────────────
counter = 1
const gdprRows = [
  row('GDPR', 'Cookie Notice', 'Cookie notice appears on first visit',
    'Fresh browser / cleared browser storage (or use private/incognito window)',
    '1. Open zawaaj.uk in a new private/incognito window\n2. Wait for the page to fully load',
    'A small notice bar appears at the bottom of the screen saying the site uses strictly necessary cookies only, with a "Got it" button and a link to the Privacy Policy', 'Self'),

  row('GDPR', 'Cookie Notice', 'Cookie notice disappears after clicking "Got it"',
    'Cookie notice is visible on screen',
    '1. Click the "Got it" button on the cookie notice',
    'The notice bar closes immediately and does not reappear when navigating to other pages', 'Self'),

  row('GDPR', 'Cookie Notice', 'Cookie notice does not reappear on return visit',
    'Already clicked "Got it" on this device/browser',
    '1. Close the browser tab\n2. Open zawaaj.uk again in the same browser (not incognito)',
    'The cookie notice does not appear — it stays dismissed', 'Self'),

  row('GDPR', 'Privacy Policy', 'Privacy Policy page is publicly accessible (no login needed)',
    'Not logged in',
    '1. Go to zawaaj.uk/privacy',
    'Full Privacy Policy page loads — no login required; page shows Ingenious Education Ltd as Data Controller and Zawaaj as Data Processor', 'Self'),

  row('GDPR', 'Privacy Policy', 'Privacy Policy link in cookie notice works',
    'Cookie notice visible on screen',
    '1. Click the "Privacy Policy" link in the cookie notice',
    'Navigates to /privacy — Privacy Policy page loads correctly', 'Self'),

  row('GDPR', 'Privacy Policy', 'Privacy link in sidebar works for logged-in members',
    'Signed in as an approved member',
    '1. Look at the left-hand sidebar\n2. Click "Privacy" (below Help centre)',
    'Navigates to /privacy — Privacy Policy page loads', 'Self'),

  row('GDPR', 'Terms & Conditions', 'GDPR clauses visible on Terms page',
    'None',
    '1. Go to zawaaj.uk/terms\n2. Scroll to clauses 11–14',
    'Four new sections visible: "Data Controller & Processor", "Your Data Protection Rights", "Cookies", and "Changes to These Terms"', 'Self'),

  row('GDPR', 'Terms & Conditions', 'Privacy Policy link at bottom of Terms page works',
    'On /terms page',
    '1. Scroll to the very bottom of the Terms page\n2. Click "Privacy Policy →"',
    'Navigates to /privacy — Privacy Policy loads', 'Self'),

  row('GDPR', 'Settings — Privacy tab', 'Privacy tab visible in account settings',
    'Signed in as an approved member',
    '1. Click "Settings" in the left-hand sidebar\n2. Click the "Privacy" tab at the top of the page',
    'Privacy tab content loads showing: data protection summary, "Download a copy of my data" section, "Delete my account" section, and links to Privacy Policy and Terms', 'Self'),

  row('GDPR', 'Settings — Privacy tab', 'Member can request a copy of their data from Settings',
    'Signed in; on Settings → Privacy tab; no export request submitted in the last 30 days',
    '1. Go to Settings → Privacy tab\n2. Click "Send me a copy of my data"',
    'Button shows "Sending…" briefly; then a green success message appears: "Done — a copy of your data has been sent to your registered email address." An email arrives with the data attached.', 'Self'),

  row('GDPR', 'Settings — Privacy tab', 'Second export request within 30 days is blocked',
    'Already requested a data copy within the last 30 days',
    '1. Go to Settings → Privacy tab\n2. Click "Send me a copy of my data" again',
    'An error message appears explaining that only one data export is allowed every 30 days', 'Self'),

  row('GDPR', 'Settings — Privacy tab', 'Delete account button appears in Settings',
    'Signed in; on Settings → Privacy tab',
    '1. Go to Settings → Privacy tab\n2. Scroll to "Delete my account" section',
    '"Delete my account" button visible with a brief explanation of the 7-day waiting period', 'Self'),

  row('GDPR', 'Delete My Account', 'Delete account requires ticking confirmation box and typing a phrase',
    'Signed in; on Settings → Privacy tab; "Delete my account" section visible',
    '1. Click "Delete my account"\n2. Leave the confirmation box unticked and the text box empty\n3. Try to click "Request account deletion"',
    'The "Request account deletion" button is greyed out and cannot be clicked — both the tick box and the exact phrase must be completed first', 'Self'),

  row('GDPR', 'Delete My Account', 'Delete account submitted successfully',
    'Signed in; on Settings → Privacy tab; "Delete my account" section visible',
    '1. Click "Delete my account"\n2. Tick the confirmation box\n3. Type DELETE MY ACCOUNT in the text box exactly as shown\n4. Click "Request account deletion"',
    'Red confirmation message shown: "Deletion request submitted — your profile has been removed from the directory. Account will be permanently deleted in 7 days." A cancellation email is sent to the registered address.', 'Self'),

  row('GDPR', 'Delete My Account', 'Cancel button during deletion flow works',
    'Clicked "Delete my account" and confirmation form is showing',
    '1. Click "Delete my account" to open the form\n2. Click "Cancel"',
    'Form closes; returns to the normal privacy tab view; nothing is deleted', 'Self'),

  row('GDPR', 'Delete My Account', 'Member can cancel their deletion request via email link',
    'Deletion request submitted; cancellation email received in inbox',
    '1. Open the cancellation email\n2. Click the cancellation link in the email',
    'A webpage opens confirming the deletion has been cancelled; the account is restored to a paused state (profile is not in the directory but the account is still active)', 'Self'),

  row('GDPR', 'Correct My Data', 'Member can submit a correction request via the data rights portal',
    'Signed in; fewer than 3 pending correction requests already open',
    '1. Go to zawaaj.uk/privacy/rights\n2. Click the "Correct my data" tab\n3. Select the field to correct (e.g. Location)\n4. Enter the correct value\n5. Add a short explanation\n6. Click Submit',
    'Success message shown — request has been submitted; visible in the Request History tab with status "Pending"; admin will review and make the correction', 'Self'),

  row('GDPR', 'Correct My Data', 'Cannot have more than 3 open correction requests at once',
    'Already have 3 correction requests with status "Pending"',
    '1. Go to zawaaj.uk/privacy/rights → "Correct my data" tab\n2. Try to submit another correction',
    'Error message shown — cannot submit more than 3 correction requests at a time; advised to wait for existing requests to be resolved first', 'Self'),

  row('GDPR', 'Data Rights History', 'Request history accessible at /privacy/rights',
    'Signed in; at least one data request has been submitted',
    '1. Go to zawaaj.uk/privacy/rights\n2. Click "Request history" tab',
    'All past data requests listed with type (e.g. Data export, Correction, Deletion), date submitted, and current status', 'Self'),

  row('GDPR', 'Data Rights History', 'Empty history shows a friendly message',
    'Signed in; no data requests have ever been submitted',
    '1. Go to zawaaj.uk/privacy/rights\n2. Click "Request history" tab',
    'A message is shown such as "No requests yet" — no blank or broken table', 'Self'),
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

XLSX.utils.book_append_sheet(wb, makeSheet(memberRows),    '1. Member Login & Browse')
XLSX.utils.book_append_sheet(wb, makeSheet(childPathBRows), '2. Registration (Self)')
XLSX.utils.book_append_sheet(wb, makeSheet(gdprRows),       '3. Privacy & Data Rights')

const outPath = path.join(__dirname, 'Zawaaj_Tests_EndUser.xlsx')
XLSX.writeFile(wb, outPath)
console.log(`Written: ${outPath}`)
console.log(`Total test cases: ${memberRows.length + childPathBRows.length + gdprRows.length}`)
