'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout'
import { Package, Plus, Search, Edit2, Trash2, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import type { CatalogueProduit } from '@/types'

export default function CataloguePage() {
  const [produits, setProduits] = useState<CatalogueProduit[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [includeInactif, setIncludeInactif] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    reference: '',
    nom: '',
    description: '',
    prix_ht: '',
    tva_taux: '20',
    unite: 'unité',
    categorie: '',
  })

  const fetchProduits = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (includeInactif) params.set('include_inactif', '1')
      const res = await fetch(`/api/catalogue?${params}`)
      const data = await res.json()
      if (data.success) setProduits(data.produits ?? [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [search, includeInactif])

  useEffect(() => { void fetchProduits() }, [fetchProduits])

  const resetForm = () => {
    setForm({ reference: '', nom: '', description: '', prix_ht: '', tva_taux: '20', unite: 'unité', categorie: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (p: CatalogueProduit) => {
    setForm({
      reference: p.reference ?? '',
      nom: p.nom,
      description: p.description ?? '',
      prix_ht: String(p.prix_ht),
      tva_taux: String(p.tva_taux ?? 20),
      unite: p.unite ?? 'unité',
      categorie: p.categorie ?? '',
    })
    setEditingId(p.id)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.nom.trim()) return
    setSaving(true)
    try {
      const body = {
        ...form,
        prix_ht: parseFloat(form.prix_ht) || 0,
        tva_taux: parseFloat(form.tva_taux) || 20,
      }
      const res = editingId
        ? await fetch(`/api/catalogue/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/catalogue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) { resetForm(); await fetchProduits() }
    } catch { /* silent */ } finally { setSaving(false) }
  }

  const handleToggleActif = async (p: CatalogueProduit) => {
    try {
      await fetch(`/api/catalogue/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !p.actif }),
      })
      await fetchProduits()
    } catch { /* silent */ }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Désactiver ce produit ?')) return
    try {
      await fetch(`/api/catalogue/${id}`, { method: 'DELETE' })
      await fetchProduits()
    } catch { /* silent */ }
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-emerald-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Catalogue produits</h1>
              <p className="text-sm text-gray-500 mt-0.5">Gérez vos produits et services récurrents</p>
            </div>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Nouveau produit
          </button>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-emerald-200 p-5 mb-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">{editingId ? 'Modifier le produit' : 'Nouveau produit'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Nom *" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input placeholder="Référence" value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input placeholder="Catégorie" value={form.categorie} onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              <input type="number" placeholder="Prix HT *" value={form.prix_ht} onChange={e => setForm(p => ({ ...p, prix_ht: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <div className="flex gap-2">
                <select value={form.tva_taux} onChange={e => setForm(p => ({ ...p, tva_taux: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {[0, 5.5, 10, 20].map(t => <option key={t} value={t}>TVA {t}%</option>)}
                </select>
                <input placeholder="Unité" value={form.unite} onChange={e => setForm(p => ({ ...p, unite: e.target.value }))}
                  className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => void handleSubmit()} disabled={saving || !form.nom.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Enregistrer' : 'Créer'}
              </button>
              <button onClick={resetForm}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={includeInactif} onChange={e => setIncludeInactif(e.target.checked)}
              className="rounded" />
            Voir inactifs
          </label>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : produits.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">Aucun produit</p>
            <p className="text-xs text-gray-500">Creez votre premier produit ou service</p>
            <div className="mt-3">
              <a href="/api/seed/demo" className="text-sm text-emerald-500 underline cursor-pointer">
                &rarr; Charger des donnees de demonstration
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Référence</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Catégorie</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Prix HT</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">TVA</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Unité</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actif</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {produits.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.actif ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.nom}</p>
                      {p.description && <p className="text-xs text-gray-500 truncate max-w-[200px]">{p.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.reference ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.categorie ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {p.prix_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{p.tva_taux ?? 20}%</td>
                    <td className="px-4 py-3 text-center text-gray-600">{p.unite ?? 'unité'}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => void handleToggleActif(p)} title={p.actif ? 'Désactiver' : 'Activer'}>
                        {p.actif
                          ? <ToggleRight className="w-5 h-5 text-emerald-600 mx-auto" />
                          : <ToggleLeft className="w-5 h-5 text-gray-400 mx-auto" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => handleEdit(p)} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => void handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
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
    </AppShell>
  )
}
