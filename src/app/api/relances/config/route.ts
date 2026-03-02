import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: config } = await supabase
      .from('relances_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({ success: true, config: config ?? null })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const { actif, delai_j1, delai_j2, delai_j3, ton, signature } = body

    const { data: config, error } = await supabase
      .from('relances_config')
      .upsert({
        user_id: user.id,
        actif: actif ?? false,
        delai_j1: delai_j1 ?? 7,
        delai_j2: delai_j2 ?? 15,
        delai_j3: delai_j3 ?? 30,
        ton: ton ?? 'cordial',
        signature: signature ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, config })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
