import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ImportType = 'encaissement' | 'vente_ecommerce' | 'caisse' | 'paie' | 'tiers'

function detectType(filename: string, headers: string[]): ImportType {
  const fn = filename.toLowerCase()
  if (fn.includes('encaissement') || fn.includes('receipt')) return 'encaissement'
  if (fn.includes('vente') || fn.includes('ecommerce') || fn.includes('shopify') || fn.includes('woocommerce')) return 'vente_ecommerce'
  if (fn.includes('caisse') || fn.includes('cash')) return 'caisse'
  if (fn.includes('paie') || fn.includes('salaire') || fn.includes('salary')) return 'paie'
  // Header-based detection
  const headerStr = headers.join(',').toLowerCase()
  if (headerStr.includes('salaire') || headerStr.includes('brut') || headerStr.includes('net_a_payer')) return 'paie'
  if (headerStr.includes('commande') || headerStr.includes('order')) return 'vente_ecommerce'
  return 'tiers'
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [] }

  // Détecte le séparateur (virgule ou point-virgule)
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.replace(/^["']|["']$/g, '').trim())

  const rows = lines.slice(1).map(line => {
    const values = line.split(sep).map(v => v.replace(/^["']|["']$/g, '').trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })

  return { headers, rows }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const forceType = formData.get('type') as ImportType | null

    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })

    const text = await file.text()
    const { headers, rows } = parseCSV(text)
    const detectedType: ImportType = forceType ?? detectType(file.name, headers)

    // Log l'import
    const { data: importLog, error: logError } = await supabase
      .from('imports_ecritures')
      .insert({
        user_id: user.id,
        type: detectedType,
        fichier_nom: file.name,
        nb_lignes: rows.length,
        statut: 'en_cours',
      })
      .select()
      .single()

    if (logError) return NextResponse.json({ error: logError.message }, { status: 500 })

    // Mapping vers transactions (simplifié — colonnes communes)
    const DATE_COLS = ['date', 'date_operation', 'date_transaction', 'DATE', 'Date']
    const MONTANT_COLS = ['montant', 'amount', 'MONTANT', 'Montant', 'total', 'Total']
    const LIBELLE_COLS = ['libelle', 'description', 'label', 'Libellé', 'Description', 'LIBELLE']

    const findCol = (row: Record<string, string>, candidates: string[]) =>
      candidates.find(c => c in row) ?? null

    const erreurs: { ligne: number; erreur: string }[] = []
    let nb_importees = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const dateCol = findCol(row, DATE_COLS)
        const montantCol = findCol(row, MONTANT_COLS)
        const libelleCol = findCol(row, LIBELLE_COLS)

        if (!dateCol || !montantCol) {
          erreurs.push({ ligne: i + 2, erreur: 'Colonnes date ou montant introuvables' })
          continue
        }

        const montant = parseFloat((row[montantCol] ?? '').replace(',', '.').replace(/\s/g, ''))
        if (isNaN(montant)) {
          erreurs.push({ ligne: i + 2, erreur: `Montant invalide: ${row[montantCol]}` })
          continue
        }

        const libelle = libelleCol ? (row[libelleCol] ?? '') : `Import ${detectedType}`

        await supabase.from('transactions').insert({
          user_id: user.id,
          date: row[dateCol],
          montant: Math.abs(montant),
          type: montant >= 0 ? 'credit' : 'debit',
          description: libelle,
          categorie: detectedType,
          source: 'import_csv',
          statut_rapprochement: 'non_rapproche',
        })

        nb_importees++
      } catch (err) {
        erreurs.push({ ligne: i + 2, erreur: err instanceof Error ? err.message : 'Erreur' })
      }
    }

    // Mise à jour log
    await supabase.from('imports_ecritures')
      .update({
        nb_importees,
        statut: erreurs.length === rows.length ? 'erreur' : 'termine',
        erreurs,
      })
      .eq('id', importLog.id)

    return NextResponse.json({
      success: true,
      type_detecte: detectedType,
      nb_lignes: rows.length,
      nb_importees,
      nb_erreurs: erreurs.length,
      erreurs: erreurs.slice(0, 10), // max 10 erreurs retournées
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
