// ─── GoCardless client (server-only) ─────────────────────────────────────────
// Never import from client components.
//
// Lazily initialised on first use. The access token is required only when a
// GoCardless call is actually made at REQUEST time — not at module import. This
// keeps `next build` working without the token: the build evaluates route
// modules but never runs their handlers, so the client is never constructed and
// the token check never fires during the build.

import { GoCardlessClient, Environments } from 'gocardless-nodejs'

let client: GoCardlessClient | null = null

export function getGocardless(): GoCardlessClient {
  if (client) return client

  const token = process.env.GOCARDLESS_ACCESS_TOKEN
  if (!token) {
    throw new Error('GOCARDLESS_ACCESS_TOKEN is not set')
  }

  const environment =
    process.env.GOCARDLESS_ENVIRONMENT === 'live'
      ? Environments.Live
      : Environments.Sandbox

  client = new GoCardlessClient(token, environment)
  return client
}
