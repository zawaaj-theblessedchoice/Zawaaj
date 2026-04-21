import { redirect } from 'next/navigation'

// /admin/accounts is superseded by /admin/families (full CRUD).
// Redirect permanently so any saved bookmarks or links still work.
export default function AccountsPage() {
  redirect('/admin/families')
}
