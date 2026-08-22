// ─── GoCardless plan/price config ────────────────────────────────────────────
// Prices in pence (GBP). Keep in sync with PLAN_PRICES in plan-config.ts.

export const GC_PRICES = {
  premium: {
    monthly: {
      amount: 1000,                    // £10.00
      currency: 'GBP' as const,
      interval_unit: 'monthly' as const,
      interval: 1,
      name: 'Zawaaj Premium — Monthly',
    },
    annual: {
      amount: 9600,                    // £96.00
      currency: 'GBP' as const,
      interval_unit: 'yearly' as const,
      interval: 1,
      name: 'Zawaaj Premium — Annual',
    },
  },
}

// Feature flag — read on server and client (NEXT_PUBLIC_ prefix)
export const GC_ENABLED =
  process.env.NEXT_PUBLIC_GOCARDLESS_ENABLED?.toLowerCase() === 'true'
