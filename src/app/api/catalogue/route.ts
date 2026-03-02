import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const includeInactif = searchParams.get('include_inactif') === 'true'

    let query = supabase
      .from('catalogue_produits')
      .select('*')
      .eq('user_id', user.id)
      .order('nom', { ascending: true })

    if (!includeInactif) query = query.eq('actif', true)
    if (search) query = query.or(`nom.ilike.%${search}%,reference.ilike.%${search}%`)

    const { data: produits, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, produits: produits ?? [] })
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
    const { nom, reference, description, prix_ht, tva_taux = 20, unite = 'unité', categorie } = body

    if (!nom?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    if (prix_ht === undefined || prix_ht === null) return NextResponse.json({ error: 'Prix HT requis' }, { status: 400 })

    const { data: produit, error } = await supabase
      .from('catalogue_produits')
      .insert({
        user_id: user.id,
        nom: nom.trim(),
        reference: reference?.trim() ?? null,
        description: description?.trim() ?? null,
        prix_ht: parseFloat(prix_ht),
        tva_taux: parseFloat(tva_taux),
        unite: unite ?? 'unité',
        categorie: categorie?.trim() ?? null,
        actif: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, produit }, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
