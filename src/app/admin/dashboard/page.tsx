// /admin/dashboard — the metrics/overview landing.
//
// The SA sidebar's PLATFORM → "Dashboard" item links here. The existing /admin
// root page already renders the metrics overview (stat cards) alongside the
// inbox, so this route renders that same proven component rather than
// duplicating it. Role-gating (super-admin only via is_admin) lives inside the
// component.
export { default } from '../page'
