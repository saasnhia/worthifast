'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useFacturesClients } from '@/hooks/useFacturesClients'
import type { FactureClient, StatutPaiement } from '@/types'
import { Plus, Printer, Pencil, Copy, Trash2, Search, Loader2 } from 'lucide-react'

const STATUT_LABELS: Record<StatutPaiement, string> = {
  en_attente: 'En attente',
  payee: 'Payée',
  en_retard: 'En retard',
  partiellement_payee: 'Partielle',
}

const STATUT_COLORS: Record<StatutPaiement, string> = {
  en_attente: 'bg-amber-100 text-amber-800',
  payee: 'bg-emerald-100 text-emerald-800',
  en_retard: 'bg-red-100 text-red-800',
  partiellement_payee: 'bg-blue-100 text-blue-800',
}

export function FacturesClientsList() {
  const router = useRouter()
  const { factures, loading, error, filters, setFilters, deleteFacture } = useFacturesClients()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const handleSearch = (val: string) => {
    setSearch(val)
    setFilters({ ...filters, search: val || undefined })
  }

  const handleStatutFilter = (val: string) => {
    setFilters({ ...filters, statut: val || undefined })
  }

  const handleDelete = async (f: FactureClient) => {
    if (!confirm(`Supprimer la facture ${f.numero_facture} ?`)) return
    setDeletingId(f.id)
    try {
      await deleteFacture(f.id)
    } catch {
      alert('Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDuplicate = (f: FactureClient) => {
    const params = new URLSearchParams({ from: f.id })
    router.push(`/factures/nouvelle?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Rechercher..."
              className="pl-9 pr-4 py-2 bg-white border-2 border-navy-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-emerald-500 w-52"
            />
          </div>

          {/* Statut filter */}
          <select
            onChange={(e) => handleStatutFilter(e.target.value)}
            className="px-3 py-2 bg-white border-2 border-navy-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="payee">Payée</option>
            <option value="en_retard">En retard</option>
            <option value="partiellement_payee">Partielle</option>
          </select>
        </div>

        <Button
          onClick={() => router.push('/factures/nouvelle')}
          icon={<Plus className="w-4 h-4" />}
        >
          Nouvelle facture
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      ) : factures.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-navy-500 mb-4">Aucune facture client</p>
          <Button onClick={() => router.push('/factures/nouvelle')} icon={<Plus className="w-4 h-4" />}>
            Créer votre première facture
          </Button>
        </Card>
      ) : (
        <Card padding="none">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1.5fr_2fr_1.5fr_1.5fr_1.5fr_auto] gap-4 px-6 py-3 bg-navy-50 text-xs font-medium text-navy-500 uppercase tracking-wide border-b border-navy-100">
            <span>N° Facture</span>
            <span>Client</span>
            <span>Montant TTC</span>
            <span>Échéance</span>
            <span>Statut</span>
            <span></span>
          </div>

          <div className="divide-y divide-navy-100">
            {factures.map((f) => (
              <div
                key={f.id}
                className="px-6 py-4 grid md:grid-cols-[1.5fr_2fr_1.5fr_1.5fr_1.5fr_auto] grid-cols-1 gap-4 items-center hover:bg-navy-50 transition-colors"
              >
                <span
                  className="font-mono text-sm text-emerald-700 font-medium cursor-pointer hover:underline"
                  onClick={() => router.push(`/factures/${f.id}`)}
                >
                  {f.numero_facture}
                </span>
                <span className="text-sm text-navy-900">{f.client?.nom ?? '—'}</span>
                <span className="font-mono text-sm font-semibold text-navy-900">
                  {f.montant_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </span>
                <span className="text-sm text-navy-600">
                  {new Date(f.date_echeance).toLocaleDateString('fr-FR')}
                </span>
                <span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[f.statut_paiement]}`}>
                    {STATUT_LABELS[f.statut_paiement]}
                  </span>
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => router.push(`/factures/${f.id}`)}
                    className="p-1.5 text-navy-400 hover:text-navy-700 transition-colors"
                    title="Voir"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/factures/${f.id}/modifier`)}
                    className="p-1.5 text-navy-400 hover:text-navy-700 transition-colors"
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(f)}
                    className="p-1.5 text-navy-400 hover:text-navy-700 transition-colors"
                    title="Dupliquer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(f)}
                    disabled={deletingId === f.id}
                    className="p-1.5 text-navy-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                    title="Supprimer"
                  >
                    {deletingId === f.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
