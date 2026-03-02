import type { SupabaseClient } from '@supabase/supabase-js'
import type { DocumentType } from '@/types'

const PREFIXES: Record<DocumentType, string> = {
  devis: 'DEV',
  bon_commande: 'BC',
  bon_livraison: 'BL',
  proforma: 'PF',
  avoir: 'AV',
  facture_recurrente: 'FACT-R',
}

/**
 * Génère un numéro de document unique (ex: DEV-2026-001)
 * Similaire à generateNumeroFacture() mais pour tous les types commerciaux
 */
export async function generateNumeroDoc(
  type: DocumentType,
  supabase: SupabaseClient,
  userId: string,
  year?: number
): Promise<string> {
  const currentYear = year ?? new Date().getFullYear()
  const prefix = PREFIXES[type]
  const pattern = `${prefix}-${currentYear}-%`

  const { data: existing } = await supabase
    .from('documents_commerciaux')
    .select('numero')
    .eq('user_id', userId)
    .ilike('numero', pattern)

  const existingNums = (existing ?? [])
    .map((r: { numero: string | null }) => r.numero ?? '')
    .filter(Boolean)

  // Trouver le plus grand numéro séquentiel
  let maxSeq = 0
  for (const num of existingNums) {
    const parts = num.split('-')
    const seq = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq
  }

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0')
  return `${prefix}-${currentYear}-${nextSeq}`
}
