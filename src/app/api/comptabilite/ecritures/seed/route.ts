import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/comptabilite/ecritures/seed
 * Seeds 100+ demo écritures comptables pour le Cabinet Moreau.
 * Utilise les comptes PCG existants (pcg_sources).
 */

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Vérifier si la table existe et s'il y a déjà des écritures
    const { count: existing, error: checkError } = await supabase
      .from('ecritures_comptables')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (checkError) {
      return NextResponse.json({
        error: `Table ecritures_comptables inaccessible: ${checkError.message}. Vérifiez que la migration 034 est appliquée.`,
        hint: 'Exécutez: npx supabase db push',
      }, { status: 500 })
    }

    if ((existing ?? 0) > 10) {
      return NextResponse.json({
        success: true,
        message: `${existing} écritures existent déjà — seed ignoré`,
        count: existing,
      })
    }

    const ecritures: Record<string, unknown>[] = []
    let seq = 1

    const makeNum = () => {
      const num = `EC-2026-${String(seq).padStart(4, '0')}`
      seq++
      return num
    }

    // ─── Janvier 2026 — Ouverture + premiers achats ─────────────────────────

    // AN — Bilan d'ouverture
    const anNum = makeNum()
    ecritures.push(
      { user_id: user.id, ecriture_num: anNum, journal_code: 'AN', date_ecriture: '2026-01-01', compte_num: '512', compte_lib: 'Banque', debit: 85000, credit: 0, libelle: 'Solde ouverture banque', source: 'manual' },
      { user_id: user.id, ecriture_num: anNum, journal_code: 'AN', date_ecriture: '2026-01-01', compte_num: '411', compte_lib: 'Clients', debit: 42000, credit: 0, libelle: 'Créances clients ouverture', source: 'manual' },
      { user_id: user.id, ecriture_num: anNum, journal_code: 'AN', date_ecriture: '2026-01-01', compte_num: '401', compte_lib: 'Fournisseurs', debit: 0, credit: 18000, libelle: 'Dettes fournisseurs ouverture', source: 'manual' },
      { user_id: user.id, ecriture_num: anNum, journal_code: 'AN', date_ecriture: '2026-01-01', compte_num: '101', compte_lib: 'Capital social', debit: 0, credit: 50000, libelle: 'Capital social', source: 'manual' },
      { user_id: user.id, ecriture_num: anNum, journal_code: 'AN', date_ecriture: '2026-01-01', compte_num: '110', compte_lib: 'Report à nouveau', debit: 0, credit: 59000, libelle: 'Report à nouveau créditeur', source: 'manual' },
    )

    // AC — Achats Janvier
    const months = ['01', '02', '03']
    const fournisseurs = [
      { nom: 'Office Depot', ht: 1200, tva: 240, ttc: 1440, compte: '606' },
      { nom: 'Sage Compta', ht: 890, tva: 178, ttc: 1068, compte: '613' },
      { nom: 'Orange Pro', ht: 89, tva: 17.8, ttc: 106.8, compte: '626' },
      { nom: 'EDF Pro', ht: 340, tva: 68, ttc: 408, compte: '606' },
      { nom: 'MAIF Assurance', ht: 450, tva: 0, ttc: 450, compte: '616' },
    ]

    for (const month of months) {
      for (const f of fournisseurs) {
        const day = String(5 + Math.floor(Math.random() * 20)).padStart(2, '0')
        const num = makeNum()
        const date = `2026-${month}-${day}`
        ecritures.push(
          { user_id: user.id, ecriture_num: num, journal_code: 'AC', date_ecriture: date, piece_ref: `FA-${f.nom.substring(0, 3).toUpperCase()}-${month}`, compte_num: f.compte, compte_lib: `Achats ${f.nom}`, debit: f.ht, credit: 0, libelle: `Facture ${f.nom}`, source: 'auto_facture' },
          ...(f.tva > 0 ? [{ user_id: user.id, ecriture_num: num, journal_code: 'AC', date_ecriture: date, piece_ref: `FA-${f.nom.substring(0, 3).toUpperCase()}-${month}`, compte_num: '44566', compte_lib: 'TVA déductible sur ABS', debit: f.tva, credit: 0, libelle: `TVA — ${f.nom}`, source: 'auto_facture' }] : []),
          { user_id: user.id, ecriture_num: num, journal_code: 'AC', date_ecriture: date, piece_ref: `FA-${f.nom.substring(0, 3).toUpperCase()}-${month}`, compte_num: '401', compte_lib: `Fournisseurs — ${f.nom}`, debit: 0, credit: f.ttc, libelle: `Facture ${f.nom}`, source: 'auto_facture' },
        )
      }
    }

    // VE — Ventes (factures clients)
    const clients = [
      { nom: 'Boulangerie Martin', ht: 2400, tva: 480, ttc: 2880 },
      { nom: 'Restaurant Le Gourmet', ht: 3600, tva: 720, ttc: 4320 },
      { nom: 'Pharmacie Dupont', ht: 1800, tva: 360, ttc: 2160 },
      { nom: 'Garage Durand', ht: 1500, tva: 300, ttc: 1800 },
      { nom: 'SCI Moreau Immo', ht: 4200, tva: 840, ttc: 5040 },
    ]

    for (const month of months) {
      for (const c of clients) {
        const day = String(1 + Math.floor(Math.random() * 25)).padStart(2, '0')
        const num = makeNum()
        const date = `2026-${month}-${day}`
        ecritures.push(
          { user_id: user.id, ecriture_num: num, journal_code: 'VE', date_ecriture: date, piece_ref: `FC-${month}-${c.nom.substring(0, 3).toUpperCase()}`, compte_num: '411', compte_lib: `Clients — ${c.nom}`, debit: c.ttc, credit: 0, libelle: `Honoraires ${c.nom}`, source: 'auto_facture' },
          { user_id: user.id, ecriture_num: num, journal_code: 'VE', date_ecriture: date, piece_ref: `FC-${month}-${c.nom.substring(0, 3).toUpperCase()}`, compte_num: '44571', compte_lib: 'TVA collectée', debit: 0, credit: c.tva, libelle: `TVA — ${c.nom}`, source: 'auto_facture' },
          { user_id: user.id, ecriture_num: num, journal_code: 'VE', date_ecriture: date, piece_ref: `FC-${month}-${c.nom.substring(0, 3).toUpperCase()}`, compte_num: '706', compte_lib: 'Prestations de services', debit: 0, credit: c.ht, libelle: `Honoraires ${c.nom}`, source: 'auto_facture' },
        )
      }
    }

    // BQ — Encaissements clients
    for (const month of months) {
      for (const c of clients) {
        if (Math.random() > 0.3) { // 70% des clients paient
          const day = String(15 + Math.floor(Math.random() * 13)).padStart(2, '0')
          const num = makeNum()
          ecritures.push(
            { user_id: user.id, ecriture_num: num, journal_code: 'BQ', date_ecriture: `2026-${month}-${day}`, compte_num: '512', compte_lib: 'Banque', debit: c.ttc, credit: 0, libelle: `Enc. ${c.nom}`, source: 'auto_transaction' },
            { user_id: user.id, ecriture_num: num, journal_code: 'BQ', date_ecriture: `2026-${month}-${day}`, compte_num: '411', compte_lib: `Clients — ${c.nom}`, debit: 0, credit: c.ttc, libelle: `Enc. ${c.nom}`, source: 'auto_transaction' },
          )
        }
      }
    }

    // BQ — Paiements fournisseurs
    for (const month of months) {
      for (const f of fournisseurs) {
        if (Math.random() > 0.2) {
          const day = String(20 + Math.floor(Math.random() * 8)).padStart(2, '0')
          const num = makeNum()
          ecritures.push(
            { user_id: user.id, ecriture_num: num, journal_code: 'BQ', date_ecriture: `2026-${month}-${day}`, compte_num: '401', compte_lib: `Fournisseurs — ${f.nom}`, debit: f.ttc, credit: 0, libelle: `Pmt ${f.nom}`, source: 'auto_transaction' },
            { user_id: user.id, ecriture_num: num, journal_code: 'BQ', date_ecriture: `2026-${month}-${day}`, compte_num: '512', compte_lib: 'Banque', debit: 0, credit: f.ttc, libelle: `Pmt ${f.nom}`, source: 'auto_transaction' },
          )
        }
      }
    }

    // SA — Salaires (Janvier-Mars)
    for (const month of months) {
      const num = makeNum()
      ecritures.push(
        { user_id: user.id, ecriture_num: num, journal_code: 'SA', date_ecriture: `2026-${month}-28`, compte_num: '641', compte_lib: 'Rémunérations du personnel', debit: 8500, credit: 0, libelle: `Salaires bruts ${month}/2026`, source: 'manual' },
        { user_id: user.id, ecriture_num: num, journal_code: 'SA', date_ecriture: `2026-${month}-28`, compte_num: '645', compte_lib: 'Charges sociales', debit: 3800, credit: 0, libelle: `Charges sociales ${month}/2026`, source: 'manual' },
        { user_id: user.id, ecriture_num: num, journal_code: 'SA', date_ecriture: `2026-${month}-28`, compte_num: '421', compte_lib: 'Personnel — Rémunérations dues', debit: 0, credit: 6200, libelle: `Net à payer ${month}/2026`, source: 'manual' },
        { user_id: user.id, ecriture_num: num, journal_code: 'SA', date_ecriture: `2026-${month}-28`, compte_num: '431', compte_lib: 'Sécurité sociale', debit: 0, credit: 3400, libelle: `URSSAF ${month}/2026`, source: 'manual' },
        { user_id: user.id, ecriture_num: num, journal_code: 'SA', date_ecriture: `2026-${month}-28`, compte_num: '4421', compte_lib: 'Prélèvements à la source', debit: 0, credit: 2700, libelle: `PAS ${month}/2026`, source: 'manual' },
      )
    }

    // OD — TVA déclaration (fin janvier)
    const odNum = makeNum()
    ecritures.push(
      { user_id: user.id, ecriture_num: odNum, journal_code: 'OD', date_ecriture: '2026-01-31', compte_num: '44571', compte_lib: 'TVA collectée', debit: 2700, credit: 0, libelle: 'Déclaration TVA janvier — collectée', source: 'manual' },
      { user_id: user.id, ecriture_num: odNum, journal_code: 'OD', date_ecriture: '2026-01-31', compte_num: '44566', compte_lib: 'TVA déductible', debit: 0, credit: 503.8, libelle: 'Déclaration TVA janvier — déductible', source: 'manual' },
      { user_id: user.id, ecriture_num: odNum, journal_code: 'OD', date_ecriture: '2026-01-31', compte_num: '44551', compte_lib: 'TVA à décaisser', debit: 0, credit: 2196.2, libelle: 'TVA nette à payer janvier', source: 'manual' },
    )

    // Insérer par batch de 50
    let insertedCount = 0
    for (let i = 0; i < ecritures.length; i += 50) {
      const batch = ecritures.slice(i, i + 50)
      const { error } = await supabase.from('ecritures_comptables').insert(batch)
      if (error) {
        return NextResponse.json({ error: error.message, inserted_so_far: insertedCount }, { status: 500 })
      }
      insertedCount += batch.length
    }

    return NextResponse.json({
      success: true,
      count: insertedCount,
      message: `${insertedCount} écritures comptables seedées (Jan-Mars 2026)`,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
