import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/promo-codes/validate
 * Body: { code: string, plan: string }
 * Returns: { valid: boolean, discount_type?, discount_value?, message? }
 *
 * Returns the discount info if valid, or an error message if not.
 * Does NOT redeem — call /api/promo-codes/redeem to apply.
 */
export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ valid: false, message: 'Please sign in first.' }, { status: 401 })

  const body = await request.json() as { code?: string; plan?: string }
  const code = (body.code ?? '').trim().toUpperCase()
  const plan = body.plan ?? ''

  if (!code) return NextResponse.json({ valid: false, message: 'No code entered.' })

  const { data: promoCode } = await supabase
    .from('zawaaj_promo_codes')
    .select('id, code, discount_type, discount_value, applicable_plans, max_uses, uses_count, valid_until')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle()

  if (!promoCode) {
    return NextResponse.json({ valid: false, message: 'Code not found or no longer active.' })
  }

  // Check plan applicability
  if (plan && !promoCode.applicable_plans.includes(plan)) {
    return NextResponse.json({
      valid: false,
      message: `This code only applies to: ${promoCode.applicable_plans.join(', ')}.`,
    })
  }

  // Check usage limit
  if (promoCode.max_uses != null && promoCode.uses_count >= promoCode.max_uses) {
    return NextResponse.json({ valid: false, message: 'This code has reached its usage limit.' })
  }

  return NextResponse.json({
    valid: true,
    discount_type: promoCode.discount_type,
    discount_value: promoCode.discount_value,
    promo_code_id: promoCode.id,
  })
}
