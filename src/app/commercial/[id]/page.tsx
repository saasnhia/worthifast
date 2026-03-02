'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout'
import { ArrowLeft, Edit2, Printer, Send, RefreshCw, Trash2, Loader2, CheckCircle, Clock, XCircle, Package, FileText } from 'lucide-react'
import Link from 'next/link'
import type { DocumentCommercial, HistoriqueDocument } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  devis: 'Devis',
  bon_commande: 'Bon de commande',
  bon_livraison: 'Bon de livraison',
  proforma: 'Facture proforma',
  avoir: 'Avoir',
  facture_recurrente: 'Facture',
}

const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  envoye: { label: 'Envoyé', color: 'bg-blue-100 text-blue-700' },
  accepte: { label: 'Accepté', color: 'bg-emerald-100 text-emerald-700' },
  refuse: { label: 'Refusé', color: 'bg-red-100 text-red-700' },
  valide: { label: 'Validé', color: 'bg-purple-100 text-purple-700' },
  annule: { label: 'Annulé', color: 'bg-gray-100 text-gray-500' },
  livre: { label: 'Livré', color: 'bg-teal-100 text-teal-700' },
}

const HISTORIQUE_LABELS: Record<string, string> = {
  creation: 'Créé',
  modification: 'Modifié',
  envoi: 'Envoyé',
  validation: 'Validé',
  conversion: 'Converti',
  annulation: 'Annulé',
  facturation: 'Facturé',
}

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [doc, setDoc] = useState<DocumentCommercial | null>(null)
  const [historique, setHistorique] = useState<HistoriqueDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertTarget, setConvertTarget] = useState('')
  const [showConvertMenu, setShowConvertMenu] = useState(false)

  const fetchDoc = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${id}`)
      const data = await res.json()
      if (data.success) {
        setDoc(data.document)
        setHistorique(data.historique ?? [])
      } else {
        router.push('/commercial')
      }
    } catch {
      router.push('/commercial')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { void fetchDoc() }, [fetchDoc])

  const handleEnvoyer = async () => {
    if (!doc) return
    setSending(true)
    try {
      const res = await fetch(`/api/documents/${id}/envoyer`, { method: 'POST' })
      const data = await res.json()
      if (data.success) await fetchDoc()
    } catch { /* silent */ } finally { setSending(false) }
  }

  const handleConvertir = async (vers: string) => {
    setConverting(true)
    setConvertTarget(vers)
    setShowConvertMenu(false)
    try {
      const res = await fetch(`/api/documents/${id}/convertir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vers }),
      })
      const data = await res.json()
      if (data.success && data.document) {
        router.push(`/commercial/${data.document.id}`)
      }
    } catch { /* silent */ } finally { setConverting(false); setConvertTarget('') }
  }

  const handleAnnuler = async () => {
    if (!confirm('Confirmer l\'annulation de ce document ?')) return
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      router.push('/commercial')
    } catch { /* silent */ }
  }

  const CONVERSIONS: Record<string, { label: string; vers: string }[]> = {
    devis: [
      { label: 'Convertir en Facture', vers: 'facture' },
      { label: 'Convertir en Bon de commande', vers: 'commande' },
    ],
    bon_commande: [{ label: 'Convertir en Bon de livraison', vers: 'livraison' }],
    facture_recurrente: [{ label: 'Générer un Avoir', vers: 'avoir' }],
    proforma: [{ label: 'Convertir en Facture', vers: 'facture' }],
  }

  if (loading) return (
    <AppShell>
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    </AppShell>
  )

  if (!doc) return null

  const statutConfig = STATUT_CONFIG[doc.statut] ?? { label: doc.statut, color: 'bg-gray-100 text-gray-700' }
  const conversions = CONVERSIONS[doc.type] ?? []

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/commercial" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">
                  {TYPE_LABELS[doc.type] ?? doc.type} {doc.numero && `— ${doc.numero}`}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statutConfig.color}`}>
                  {statutConfig.label}
                </span>
              </div>
              {doc.client_nom && <p className="text-sm text-gray-500 mt-0.5">{doc.client_nom}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {doc.statut !== 'annule' && (
              <>
                <Link href={`/commercial/${id}/modifier`}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  <Edit2 className="w-4 h-4" />
                  Modifier
                </Link>
                <Link href={`/commercial/${id}/print`} target="_blank"
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  <Printer className="w-4 h-4" />
                  Imprimer
                </Link>
                {doc.client_email && doc.statut === 'brouillon' && (
                  <button onClick={() => void handleEnvoyer()} disabled={sending}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Envoyer
                  </button>
                )}
                {conversions.length > 0 && (
                  <div className="relative">
                    <button onClick={() => setShowConvertMenu(!showConvertMenu)} disabled={converting}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                      {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Convertir
                    </button>
                    {showConvertMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[200px]">
                        {conversions.map(c => (
                          <button key={c.vers} onClick={() => void handleConvertir(c.vers)}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl transition-colors">
                            {c.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => void handleAnnuler()}
                  className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                  Annuler
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client */}
            {(doc.client_nom || doc.client_email) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Client</h2>
                <p className="font-semibold text-gray-900">{doc.client_nom}</p>
                {doc.client_email && <p className="text-sm text-gray-500">{doc.client_email}</p>}
                {doc.client_adresse && <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{doc.client_adresse}</p>}
                {doc.client_siren && <p className="text-xs text-gray-400 mt-1">SIREN: {doc.client_siren}</p>}
              </div>
            )}

            {/* Lignes */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Lignes</h2>
              <div className="divide-y divide-gray-100">
                {(doc.lignes ?? []).map((ligne, i) => (
                  <div key={i} className="py-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{ligne.description || `Ligne ${i + 1}`}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ligne.quantite} × {ligne.prix_unitaire_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € HT — TVA {ligne.taux_tva}%
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                      {(ligne.quantite * ligne.prix_unitaire_ht).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € HT
                    </p>
                  </div>
                ))}
              </div>
              {/* Totaux */}
              <div className="border-t border-gray-200 mt-3 pt-3 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Sous-total HT</span>
                  <span>{doc.sous_total_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                </div>
                {doc.remise_percent > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Remise {doc.remise_percent}%</span>
                    <span>-{(doc.sous_total_ht * doc.remise_percent / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total HT</span>
                  <span>{doc.total_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>TVA</span>
                  <span>{doc.total_tva.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                </div>
                {doc.acompte > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Acompte</span>
                    <span>-{doc.acompte.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
                  <span>Total TTC</span>
                  <span>{doc.total_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {doc.notes && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Notes</h2>
                <p className="text-sm text-gray-600 whitespace-pre-line">{doc.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Infos */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Informations</h2>
              <div className="space-y-2 text-sm">
                {doc.date_emission && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Émis le</span>
                    <span className="text-gray-900">{new Date(doc.date_emission).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
                {doc.date_echeance && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Échéance</span>
                    <span className="text-gray-900">{new Date(doc.date_echeance).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
                {doc.date_livraison && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Livraison</span>
                    <span className="text-gray-900">{new Date(doc.date_livraison).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
                {doc.conditions_paiement && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Paiement</span>
                    <span className="text-gray-900">{doc.conditions_paiement}</span>
                  </div>
                )}
                {doc.validite_jours && doc.type === 'devis' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Validité</span>
                    <span className="text-gray-900">{doc.validite_jours} jours</span>
                  </div>
                )}
              </div>
            </div>

            {/* Historique */}
            {historique.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Historique</h2>
                <div className="space-y-2">
                  {historique.map(h => (
                    <div key={h.id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-700">{HISTORIQUE_LABELS[h.action] ?? h.action}</p>
                        <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString('fr-FR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
