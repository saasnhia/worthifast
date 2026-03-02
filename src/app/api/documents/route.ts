import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateNumeroDoc } from '@/lib/documents/numerotation'
import { calculTotaux } from '@/lib/factures/calculs'
import type { DocumentType, LigneFacture } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const statut = searchParams.get('statut')
    const clientId = searchParams.get('client_id')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') ?? '100', 10)

    let query = supabase
      .from('documents_commerciaux')
      .select('*, client:clients(id, nom, email)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) query = query.eq('type', type)
    if (statut) query = query.eq('statut', statut)
    if (clientId) query = query.eq('client_id', clientId)
    if (search) query = query.or(`client_nom.ilike.%${search}%,numero.ilike.%${search}%`)

    const { data: documents, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, documents: documents ?? [] })
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
    const {
      type,
      statut = 'brouillon',
      client_id,
      client_nom,
      client_email,
      client_adresse,
      client_siren,
      lignes = [],
      remise_percent = 0,
      acompte = 0,
      conditions_paiement,
      notes,
      validite_jours,
      date_emission,
      date_echeance,
      date_livraison,
    } = body

    if (!type) return NextResponse.json({ error: 'type requis' }, { status: 400 })

    const numero = await generateNumeroDoc(type as DocumentType, supabase, user.id)

    const totaux = calculTotaux(lignes as LigneFacture[], remise_percent ?? 0, acompte ?? 0)

    const { data: document, error } = await supabase
      .from('documents_commerciaux')
      .insert({
        user_id: user.id,
        type,
        numero,
        statut,
        client_id: client_id ?? null,
        client_nom: client_nom ?? null,
        client_email: client_email ?? null,
        client_adresse: client_adresse ?? null,
        client_siren: client_siren ?? null,
        lignes,
        sous_total_ht: totaux.totalHT,
        remise_percent: remise_percent ?? 0,
        total_ht: totaux.totalHTApresRemise,
        total_tva: totaux.totalTVA,
        total_ttc: totaux.totalTTC,
        acompte: acompte ?? 0,
        conditions_paiement: conditions_paiement ?? '30 jours',
        notes: notes ?? null,
        validite_jours: validite_jours ?? 30,
        date_emission: date_emission ?? new Date().toISOString().split('T')[0],
        date_echeance: date_echeance ?? null,
        date_livraison: date_livraison ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Log création
    void (async () => {
      try {
        await supabase.from('historique_documents').insert({
          document_id: document.id,
          user_id: user.id,
          action: 'creation',
          details: { type, numero },
        })
      } catch { /* non-critical */ }
    })()

    return NextResponse.json({ success: true, document }, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
