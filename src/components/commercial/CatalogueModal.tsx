'use client'

import { useState, useEffect } from 'react'
import { X, Search, Plus, Package, Loader2 } from 'lucide-react'
import type { CatalogueProduit, LigneFacture } from '@/types'

interface CatalogueModalProps {
  open: boolean
  onClose: () => void
  onSelect: (ligne: LigneFacture) => void
}

export function CatalogueModal({ open, onClose, onSelect }: CatalogueModalProps) {
  const [produits, setProduits] = useState<CatalogueProduit[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newProduit, setNewProduit] = useState({ nom: '', prix_ht: '', tva_taux: '20', unite: 'unité' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/catalogue?search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => { if (d.success) setProduits(d.produits ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, search])

  const handleSelect = (p: CatalogueProduit) => {
    onSelect({
      description: p.nom + (p.description ? ` — ${p.description}` : ''),
      quantite: 1,
      prix_unitaire_ht: p.prix_ht,
      taux_tva: (p.tva_taux as 0 | 5.5 | 10 | 20) ?? 20,
    })
    onClose()
  }

  const handleCreate = async () => {
    if (!newProduit.nom.trim() || !newProduit.prix_ht) return
    setSaving(true)
    try {
      const res = await fetch('/api/catalogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: newProduit.nom,
          prix_ht: parseFloat(newProduit.prix_ht),
          tva_taux: parseFloat(newProduit.tva_taux),
          unite: newProduit.unite,
        }),
      })
      const data = await res.json()
      if (data.success) {
        handleSelect(data.produit)
      }
    } catch { /* silent */ } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-gray-900">Catalogue produits</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un produit ou service…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          {/* Product list */}
          <div className="max-h-60 overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : produits.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">
                {search ? 'Aucun produit trouvé' : 'Votre catalogue est vide'}
              </p>
            ) : (
              produits.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-emerald-50 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.nom}</p>
                    {p.reference && <p className="text-xs text-gray-400">Réf. {p.reference}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {p.prix_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </p>
                    <p className="text-xs text-gray-400">HT · TVA {p.tva_taux}%</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Create new */}
          {creating ? (
            <div className="border border-dashed border-emerald-300 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Nouveau produit</p>
              <input
                type="text"
                value={newProduit.nom}
                onChange={e => setNewProduit(p => ({ ...p, nom: e.target.value }))}
                placeholder="Nom du produit / service"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newProduit.prix_ht}
                  onChange={e => setNewProduit(p => ({ ...p, prix_ht: e.target.value }))}
                  placeholder="Prix HT"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <select
                  value={newProduit.tva_taux}
                  onChange={e => setNewProduit(p => ({ ...p, tva_taux: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="0">0%</option>
                  <option value="5.5">5.5%</option>
                  <option value="10">10%</option>
                  <option value="20">20%</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={saving || !newProduit.nom.trim() || !newProduit.prix_ht}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Créer et ajouter'}
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 text-gray-600 rounded-lg text-sm hover:border-emerald-400 hover:text-emerald-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Créer un nouveau produit
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
