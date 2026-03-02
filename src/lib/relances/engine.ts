import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface FactureEnRetardRelance {
  id: string
  numero_facture: string
  montant_ttc: number
  date_echeance: string
  jours_retard: number
  client_nom: string
  client_email: string | null
  montant_paye: number
  nb_relances: number
}

export interface RelancesConfig {
  actif: boolean
  delai_j1: number
  delai_j2: number
  delai_j3: number
  ton: string
  signature: string | null
}

export async function getFacturesEnRetard(userId: string): Promise<FactureEnRetardRelance[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: factures } = await supabase
    .from('factures_clients')
    .select('id, numero_facture, montant_ttc, date_echeance, montant_paye, client:clients(nom, email)')
    .eq('user_id', userId)
    .lt('date_echeance', today)
    .neq('statut_paiement', 'payee')

  if (!factures?.length) return []

  const today_ms = Date.now()
  return factures
    .map((f: {
      id: string
      numero_facture: string
      montant_ttc: number
      date_echeance: string
      montant_paye: number
      client: { nom: string; email: string | null }[] | null
    }) => {
      const echeance = new Date(f.date_echeance).getTime()
      const jours = Math.floor((today_ms - echeance) / 86400000)
      const clientRow = Array.isArray(f.client) ? f.client[0] : f.client
      return {
        id: f.id,
        numero_facture: f.numero_facture,
        montant_ttc: f.montant_ttc,
        date_echeance: f.date_echeance,
        jours_retard: jours,
        client_nom: clientRow?.nom ?? 'Client inconnu',
        client_email: clientRow?.email ?? null,
        montant_paye: f.montant_paye,
        nb_relances: 0,
      }
    })
    .filter(f => f.jours_retard > 0)
}

export function calculNiveauRelance(joursRetard: number, config: RelancesConfig): 1 | 2 | 3 {
  if (joursRetard >= config.delai_j3) return 3
  if (joursRetard >= config.delai_j2) return 2
  return 1
}

const TEMPLATES: Record<number, Record<string, string>> = {
  1: {
    cordial: `Bonjour,

Nous vous contactons au sujet de la facture {NUMERO} d'un montant de {MONTANT} TTC, arrivée à échéance le {ECHEANCE} (il y a {JOURS} jours).

Peut-être s'agit-il d'un simple oubli ? Nous vous invitons à régulariser ce paiement dans les meilleurs délais.

{SIGNATURE}`,
    ferme: `Bonjour,

Malgré nos relances, la facture {NUMERO} d'un montant de {MONTANT} TTC reste impayée depuis {JOURS} jours.

Nous vous demandons de procéder au règlement sous 48 heures.

{SIGNATURE}`,
    urgent: `MISE EN DEMEURE

Nous vous mettons en demeure de régler immédiatement la facture {NUMERO} d'un montant de {MONTANT} TTC, impayée depuis {JOURS} jours.

Sans règlement sous 8 jours, nous serons contraints d'engager une procédure de recouvrement.

{SIGNATURE}`,
  },
  2: {
    cordial: `Bonjour,

Nous vous rappelons que malgré notre premier message, la facture {NUMERO} d'un montant de {MONTANT} TTC reste à régler ({JOURS} jours de retard).

Nous vous prions de régulariser cette situation rapidement.

{SIGNATURE}`,
    ferme: `Bonjour,

Suite à nos précédents rappels, la facture {NUMERO} ({MONTANT} TTC) demeure impayée depuis {JOURS} jours.

Conformément aux dispositions légales (Art. L441-10 du Code de commerce), des pénalités de retard de 3× le taux légal s'appliquent.

{SIGNATURE}`,
    urgent: `SECOND AVERTISSEMENT

La facture {NUMERO} ({MONTANT} TTC) est impayée depuis {JOURS} jours malgré notre première mise en demeure.

Sous 5 jours, ce dossier sera transmis à notre service contentieux.

{SIGNATURE}`,
  },
  3: {
    cordial: `Bonjour,

Après plusieurs contacts sans succès, la facture {NUMERO} ({MONTANT} TTC) reste impayée depuis {JOURS} jours.

Nous vous demandons de régulariser ce dossier de toute urgence pour éviter des poursuites.

{SIGNATURE}`,
    ferme: `MISE EN DEMEURE FINALE

La facture {NUMERO} ({MONTANT} TTC) est impayée depuis {JOURS} jours. Malgré nos relances, vous n'avez pas régularisé votre situation.

Sans paiement sous 8 jours, une procédure judiciaire sera engagée.

{SIGNATURE}`,
    urgent: `DERNIER AVERTISSEMENT AVANT CONTENTIEUX

Facture {NUMERO} — Montant : {MONTANT} TTC — Retard : {JOURS} jours

Nous vous accordons un délai de 72 heures pour régler ce dossier avant transmission à nos avocats.

{SIGNATURE}`,
  },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

export async function genererEmailRelance(
  facture: FactureEnRetardRelance,
  niveau: 1 | 2 | 3,
  ton: string,
  signature: string | null
): Promise<string> {
  const tonKey = ['cordial', 'ferme', 'urgent'].includes(ton) ? ton : 'cordial'
  const template = TEMPLATES[niveau][tonKey] ?? TEMPLATES[niveau]['cordial']

  const baseContent = template
    .replace('{NUMERO}', facture.numero_facture)
    .replace('{MONTANT}', formatCurrency(facture.montant_ttc))
    .replace('{ECHEANCE}', formatDate(facture.date_echeance))
    .replace('{JOURS}', String(facture.jours_retard))
    .replace('{SIGNATURE}', signature ?? 'Cordialement,\nLe service comptabilité')

  // Use Claude to personalize if API key available
  if (!process.env.ANTHROPIC_API_KEY) return baseContent

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
      temperature: 0.4,
      system: `Tu es un expert en recouvrement de créances français.
Améliore légèrement le texte de relance suivant pour le rendre plus professionnel et persuasif,
mais garde le même ton (${ton}) et le même niveau (${niveau}/3).
Ne change pas les informations factuelles. Réponds uniquement avec le texte amélioré.`,
      messages: [{
        role: 'user',
        content: `Client : ${facture.client_nom}\n\nTexte à améliorer :\n${baseContent}`,
      }],
    })
    return response.content[0]?.type === 'text' ? response.content[0].text : baseContent
  } catch {
    return baseContent // Fallback to template if AI fails
  }
}
