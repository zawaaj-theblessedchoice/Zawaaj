// ─── GoCardless client (server-only) ─────────────────────────────────────────
// Never import from client components.

import { GoCardlessClient, Environments } from 'gocardless-nodejs'

if (!process.env.GOCARDLESS_ACCESS_TOKEN) {
  throw new Error('GOCARDLESS_ACCESS_TOKEN is not set')
}

const environment =
  process.env.GOCARDLESS_ENVIRONMENT === 'live'
    ? Environments.Live
    : Environments.Sandbox

export const gocardless = new GoCardlessClient(
  process.env.GOCARDLESS_ACCESS_TOKEN,
  environment,
)
