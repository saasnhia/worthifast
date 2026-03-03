'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Eye, Edit2, Copy, Trash2, Send, ChevronDown, Loader2, FileText } from 'lucide-react'
import type { DocumentCommercial, DocumentType } from '@/types'

const TYPE_TABS: { id: string; label: string }[] = [
  { id: '', label: 'Tous' },
  { id: 'devis', label: 'Devis' },
  { id: 'bon_commande', label: 'Commandes' },
  { id: 'bon_livraison', label: 'Livraisons' },
  { id: 'proforma', label: 'Proforma' },
  { id: 'avoir', label: 'Avoirs' },
  { id: 'facture_recurrente', label: 'Factures' },
]

const STATUT_COLORS: Record<string, string> = {
  brouillon: 'bg-gray-100 text-gray-700',
  envoye: 'bg-blue-100 text-blue-800',
  accepte: 'bg-emerald-100 text-emerald-800',
  refuse: 'bg-red-100 text-red-800',
  valide: 'bg-green-100 text-green-800',
  annule: 'bg-gray-200 text-gray-500',
  livre: 'bg-teal-100 text-teal-800',
}

const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  valide: 'Validé',
  annule: 'Annulé',
  livre: 'Livré',
}

const TYPE_LABELS: Record<DocumentType, string> = {
  devis: 'Devis',
  bon_commande: 'BC',
  bon_livraison: 'BL',
  proforma: 'Proforma',
  avoir: 'Avoir',
  facture_recurrente: 'Facture',
}

const TYPE_OPTIONS: { type: DocumentType; label: string }[] = [
  { type: 'devis', label: 'Devis' },
  { type: 'bon_commande', label: 'Bon de commande' },
  { type: 'bon_livraison', label: 'Bon de livraison' },
  { type: 'proforma', label: 'Facture proforma' },
  { type: 'avoir', label: 'Avoir' },
  { type: 'facture_recurrente', label: 'Facture' },
]

export function DocumentsList() {
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentCommercial[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('')
  const [search, setSearch] = useState('')
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTab) params.set('type', activeTab)
      if (search) params.set('search', search)
      const res = await fetch(`/api/documents?${params}`)
      const data = await res.json()
      if (data.success) setDocuments(data.documents ?? [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [activeTab, search])

  useEffect(() => { void fetchDocuments() }, [fetchDocuments])

  const handleDelete = async (id: string) => {
    if (!confirm('Annuler ce document ?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      await fetchDocuments()
    } catch { /* silent */ } finally { setDeletingId(null) }
  }

  const handleSend = async (doc: DocumentCommercial) => {
    if (!doc.client_email) { alert('Pas d\'email client pour ce document'); return }
    setSendingId(doc.id)
    try {
      const res = await fetch(`/api/documents/${doc.id}/envoyer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      })
      const data = await res.json()
      if (data.success) { await fetchDocuments() }
    } catch { /* silent */ } finally { setSendingId(null) }
  }

  const handleDuplicate = async (doc: DocumentCommercial) => {
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: doc.type,
          client_id: doc.client_id,
          client_nom: doc.client_nom,
          client_email: doc.client_email,
          client_adresse: doc.client_adresse,
          client_siren: doc.client_siren,
          lignes: doc.lignes,
          remise_percent: doc.remise_percent,
          acompte: doc.acompte,
          conditions_paiement: doc.conditions_paiement,
          notes: doc.notes ? `Copie — ${doc.notes}` : `Copie de ${doc.numero ?? 'document'}`,
          validite_jours: doc.validite_jours,
        }),
      })
      const data = await res.json()
      if (data.success) { router.push(`/commercial/${data.document.id}`) }
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-5">
      {/* Barre d'actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par numéro, client…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNewMenu(!showNewMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau document
            <ChevronDown className="w-3 h-3" />
          </button>
          {showNewMenu && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.type}
                  onClick={() => { router.push(`/commercial/nouveau/${opt.type}`); setShowNewMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Onglets type */}
      <div className="flex gap-1 overflow-x-auto">
        {TYPE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">Aucun document</p>
          <p className="text-xs text-gray-500 mb-4">Créez votre premier devis, facture ou bon de commande</p>
          <button
            onClick={() => setShowNewMenu(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau document
          </button>
          <div className="mt-3">
            <a href="/api/seed/demo" className="text-sm text-emerald-500 underline cursor-pointer">
              &rarr; Charger des donnees de demonstration
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Numéro</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Client</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">TTC</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <button
                      onClick={() => router.push(`/commercial/${doc.id}`)}
                      className="font-mono text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      {doc.numero ?? '—'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                      {TYPE_LABELS[doc.type]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 max-w-[180px] truncate">
                    {doc.client_nom ?? '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm font-semibold text-gray-900">
                    {doc.total_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_COLORS[doc.statut] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUT_LABELS[doc.statut] ?? doc.statut}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-gray-500">
                    {new Date(doc.date_emission).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => router.push(`/commercial/${doc.id}`)} title="Voir"
                        className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => router.push(`/commercial/${doc.id}/modifier`)} title="Modifier"
                        className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => void handleSend(doc)} title="Envoyer"
                        disabled={sendingId === doc.id || !doc.client_email}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-30">
                        {sendingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                      <button onClick={() => void handleDuplicate(doc)} title="Dupliquer"
                        className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={() => void handleDelete(doc.id)} title="Annuler"
                        disabled={deletingId === doc.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50">
                        {deletingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
