/**
 * Zawaaj — Manager Test Cases
 * Run: node test-cases/generate-manager-tests.js
 * Outputs: test-cases/Zawaaj_Tests_Manager.xlsx
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

// ─── Sheet 1 — Manager Flow ───────────────────────────────────────────────────
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

XLSX.utils.book_append_sheet(wb, makeSheet(managerRows), '1. Manager Flow')

const outPath = path.join(__dirname, 'Zawaaj_Tests_Manager.xlsx')
XLSX.writeFile(wb, outPath)
console.log(`Written: ${outPath}`)
console.log(`Total test cases: ${managerRows.length}`)
