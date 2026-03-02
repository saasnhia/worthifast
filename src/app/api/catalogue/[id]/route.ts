import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const { nom, reference, description, prix_ht, tva_taux, unite, categorie, actif } = body

    const updates: Record<string, unknown> = {}
    if (nom !== undefined) updates.nom = nom.trim()
    if (reference !== undefined) updates.reference = reference?.trim() ?? null
    if (description !== undefined) updates.description = description?.trim() ?? null
    if (prix_ht !== undefined) updates.prix_ht = parseFloat(prix_ht)
    if (tva_taux !== undefined) updates.tva_taux = parseFloat(tva_taux)
    if (unite !== undefined) updates.unite = unite
    if (categorie !== undefined) updates.categorie = categorie?.trim() ?? null
    if (actif !== undefined) updates.actif = actif

    const { data: produit, error } = await supabase
      .from('catalogue_produits')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, produit })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Soft delete: désactiver
    const { error } = await supabase
      .from('catalogue_produits')
      .update({ actif: false })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
