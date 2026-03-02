'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Package, Send, Eye, ChevronDown, Loader2, RefreshCw } from 'lucide-react'
import { calculTotaux } from '@/lib/factures/calculs'
import { CatalogueModal } from './CatalogueModal'
import type { DocumentType, DocumentCommercial, LigneFacture, Client, HistoriqueDocument } from '@/types'

const TYPE_LABELS: Record<DocumentType, string> = {
  devis: 'Devis',
  bon_commande: 'Bon de commande',
  bon_livraison: 'Bon de livraison',
  proforma: 'Facture proforma',
  avoir: 'Avoir',
  facture_recurrente: 'Facture',
}

const TVA_OPTIONS = [0, 5.5, 10, 20]
const STATUTS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  valide: 'Validé',
  annule: 'Annulé',
  livre: 'Livré',
}
const CONVERSIONS: Partial<Record<DocumentType, { label: string; vers: string }[]>> = {
  devis: [
    { label: 'Convertir en Facture', vers: 'facture' },
    { label: 'Convertir en Bon de commande', vers: 'commande' },
  ],
  bon_commande: [
    { label: 'Convertir en Bon de livraison', vers: 'livraison' },
  ],
  facture_recurrente: [
    { label: 'Générer un Avoir', vers: 'avoir' },
  ],
  proforma: [
    { label: 'Convertir en Facture', vers: 'facture' },
  ],
}

interface DocumentFormProps {
  mode: 'create' | 'edit'
  type: DocumentType
  documentId?: string
}

function emptyLigne(): LigneFacture {
  return { description: '', quantite: 1, prix_unitaire_ht: 0, taux_tva: 20 }
}

