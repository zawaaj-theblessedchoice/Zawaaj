/**
 * Zawaaj — Launch Squad Test Cases Generator
 * Run: node test-cases/generate-test-cases.js
 * Outputs: test-cases/Zawaaj_Test_Cases.xlsx
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

// ─── Sheet 1 — Member User Flow ───────────────────────────────────────────────
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

// ─── Sheet 2 — Manager Flow ───────────────────────────────────────────────────
counter = 1
const managerRows = [
  row('MGR', 'Login', 'Manager sign in',
    'Manager account exists with role = manager',
    '1. Go to /login\n2. Sign in with manager credentials',
    'Redirect to /admin/introductions (not full dashboard)', 'Manager'),

  row('MGR', 'Introductions', 'View introduction requests list',
    'Signed in as manager',
    '1. Navigate to /admin/introductions',
    'All introduction requests visible with filters for status', 'Manager'),

  row('MGR', 'Introductions', 'Filter introductions by status',
    'On admin introductions page',
    '1. Select "Pending" filter\n2. Then try "Accepted"',
    'Table updates to show only requests matching selected status', 'Manager'),

  row('MGR', 'Introductions', 'Search introduction requests',
    'On admin introductions page',
    '1. Type member name or initials in search',
    'Results filter in real-time', 'Manager'),

  row('MGR', 'Introductions', 'View introduction request detail',
    'On admin introductions page',
    '1. Click a request row',
    'Side panel opens with profile A and profile B details, request status, timestamps', 'Manager'),

  row('MGR', 'Introductions', 'Update introduction request status',
    'Accepted mutual request visible',
    '1. Open request detail\n2. Change status to "Facilitated"\n3. Save',
    'Status updated; both member profiles show "Contacts shared" badge', 'Manager'),

  row('MGR', 'Introductions', 'Record outcome on an introduction',
    'Facilitated request',
    '1. Open request detail\n2. Set outcome (e.g. "In conversation")\n3. Save',
    'Outcome recorded with timestamp; visible in admin view', 'Manager'),

  row('MGR', 'Profile', 'View any member profile (admin view)',
    'Signed in as manager',
    '1. Navigate to /admin/profile/[id]',
    'Full profile including sensitive fields (contact number, date of birth, admin notes)', 'Manager'),

  row('MGR', 'Profile', 'Approve a pending profile',
    'Profile with status = pending',
    '1. Open admin profile view\n2. Click Approve',
    'Profile status → approved; listed_at set; member appears in browse', 'Manager'),

  row('MGR', 'Profile', 'Reject a pending profile',
    'Profile with status = pending',
    '1. Open admin profile view\n2. Click Reject',
    'Profile status → rejected; member sees rejection on /pending', 'Manager'),

  row('MGR', 'Profile', 'Suspend an active profile',
    'Approved profile',
    '1. Open admin profile view\n2. Click Suspend',
    'Profile status → suspended; disappears from browse; member cannot access member pages', 'Manager'),

  row('MGR', 'Profile', 'Add admin notes to a profile',
    'On any admin profile view',
    '1. Click "Edit admin notes"\n2. Type notes\n3. Save',
    'Notes saved and visible only to admin/managers; not visible to member', 'Manager'),

  row('MGR', 'Email', 'Send admin message email to a family',
    'On admin families page',
    '1. Click "✉ Email family" next to a family\n2. Enter subject and message\n3. Send',
    'Email sent via Resend to family contact email; success confirmation shown', 'Manager'),
]

// ─── Sheet 3 — Parent Account Path A (direct registration) ───────────────────
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

// ─── Sheet 4 — Child Path B (direct self-registration) ────────────────────────
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

// ─── Sheet 5 — Invite Token Auto-Linkage ────────────────────────────────────
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

// ─── Sheet 6 — Admin Events CRUD ─────────────────────────────────────────────
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

// ─── Sheet 7 — GDPR & Privacy Rights ─────────────────────────────────────────
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

XLSX.utils.book_append_sheet(wb, makeSheet(memberRows),       '1. Member User Flow')
XLSX.utils.book_append_sheet(wb, makeSheet(managerRows),      '2. Manager Flow')
XLSX.utils.book_append_sheet(wb, makeSheet(parentPathARows),  '3. Parent Account Path A')
XLSX.utils.book_append_sheet(wb, makeSheet(childPathBRows),   '4. Child Path B (Direct)')
XLSX.utils.book_append_sheet(wb, makeSheet(inviteTokenRows),  '5. Invite Token Auto-Linkage')
XLSX.utils.book_append_sheet(wb, makeSheet(adminEventsRows),  '6. Admin Events CRUD')
XLSX.utils.book_append_sheet(wb, makeSheet(gdprRows),          '7. Privacy & Data Rights')

const outPath = path.join(__dirname, 'Zawaaj_Test_Cases.xlsx')
XLSX.writeFile(wb, outPath)
console.log(`✅  Written: ${outPath}`)
console.log(`    Total test cases: ${
  memberRows.length + managerRows.length + parentPathARows.length +
  childPathBRows.length + inviteTokenRows.length + adminEventsRows.length +
  gdprRows.length
}`)
