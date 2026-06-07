// /admin/inbox — the admin work-queue landing.
//
// The SA sidebar's WORK → "Inbox" item links here. The existing /admin root
// page already IS the inbox + dashboard hybrid (stat cards + work-queue items),
// so this route renders that same proven component rather than duplicating it.
// Role-gating (super-admin only via is_admin) lives inside the component.
export { default } from '../page'