export function DocumentForm({ mode, type, documentId }: DocumentFormProps) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [catalogueOpen, setCatalogueOpen] = useState(false)
  const [ligneIndexForCatalogue, setLigneIndexForCatalogue] = useState<number | null>(null)

  // Form state
  const [clientId, setClientId] = useState<string>('')
  const [clientNom, setClientNom] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAdresse, setClientAdresse] = useState('')
  const [clientSiren, setClientSiren] = useState('')
  const [useManualClient, setUseManualClient] = useState(false)
  const [lignes, setLignes] = useState<LigneFacture[]>([emptyLigne()])
  const [remisePct, setRemisePct] = useState(0)
  const [acompte, setAcompte] = useState(0)
  const [conditions, setConditions] = useState('30 jours')
  const [notes, setNotes] = useState('')
  const [validiteJours, setValiditeJours] = useState(30)
  const [dateEmission, setDateEmission] = useState(new Date().toISOString().split('T')[0])
  const [dateEcheance, setDateEcheance] = useState('')
  const [dateLivraison, setDateLivraison] = useState('')
  const [statut, setStatut] = useState<string>('brouillon')
  const [historique, setHistorique] = useState<HistoriqueDocument[]>([])
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConvertMenu, setShowConvertMenu] = useState(false)

  const totaux = calculTotaux(lignes, remisePct, acompte)

  // Fetch clients
  useEffect(() => {
    fetch('/api/notifications/clients')
      .then(r => r.json())
      .then(d => { if (d.success) setClients(d.clients ?? []) })
      .catch(() => {})
  }, [])

  // Fetch existing document if edit mode
  const fetchDocument = useCallback(async () => {
    if (mode !== 'edit' || !documentId) return
    const res = await fetch(`/api/documents/${documentId}`)
    const data = await res.json()
    if (!data.success) { setError(data.error ?? 'Document introuvable'); return }
    const doc: DocumentCommercial = data.document
    setClientId(doc.client_id ?? '')
    setClientNom(doc.client_nom ?? '')
    setClientEmail(doc.client_email ?? '')
    setClientAdresse(doc.client_adresse ?? '')
    setClientSiren(doc.client_siren ?? '')
    setUseManualClient(!doc.client_id)
    setLignes(doc.lignes?.length ? doc.lignes : [emptyLigne()])
    setRemisePct(doc.remise_percent ?? 0)
    setAcompte(doc.acompte ?? 0)
    setConditions(doc.conditions_paiement ?? '30 jours')
    setNotes(doc.notes ?? '')
    setValiditeJours(doc.validite_jours ?? 30)
    setDateEmission(doc.date_emission)
    setDateEcheance(doc.date_echeance ?? '')
    setDateLivraison(doc.date_livraison ?? '')
    setStatut(doc.statut)
    setHistorique(data.historique ?? [])
  }, [mode, documentId])

  useEffect(() => { void fetchDocument() }, [fetchDocument])

  const handleClientChange = (id: string) => {
    setClientId(id)
    const found = clients.find(c => c.id === id)
    if (found) {
      setClientNom(found.nom)
      setClientEmail(found.email ?? '')
      setClientAdresse(found.adresse ?? '')
      setClientSiren(found.siren ?? '')
    }
  }

  const updateLigne = (i: number, field: keyof LigneFacture, value: string | number) => {
    setLignes(prev => prev.map((l, idx) =>
      idx === i ? { ...l, [field]: typeof value === 'string' && field !== 'description' ? parseFloat(value) || 0 : value } : l
    ))
  }

  const addLigne = () => setLignes(prev => [...prev, emptyLigne()])
  const removeLigne = (i: number) => setLignes(prev => prev.filter((_, idx) => idx !== i))

  const openCatalogue = (i: number) => {
    setLigneIndexForCatalogue(i)
    setCatalogueOpen(true)
  }

  const handleCatalogueSelect = (ligne: LigneFacture) => {
    if (ligneIndexForCatalogue === null) return
    setLignes(prev => prev.map((l, i) => i === ligneIndexForCatalogue ? ligne : l))
    setLigneIndexForCatalogue(null)
  }

  const buildPayload = (statutOverride?: string) => ({
    type,
    statut: statutOverride ?? statut,
    client_id: useManualClient ? null : (clientId || null),
    client_nom: clientNom || null,
    client_email: clientEmail || null,
    client_adresse: clientAdresse || null,
    client_siren: clientSiren || null,
    lignes,
    remise_percent: remisePct,
    acompte,
    conditions_paiement: conditions,
    notes: notes || null,
    validite_jours: validiteJours,
    date_emission: dateEmission,
    date_echeance: dateEcheance || null,
    date_livraison: dateLivraison || null,
  })

  const save = async (statutOverride?: string) => {
    setSaving(true)
    setError(null)
    try {
      const payload = buildPayload(statutOverride)
      const url = mode === 'edit' ? `/api/documents/${documentId}` : '/api/documents'
      const method = mode === 'edit' ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error ?? 'Erreur'); return }
      router.push(`/commercial/${data.document.id}`)
    } catch { setError('Erreur réseau') } finally { setSaving(false) }
  }

  const sendDoc = async () => {
    if (!documentId) return
    setSending(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/envoyer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await res.json()
      if (data.success) { setStatut('envoye') }
      else { setError(data.error ?? 'Erreur envoi') }
    } catch { setError('Erreur réseau') } finally { setSending(false) }
  }

  const convertDoc = async (vers: string) => {
    if (!documentId) return
    setConverting(true)
    setShowConvertMenu(false)
    try {
      const res = await fetch(`/api/documents/${documentId}/convertir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vers }),
      })
      const data = await res.json()
      if (data.success && data.document) { router.push(`/commercial/${data.document.id}`) }
      else { setError(data.error ?? 'Erreur conversion') }
    } catch { setError('Erreur réseau') } finally { setConverting(false) }
  }

  const conversionsDisponibles = CONVERSIONS[type] ?? []

  return (
    <div className="space-y-6">
      <CatalogueModal
        open={catalogueOpen}
        onClose={() => setCatalogueOpen(false)}
        onSelect={handleCatalogueSelect}
      />

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {/* En-tête */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Informations générales</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type de document</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900">
              {TYPE_LABELS[type]}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date d&apos;émission</label>
            <input type="date" value={dateEmission} onChange={e => setDateEmission(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          {(type === 'devis' || type === 'proforma') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Validité (jours)</label>
              <input type="number" value={validiteJours} onChange={e => setValiditeJours(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          )}
          {(type === 'facture_recurrente' || type === 'avoir') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date d&apos;échéance</label>
              <input type="date" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          )}
          {type === 'bon_livraison' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date de livraison</label>
              <input type="date" value={dateLivraison} onChange={e => setDateLivraison(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          )}
          {mode === 'edit' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
              <select value={statut} onChange={e => setStatut(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {Object.entries(STATUTS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Client */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Client</h2>
          <button
            onClick={() => setUseManualClient(!useManualClient)}
            className="text-xs text-emerald-600 hover:underline"
          >
            {useManualClient ? 'Choisir depuis mes clients' : 'Saisie manuelle'}
          </button>
        </div>

        {!useManualClient ? (
          <select
            value={clientId}
            onChange={e => handleClientChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">— Sélectionner un client —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nom du client *" value={clientNom} onChange={e => setClientNom(e.target.value)}
              className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <input placeholder="Email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <input placeholder="SIREN" value={clientSiren} onChange={e => setClientSiren(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <textarea placeholder="Adresse" value={clientAdresse} onChange={e => setClientAdresse(e.target.value)} rows={2}
              className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
        )}
      </div>

      {/* Lignes */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Lignes</h2>
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase px-1">
            <div className="col-span-5">Description</div>
            <div className="col-span-1 text-right">Qté</div>
            <div className="col-span-2 text-right">PU HT</div>
            <div className="col-span-2 text-right">TVA</div>
            <div className="col-span-2 text-right">Total HT</div>
          </div>

          {lignes.map((ligne, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5 flex items-center gap-1">
                <input
                  value={ligne.description}
                  onChange={e => updateLigne(i, 'description', e.target.value)}
                  placeholder="Description…"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button onClick={() => openCatalogue(i)} title="Catalogue" className="p-2 text-gray-400 hover:text-emerald-600 transition-colors">
                  <Package className="w-4 h-4" />
                </button>
              </div>
              <input
                type="number" min="0" step="0.01" value={ligne.quantite}
                onChange={e => updateLigne(i, 'quantite', e.target.value)}
                className="col-span-1 px-2 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="number" min="0" step="0.01" value={ligne.prix_unitaire_ht}
                onChange={e => updateLigne(i, 'prix_unitaire_ht', e.target.value)}
                className="col-span-2 px-2 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <select
                value={ligne.taux_tva}
                onChange={e => updateLigne(i, 'taux_tva', e.target.value)}
                className="col-span-2 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {TVA_OPTIONS.map(t => <option key={t} value={t}>{t}%</option>)}
              </select>
              <div className="col-span-1 text-right text-sm font-mono text-gray-700 pr-1">
                {(ligne.quantite * ligne.prix_unitaire_ht).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
              </div>
              <button onClick={() => removeLigne(i)} disabled={lignes.length === 1}
                className="col-span-1 flex justify-center text-gray-300 hover:text-red-500 disabled:opacity-30 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button onClick={addLigne}
          className="mt-3 flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 transition-colors">
          <Plus className="w-4 h-4" />
          Ajouter une ligne
        </button>
      </div>

      {/* Totaux */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Totaux</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Remise globale (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={remisePct}
                onChange={e => setRemisePct(parseFloat(e.target.value) || 0)}
                className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Acompte versé (€)</label>
              <input type="number" min="0" step="0.01" value={acompte}
                onChange={e => setAcompte(parseFloat(e.target.value) || 0)}
                className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="w-64 space-y-1 text-sm border-l border-gray-100 pl-4">
            <div className="flex justify-between text-gray-600">
              <span>Sous-total HT</span>
              <span className="font-mono">{totaux.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
            </div>
            {remisePct > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Remise {remisePct}%</span>
                <span className="font-mono">-{totaux.remiseAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Total HT net</span>
              <span className="font-mono">{totaux.totalHTApresRemise.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
            </div>
            {Object.entries(totaux.tvaParTaux).map(([taux, montant]) =>
              montant !== 0 ? (
                <div key={taux} className="flex justify-between text-gray-600">
                  <span>TVA {taux}%</span>
                  <span className="font-mono">{montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                </div>
              ) : null
            )}
            <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
              <span>Total TTC</span>
              <span className="font-mono text-emerald-700">{totaux.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
            </div>
            {acompte > 0 && (
              <div className="flex justify-between font-bold text-red-700">
                <span>Net à payer</span>
                <span className="font-mono">{totaux.resteADuTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes + Conditions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Notes & Conditions</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Conditions de paiement</label>
            <input value={conditions} onChange={e => setConditions(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes internes / message client</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center flex-wrap gap-3">
        <button
          onClick={() => void save('brouillon')}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer brouillon'}
        </button>
        <button
          onClick={() => void save()}
          disabled={saving}
          className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
        </button>

        {mode === 'edit' && documentId && (
          <>
            <button
              onClick={() => window.open(`/commercial/${documentId}/print`, '_blank')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Aperçu PDF
            </button>

            {clientEmail && (
              <button
                onClick={() => void sendDoc()}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer par email
              </button>
            )}

            {conversionsDisponibles.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowConvertMenu(!showConvertMenu)}
                  disabled={converting}
                  className="flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors disabled:opacity-50"
                >
                  {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Convertir en…
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showConvertMenu && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                    {conversionsDisponibles.map(c => (
                      <button
                        key={c.vers}
                        onClick={() => void convertDoc(c.vers)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl transition-colors"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Historique (mode edit) */}
      {mode === 'edit' && historique.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Historique</h2>
          <div className="space-y-2">
            {historique.map(h => (
              <div key={h.id} className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 text-xs flex-shrink-0">
                  {new Date(h.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                  h.action === 'creation' ? 'bg-emerald-100 text-emerald-800' :
                  h.action === 'envoi' ? 'bg-blue-100 text-blue-800' :
                  h.action === 'conversion' ? 'bg-purple-100 text-purple-800' :
                  h.action === 'annulation' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {h.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
