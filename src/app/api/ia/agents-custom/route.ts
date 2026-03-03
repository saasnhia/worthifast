import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: agents, error } = await supabase
      .from('agents_ia_custom')
      .select('*, docs:agents_ia_custom_docs(id, nom, type)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, agents: agents ?? [] })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    if (!rateLimit(`agents-custom:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await req.json()
    const { nom, description, avatar_emoji, couleur, system_prompt, secteur_metier, sources, temperature } = body
    if (!nom?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    if (!system_prompt?.trim()) return NextResponse.json({ error: 'System prompt requis' }, { status: 400 })

    const { data: agent, error } = await supabase
      .from('agents_ia_custom')
      .insert({
        user_id: user.id,
        nom: nom.trim(),
        description: description?.trim() ?? null,
        avatar_emoji: avatar_emoji ?? '🤖',
        couleur: couleur ?? '#6366f1',
        system_prompt: system_prompt.trim(),
        secteur_metier: secteur_metier ?? null,
        sources: sources ?? ['pcg', 'bofip'],
        temperature: temperature ?? 0.3,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, agent }, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
