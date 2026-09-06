// ─── Complete a GoCardless redirect flow (server-only) ───────────────────────
//
// WHY THIS EXISTS (SDK bug workaround):
// gocardless-nodejs 8.2.0's `redirectFlows.complete()` builds the request body as
//   { "redirect_flows": { "session_token": "…" } }
// (its action services hardcode payloadKey = the resource name). GoCardless's
// action endpoint POST /redirect_flows/:id/actions/complete REQUIRES the params
// wrapped in a `data` envelope instead:
//   { "data": { "session_token": "…" } }
// so the SDK call fails every time with
//   400 invalid_document_structure — "Data sent to this endpoint must be wrapped
//   in a `data` envelope."
//
// We therefore complete the flow with a direct request that sends the correct
// `data` envelope, matching the SDK's auth + API-version headers exactly. All
// other calls (redirectFlows.create, subscriptions.create) use resource-keyed
// CREATE endpoints, which GoCardless accepts, so they keep using the SDK.

import { randomUUID } from 'node:crypto'

// Pinned to the same API version the SDK sends (gocardless-nodejs constants).
const GC_API_VERSION = '2015-07-06'

function gcApiBase(): string {
  return process.env.GOCARDLESS_ENVIRONMENT === 'live'
    ? 'https://api.gocardless.com'
    : 'https://api-sandbox.gocardless.com'
}

export interface CompletedRedirectFlow {
  id: string
  description?: string
  links?: {
    mandate?: string
    customer?: string
    customer_bank_account?: string
    [key: string]: string | undefined
  }
}

/**
 * Completes a redirect flow and returns the created mandate/customer links.
 * `sessionToken` MUST be the identical value passed when the flow was created.
 */
export async function completeRedirectFlow(
  redirectFlowId: string,
  sessionToken: string,
): Promise<CompletedRedirectFlow> {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN
  if (!token) throw new Error('GOCARDLESS_ACCESS_TOKEN is not set')

  const res = await fetch(
    `${gcApiBase()}/redirect_flows/${encodeURIComponent(redirectFlowId)}/actions/complete`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'GoCardless-Version': GC_API_VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Fresh key per attempt so a retry after a failure is never blocked.
        'Idempotency-Key': randomUUID(),
      },
      // The correct envelope — this is the whole point of the workaround.
      body: JSON.stringify({ data: { session_token: sessionToken } }),
    },
  )

  const json = (await res.json().catch(() => ({}))) as {
    redirect_flows?: CompletedRedirectFlow
    error?: { message?: string }
  }

  if (!res.ok) {
    throw new Error(json.error?.message ?? `GoCardless redirect-flow completion failed (${res.status})`)
  }
  if (!json.redirect_flows) {
    throw new Error('GoCardless returned an unexpected response for redirect-flow completion')
  }
  return json.redirect_flows
}
