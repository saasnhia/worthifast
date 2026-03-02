import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: abonnements, error } = await supabase
      .from('abonnements_recurrents')
      .select('*, client:clients(id, nom, email)')
      .eq('user_id', user.id)
      .order('prochaine_facturation', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, abonnements: abonnements ?? [] })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const { nom, client_id, client_nom, client_email, lignes = [], frequence = 'mensuel', prochaine_facturation } = body

    if (!nom?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

    const { data: abonnement, error } = await supabase
      .from('abonnements_recurrents')
      .insert({
        user_id: user.id,
        nom: nom.trim(),
        client_id: client_id ?? null,
        client_nom: client_nom ?? null,
        client_email: client_email ?? null,
        lignes,
        frequence,
        prochaine_facturation: prochaine_facturation ?? new Date().toISOString().split('T')[0],
        actif: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, abonnement }, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
