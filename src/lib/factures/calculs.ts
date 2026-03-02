import type { LigneFacture, TotauxFacture } from '@/types'

export function calculLigneHT(quantite: number, prixUnitaire: number): number {
  return Math.round(quantite * prixUnitaire * 100) / 100
}

export function calculTVAParTaux(lignes: LigneFacture[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const ligne of lignes) {
    const ht = calculLigneHT(ligne.quantite, ligne.prix_unitaire_ht)
    const tva = Math.round(ht * (ligne.taux_tva / 100) * 100) / 100
    const key = String(ligne.taux_tva)
    result[key] = Math.round(((result[key] ?? 0) + tva) * 100) / 100
  }
  return result
}

export function calculTotaux(
  lignes: LigneFacture[],
  remisePct: number,
  acompte?: number
): TotauxFacture {
  const totalHT = lignes.reduce(
    (sum, l) => sum + calculLigneHT(l.quantite, l.prix_unitaire_ht),
    0
  )

  const remiseAmount = Math.round(totalHT * (remisePct / 100) * 100) / 100
  const totalHTApresRemise = Math.round((totalHT - remiseAmount) * 100) / 100

  // TVA calculée sur HT après remise (proportionnelle)
  const facteurRemise = totalHT > 0 ? totalHTApresRemise / totalHT : 1
  const tvaParTaux: Record<string, number> = {}
  for (const ligne of lignes) {
    const ht = calculLigneHT(ligne.quantite, ligne.prix_unitaire_ht)
    const htApresRemise = Math.round(ht * facteurRemise * 100) / 100
    const tva = Math.round(htApresRemise * (ligne.taux_tva / 100) * 100) / 100
    const key = String(ligne.taux_tva)
    tvaParTaux[key] = Math.round(((tvaParTaux[key] ?? 0) + tva) * 100) / 100
  }

  const totalTVA = Object.values(tvaParTaux).reduce((s, v) => s + v, 0)
  const totalTTC = Math.round((totalHTApresRemise + totalTVA) * 100) / 100
  const resteADuTTC = Math.round((totalTTC - (acompte ?? 0)) * 100) / 100

  return {
    totalHT,
    remiseAmount,
    totalHTApresRemise,
    tvaParTaux,
    totalTVA,
    totalTTC,
    resteADuTTC,
  }
}

export function generateNumeroFacture(existingNums: string[], year: number): string {
  const prefix = `FAC-${year}-`
  const usedIndexes = existingNums
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n))

  let next = 1
  if (usedIndexes.length > 0) {
    next = Math.max(...usedIndexes) + 1
  }
  return `${prefix}${String(next).padStart(3, '0')}`
}
