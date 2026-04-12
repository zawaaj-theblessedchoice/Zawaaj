import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('zawaaj_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) return null
  return user
}

// GET — list all promo codes
export async function GET(): Promise<Response> {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('zawaaj_promo_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ codes: data })
}

// POST — create a promo code
export async function POST(request: Request): Promise<Response> {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { code, description, discount_type, discount_value, applicable_plans, max_uses, valid_from, valid_until, is_active } = body

  if (!code || !discount_type || discount_value == null) {
    return NextResponse.json({ error: 'code, discount_type, and discount_value are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('zawaaj_promo_codes')
    .insert({
      code: code.toUpperCase(),
      description: description || null,
      discount_type,
      discount_value,
      applicable_plans: applicable_plans ?? ['plus', 'premium'],
      max_uses: max_uses ?? null,
      valid_from: valid_from ?? new Date().toISOString(),
      valid_until: valid_until ?? null,
      is_active: is_active ?? true,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A code with this name already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ code: data }, { status: 201 })
}

// PUT — update a promo code
export async function PUT(request: Request): Promise<Response> {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  // Only allow updating safe fields
  const allowed = [
    'code', 'description', 'discount_type', 'discount_value', 'applicable_plans',
    'max_uses', 'valid_from', 'valid_until', 'is_active',
  ]
  const sanitised: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in updates) sanitised[key] = updates[key]
  }
  if (sanitised.code) sanitised.code = (sanitised.code as string).toUpperCase()

  const { data, error } = await supabaseAdmin
    .from('zawaaj_promo_codes')
    .update(sanitised)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ code: data })
}
