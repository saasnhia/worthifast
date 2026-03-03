import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SeedDossier {
  nom: string
  siren: string
  secteur: string
  regime_tva: string
  email: string
  telephone: string
}

interface SeedStatut {
  tva_status: 'ok' | 'retard' | 'erreur' | 'inconnu'
  tva_prochaine_echeance: string
  nb_factures_attente: number
  dernier_rapprochement: string
  taux_rapprochement: number
  ca_annuel_estime: number
}

const DEMO_DOSSIERS: Array<{ dossier: SeedDossier; statut: SeedStatut }> = [
  {
    dossier: {
      nom: 'Cabinet Moreau & Associés',
      siren: '412345678',
      secteur: 'Expertise comptable',
      regime_tva: 'réel normal',
      email: 'contact@moreau-associes.fr',
      telephone: '+33 3 80 12 34 56',
    },
    statut: {
      tva_status: 'retard',
      tva_prochaine_echeance: new Date(Date.now() - 3 * 86400_000).toISOString(),
      nb_factures_attente: 8,
      dernier_rapprochement: new Date(Date.now() - 12 * 86400_000).toISOString(),
      taux_rapprochement: 78.5,
      ca_annuel_estime: 245000,
    },
  },
  {
    dossier: {
      nom: 'Boulangerie Martin SAS',
      siren: '523456789',
      secteur: 'Alimentation / Commerce',
      regime_tva: 'réel simplifié',
      email: 'martin.boulangerie@gmail.com',
      telephone: '+33 3 85 21 43 65',
    },
    statut: {
      tva_status: 'ok',
      tva_prochaine_echeance: new Date(Date.now() + 18 * 86400_000).toISOString(),
      nb_factures_attente: 5,
      dernier_rapprochement: new Date(Date.now() - 2 * 86400_000).toISOString(),
      taux_rapprochement: 94.2,
      ca_annuel_estime: 380000,
    },
  },
  {
    dossier: {
      nom: 'Garage Dupont SARL',
      siren: '634567890',
      secteur: 'Automobile / Services',
      regime_tva: 'réel normal',
      email: 'dupont.garage@beaune21.fr',
      telephone: '+33 3 80 45 67 89',
    },
    statut: {
      tva_status: 'ok',
      tva_prochaine_echeance: new Date(Date.now() + 25 * 86400_000).toISOString(),
      nb_factures_attente: 0,
      dernier_rapprochement: new Date(Date.now() - 1 * 86400_000).toISOString(),
      taux_rapprochement: 99.8,
      ca_annuel_estime: 520000,
    },
  },
]

/**
 * GET /api/seed/demo
 * Insère 3 dossiers de démo pour l'utilisateur authentifié.
 * Idempotent — ne crée pas de doublon si appelé plusieurs fois.
 * Appelez cette URL depuis votre navigateur après connexion sur /login.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response(
      `<html><body style="font-family:sans-serif;padding:2rem">
        <h2>❌ Non authentifié</h2>
        <p>Connectez-vous d'abord sur <a href="/login">/login</a>, puis revenez ici.</p>
      </body></html>`,
      { status: 401, headers: { 'Content-Type': 'text/html' } }
    )
  }

  const seeded: string[] = []
  const errors: string[] = []

  for (const { dossier, statut } of DEMO_DOSSIERS) {
    // Check if dossier already exists
    const { data: existing } = await supabase
      .from('dossiers')
      .select('id')
      .eq('user_id', user.id)
      .eq('nom', dossier.nom)
      .maybeSingle()

    let dossierId: string

    if (existing?.id) {
      dossierId = existing.id
      seeded.push(`↻ ${dossier.nom} (déjà existant, statuts mis à jour)`)
    } else {
      const { data: created, error: createErr } = await supabase
        .from('dossiers')
        .insert({ user_id: user.id, ...dossier })
        .select('id')
        .single()

      if (createErr || !created) {
        errors.push(`✗ ${dossier.nom}: ${createErr?.message ?? 'erreur'}`)
        continue
      }
      dossierId = created.id
      seeded.push(`✓ ${dossier.nom} (créé)`)
    }

    // Upsert statuts
    const { error: statutErr } = await supabase
      .from('dossier_statuts')
      .upsert({ dossier_id: dossierId, ...statut }, { onConflict: 'dossier_id' })

    if (statutErr) {
      errors.push(`  ⚠ statuts ${dossier.nom}: ${statutErr.message}`)
    }
  }

  const allOk = errors.length === 0

  return new Response(
    `<html>
<head><style>
  body{font-family:sans-serif;padding:2rem;max-width:600px;margin:auto}
  h2{color:${allOk ? '#10b981' : '#ef4444'}}
  ul{line-height:2}
  .ok{color:#10b981}.err{color:#ef4444}.next{margin-top:2rem;padding:1rem;background:#f0fdf4;border-radius:8px}
  a{color:#10b981;font-weight:bold}
</style></head>
<body>
  <h2>${allOk ? '✅' : '⚠️'} Seed démo cabinet</h2>
  <p>Utilisateur : <strong>${user.email}</strong></p>
  <ul>
    ${seeded.map(s => `<li class="ok">${s}</li>`).join('')}
    ${errors.map(e => `<li class="err">${e}</li>`).join('')}
  </ul>
  ${allOk
    ? `<div class="next">
        <p>🎉 Les 3 dossiers sont prêts !</p>
        <p><a href="/cabinet">→ Aller sur /cabinet</a></p>
       </div>`
    : `<p class="err">Vérifiez que la migration 013_dossiers.sql est bien exécutée sur Supabase.</p>`
  }
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
