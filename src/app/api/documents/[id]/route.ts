import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculTotaux } from '@/lib/factures/calculs'
import type { LigneFacture } from '@/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const [docRes, histRes] = await Promise.all([
      supabase
        .from('documents_commerciaux')
        .select('*, client:clients(id, nom, email, adresse, siren)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('historique_documents')
        .select('*')
        .eq('document_id', id)
        .order('created_at', { ascending: false }),
    ])

    if (docRes.error || !docRes.data) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

    return NextResponse.json({ success: true, document: docRes.data, historique: histRes.data ?? [] })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: existing } = await supabase
      .from('documents_commerciaux')
      .select('statut')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    if (existing.statut === 'annule') return NextResponse.json({ error: 'Document annulé, modification impossible' }, { status: 400 })

    const body = await req.json()
    const { lignes, remise_percent, acompte, ...rest } = body

    const updates: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() }

    if (lignes !== undefined) {
      const totaux = calculTotaux(lignes as LigneFacture[], remise_percent ?? 0, acompte ?? 0)
      updates.lignes = lignes
      updates.remise_percent = remise_percent ?? 0
      updates.acompte = acompte ?? 0
      updates.sous_total_ht = totaux.totalHT
      updates.total_ht = totaux.totalHTApresRemise
      updates.total_tva = totaux.totalTVA
      updates.total_ttc = totaux.totalTTC
    }

    const { data: document, error } = await supabase
      .from('documents_commerciaux')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    void (async () => {
      try {
        await supabase.from('historique_documents').insert({
          document_id: id, user_id: user.id, action: 'modification',
          details: { champs_modifies: Object.keys(body) },
        })
      } catch { /* non-critical */ }
    })()

    return NextResponse.json({ success: true, document })
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

    // Soft delete: statut → annule
    const { error } = await supabase
      .from('documents_commerciaux')
      .update({ statut: 'annule', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    void (async () => {
      try {
        await supabase.from('historique_documents').insert({
          document_id: id, user_id: user.id, action: 'annulation', details: {},
        })
      } catch { /* non-critical */ }
    })()

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
