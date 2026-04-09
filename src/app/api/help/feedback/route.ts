import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { article_slug, helpful } = await req.json()
  if (!article_slug || typeof helpful !== 'boolean') {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }
  await supabaseAdmin.from('help_feedback').insert({ article_slug, helpful })
  return NextResponse.json({ ok: true })
}
