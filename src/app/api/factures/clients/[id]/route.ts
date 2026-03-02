import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { LigneFacture } from '@/types'

/**
 * GET /api/factures/clients/[id]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: facture, error } = await supabase
      .from('factures_clients')
      .select('*, client:clients(id, nom, email, telephone, adresse, siren)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !facture) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true, facture })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: 'Erreur serveur: ' + message }, { status: 500 })
  }
}

/**
 * PUT /api/factures/clients/[id]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Check exists + ownership
    const { data: existing } = await supabase
      .from('factures_clients')
      .select('id, statut_paiement')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }
    if (existing.statut_paiement === 'payee') {
      return NextResponse.json({ error: 'Impossible de modifier une facture payée' }, { status: 400 })
    }

    const body = await req.json()
    const {
      client_id,
      objet,
      montant_ht,
      tva,
      montant_ttc,
      date_emission,
      date_echeance,
      notes,
      lignes,
      conditions_paiement,
      remise_percent,
      statut_paiement,
    } = body

    const updates: Record<string, unknown> = {}
    if (client_id !== undefined) updates.client_id = client_id
    if (objet !== undefined) updates.objet = objet?.trim() ?? null
    if (montant_ht !== undefined) updates.montant_ht = montant_ht
    if (tva !== undefined) updates.tva = tva
    if (montant_ttc !== undefined) updates.montant_ttc = montant_ttc
    if (date_emission !== undefined) updates.date_emission = date_emission
    if (date_echeance !== undefined) updates.date_echeance = date_echeance
    if (notes !== undefined) updates.notes = notes?.trim() ?? null
    if (lignes !== undefined) updates.lignes = lignes as LigneFacture[]
    if (conditions_paiement !== undefined) updates.conditions_paiement = conditions_paiement
    if (remise_percent !== undefined) updates.remise_percent = remise_percent
    if (statut_paiement !== undefined) updates.statut_paiement = statut_paiement

    const { data: facture, error } = await supabase
      .from('factures_clients')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*, client:clients(id, nom, email)')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Erreur mise à jour: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, facture })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: 'Erreur serveur: ' + message }, { status: 500 })
  }
}

/**
 * DELETE /api/factures/clients/[id]
 * Soft delete si envoyée (statut→brouillon impossible → supprime), sinon delete
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: existing } = await supabase
      .from('factures_clients')
      .select('id, statut_paiement')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    // Hard delete
    const { error } = await supabase
      .from('factures_clients')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Erreur suppression: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: 'Erreur serveur: ' + message }, { status: 500 })
  }
}
