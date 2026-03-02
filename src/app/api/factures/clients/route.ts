import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateNumeroFacture } from '@/lib/factures/calculs'
import type { LigneFacture } from '@/types'

/**
 * GET /api/factures/clients
 * Liste les factures clients de l'utilisateur
 * Query params: statut, client_id, search
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const statut = searchParams.get('statut')
    const clientId = searchParams.get('client_id')
    const search = searchParams.get('search')

    let query = supabase
      .from('factures_clients')
      .select('*, client:clients(id, nom, email, adresse, siren)')
      .eq('user_id', user.id)
      .order('date_emission', { ascending: false })

    if (statut) query = query.eq('statut_paiement', statut)
    if (clientId) query = query.eq('client_id', clientId)
    if (search) {
      query = query.or(`numero_facture.ilike.%${search}%,objet.ilike.%${search}%`)
    }

    const { data: factures, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Erreur récupération factures: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, factures: factures ?? [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: 'Erreur serveur: ' + message }, { status: 500 })
  }
}

/**
 * POST /api/factures/clients
 * Créer une nouvelle facture client
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
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
    } = body

    if (!client_id) {
      return NextResponse.json({ error: 'client_id requis' }, { status: 400 })
    }
    if (!date_echeance) {
      return NextResponse.json({ error: 'date_echeance requise' }, { status: 400 })
    }

    // Génération numéro auto si non fourni
    const year = new Date(date_emission ?? new Date()).getFullYear()
    const { data: existingNums } = await supabase
      .from('factures_clients')
      .select('numero_facture')
      .eq('user_id', user.id)
      .ilike('numero_facture', `FAC-${year}-%`)

    const nums = (existingNums ?? []).map((r: { numero_facture: string }) => r.numero_facture)
    const numero_facture = generateNumeroFacture(nums, year)

    const { data: facture, error } = await supabase
      .from('factures_clients')
      .insert({
        user_id: user.id,
        client_id,
        numero_facture,
        objet: objet?.trim() ?? null,
        montant_ht: montant_ht ?? 0,
        tva: tva ?? 0,
        montant_ttc: montant_ttc ?? 0,
        date_emission: date_emission ?? new Date().toISOString().split('T')[0],
        date_echeance,
        statut_paiement: 'en_attente',
        montant_paye: 0,
        notes: notes?.trim() ?? null,
        lignes: (lignes as LigneFacture[]) ?? [],
        conditions_paiement: conditions_paiement ?? '30 jours',
        remise_percent: remise_percent ?? 0,
      })
      .select('*, client:clients(id, nom, email)')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Erreur création facture: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, facture }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: 'Erreur serveur: ' + message }, { status: 500 })
  }
}
