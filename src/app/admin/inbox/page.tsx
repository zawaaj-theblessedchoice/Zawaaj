import { redirect } from 'next/navigation'

// /admin/inbox — legacy work-queue route.
//
// "Inbox" and the OperationsConsole were the same concept (the actionable
// approve/reject work queue). The sidebar now links WORK → "Operations"
// (/admin/operations) and this route used to re-render the /admin dashboard,
// making two nav items show identical content. It now redirects to the real
// work console so the old URL still resolves (no 404) without duplicating it.
export default function AdminInboxRedirect() {
  redirect('/admin/operations')
}
