import type { SupabaseClient } from '@supabase/supabase-js'
import type { DocumentCommercial } from '@/types'
import { generateNumeroDoc } from './numerotation'

/**
 * Log une action dans historique_documents
 */
async function logAction(
  supabase: SupabaseClient,
  documentId: string,
  userId: string,
  action: string,
  details: Record<string, unknown>
) {
  await supabase.from('historique_documents').insert({
    document_id: documentId,
    user_id: userId,
    action,
    details,
  })
}

/**
 * Copie les champs partagés d'un document source vers un nouveau document
 */
function buildDocBase(source: DocumentCommercial) {
  return {
    client_id: source.client_id,
    client_nom: source.client_nom,
    client_email: source.client_email,
    client_adresse: source.client_adresse,
    client_siren: source.client_siren,
    lignes: source.lignes,
    sous_total_ht: source.sous_total_ht,
    remise_percent: source.remise_percent,
    total_ht: source.total_ht,
    total_tva: source.total_tva,
    total_ttc: source.total_ttc,
    acompte: source.acompte,
    conditions_paiement: source.conditions_paiement,
    notes: source.notes,
    date_emission: new Date().toISOString().split('T')[0],
  }
}

/**
 * Devis → Facture commerciale
 */
export async function devisToFacture(
  devisId: string,
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; document?: DocumentCommercial; error?: string }> {
  const { data: devis, error: fetchErr } = await supabase
    .from('documents_commerciaux')
    .select('*')
    .eq('id', devisId)
    .eq('user_id', userId)
    .single()

  if (fetchErr || !devis) return { success: false, error: 'Devis introuvable' }

  const numero = await generateNumeroDoc('facture_recurrente', supabase, userId)

  const { data: newDoc, error } = await supabase
    .from('documents_commerciaux')
    .insert({
      user_id: userId,
      type: 'facture_recurrente',
      numero,
      statut: 'brouillon',
      devis_lie_id: devisId,
      ...buildDocBase(devis as DocumentCommercial),
    })
    .select()
    .single()

  if (error || !newDoc) return { success: false, error: error?.message ?? 'Erreur création' }

  // Marquer le devis comme validé
  await supabase.from('documents_commerciaux').update({ statut: 'valide' }).eq('id', devisId)

  await logAction(supabase, newDoc.id, userId, 'conversion', {
    source_id: devisId,
    source_type: 'devis',
    vers: 'facture_recurrente',
  })

  return { success: true, document: newDoc as DocumentCommercial }
}

/**
 * Devis → Bon de commande
 */
export async function devisToCommande(
  devisId: string,
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; document?: DocumentCommercial; error?: string }> {
  const { data: devis, error: fetchErr } = await supabase
    .from('documents_commerciaux')
    .select('*')
    .eq('id', devisId)
    .eq('user_id', userId)
    .single()

  if (fetchErr || !devis) return { success: false, error: 'Devis introuvable' }

  const numero = await generateNumeroDoc('bon_commande', supabase, userId)

  const { data: newDoc, error } = await supabase
    .from('documents_commerciaux')
    .insert({
      user_id: userId,
      type: 'bon_commande',
      numero,
      statut: 'brouillon',
      devis_lie_id: devisId,
      ...buildDocBase(devis as DocumentCommercial),
    })
    .select()
    .single()

  if (error || !newDoc) return { success: false, error: error?.message ?? 'Erreur création' }

  await supabase.from('documents_commerciaux').update({ statut: 'accepte' }).eq('id', devisId)

  await logAction(supabase, newDoc.id, userId, 'conversion', {
    source_id: devisId,
    source_type: 'devis',
    vers: 'bon_commande',
  })

  return { success: true, document: newDoc as DocumentCommercial }
}

/**
 * Bon de commande → Bon de livraison
 */
export async function commandeToLivraison(
  commandeId: string,
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; document?: DocumentCommercial; error?: string }> {
  const { data: commande, error: fetchErr } = await supabase
    .from('documents_commerciaux')
    .select('*')
    .eq('id', commandeId)
    .eq('user_id', userId)
    .single()

  if (fetchErr || !commande) return { success: false, error: 'Bon de commande introuvable' }

  const numero = await generateNumeroDoc('bon_livraison', supabase, userId)

  const { data: newDoc, error } = await supabase
    .from('documents_commerciaux')
    .insert({
      user_id: userId,
      type: 'bon_livraison',
      numero,
      statut: 'brouillon',
      devis_lie_id: (commande as DocumentCommercial).devis_lie_id,
      ...buildDocBase(commande as DocumentCommercial),
      date_livraison: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error || !newDoc) return { success: false, error: error?.message ?? 'Erreur création' }

  await logAction(supabase, newDoc.id, userId, 'conversion', {
    source_id: commandeId,
    source_type: 'bon_commande',
    vers: 'bon_livraison',
  })

  return { success: true, document: newDoc as DocumentCommercial }
}

/**
 * Facture → Avoir (total ou partiel)
 * Si montant fourni : ligne unique "Avoir partiel"
 * Sinon : toutes les lignes en négatif
 */
export async function factureToAvoir(
  factureId: string,
  supabase: SupabaseClient,
  userId: string,
  montant?: number
): Promise<{ success: boolean; document?: DocumentCommercial; error?: string }> {
  const { data: facture, error: fetchErr } = await supabase
    .from('documents_commerciaux')
    .select('*')
    .eq('id', factureId)
    .eq('user_id', userId)
    .single()

  if (fetchErr || !facture) return { success: false, error: 'Facture introuvable' }

  const src = facture as DocumentCommercial
  const numero = await generateNumeroDoc('avoir', supabase, userId)

  let lignes = src.lignes
  let total_ht = -src.total_ht
  let total_tva = -src.total_tva
  let total_ttc = -src.total_ttc

  if (montant !== undefined && montant > 0) {
    // Avoir partiel — une seule ligne
    lignes = [{
      description: `Avoir partiel sur ${src.numero ?? 'facture'}`,
      quantite: 1,
      prix_unitaire_ht: -montant,
      taux_tva: 20,
    }]
    total_ht = -montant
    total_tva = -(montant * 0.2)
    total_ttc = -(montant * 1.2)
  } else {
    // Avoir total — inverser les lignes
    lignes = src.lignes.map(l => ({ ...l, prix_unitaire_ht: -Math.abs(l.prix_unitaire_ht) }))
  }

  const { data: newDoc, error } = await supabase
    .from('documents_commerciaux')
    .insert({
      user_id: userId,
      type: 'avoir',
      numero,
      statut: 'brouillon',
      facture_liee_id: factureId,
      client_id: src.client_id,
      client_nom: src.client_nom,
      client_email: src.client_email,
      client_adresse: src.client_adresse,
      client_siren: src.client_siren,
      lignes,
      sous_total_ht: total_ht,
      remise_percent: 0,
      total_ht,
      total_tva,
      total_ttc,
      acompte: 0,
      conditions_paiement: src.conditions_paiement,
      date_emission: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error || !newDoc) return { success: false, error: error?.message ?? 'Erreur création' }

  await logAction(supabase, newDoc.id, userId, 'conversion', {
    source_id: factureId,
    source_type: 'facture',
    vers: 'avoir',
    montant_partiel: montant ?? null,
  })

  return { success: true, document: newDoc as DocumentCommercial }
}
