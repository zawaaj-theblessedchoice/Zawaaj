// ─── Bank transfer: RETIRED from the user flow ──────────────────────────────
//
// Bank transfer required manual payment-reference reconciliation (admin capacity
// we don't have). GoCardless Direct Debit is now the sole payment path.
//
// The bank-transfer page + API route are KEPT in the repo (dormant, unlinked from
// the UI) so the flow is recoverable later. This flag additionally guards the
// route and page so a direct/bookmarked URL cannot reach them: the page redirects
// to /upgrade and the API returns 410 Gone while it is false.
//
// TO RE-ENABLE: set this to true (and re-add the UI entry points if desired).
export const BANK_TRANSFER_ENABLED = false
