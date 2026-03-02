'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Loader2, ToggleLeft, ToggleRight, Calendar } from 'lucide-react'
import type { AbonnementRecurrent, LigneFacture } from '@/types'
import { calculTotaux } from '@/lib/factures/calculs'

const FREQUENCE_LABELS: Record<string, string> = {
  hebdo: 'Hebdomadaire',
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  annuel: 'Annuel',
}

export function AbonnementsRecurrents() {
  const [abonnements, setAbonnements] = useState<AbonnementRecurrent[]>([])
  const [loading, setLoading] = useState(true)
  const [facturantId, setFacturantId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newAbon, setNewAbon] = useState({
    nom: '',
    client_nom: '',
    client_email: '',
    frequence: 'mensuel',
    prochaine_facturation: new Date().toISOString().split('T')[0],
    lignes: [{ description: '', quantite: 1, prix_unitaire_ht: 0, taux_tva: 20 }] as LigneFacture[],
  })
  const [saving, setSaving] = useState(false)

  const fetchAbonnements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/abonnements-recurrents')
      const data = await res.json()
      if (data.success) setAbonnements(data.abonnements ?? [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { void fetchAbonnements() }, [fetchAbonnements])

  const handleFacturer = async (id: string) => {
    setFacturantId(id)
    try {
      const res = await fetch(`/api/abonnements-recurrents/${id}/facturer`, { method: 'POST' })
      const data = await res.json()
      if (data.success) { await fetchAbonnements() }
    } catch { /* silent */ } finally { setFacturantId(null) }
  }

  const handleToggle = async (id: string, actif: boolean) => {
    setTogglingId(id)
    try {
      await fetch(`/api/abonnements-recurrents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !actif }),
      })
      await fetchAbonnements()
    } catch { /* silent */ } finally { setTogglingId(null) }
  }

  const handleCreate = async () => {
    if (!newAbon.nom.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/abonnements-recurrents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAbon),
      })
      const data = await res.json()
      if (data.success) {
        setShowCreate(false)
        setNewAbon({ nom: '', client_nom: '', client_email: '', frequence: 'mensuel', prochaine_facturation: new Date().toISOString().split('T')[0], lignes: [{ description: '', quantite: 1, prix_unitaire_ht: 0, taux_tva: 20 }] })
        await fetchAbonnements()
      }
    } catch { /* silent */ } finally { setSaving(false) }
  }

  const getDaysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.ceil(diff / 86400000)
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Abonnements récurrents</h2>
          <p className="text-xs text-gray-500 mt-0.5">Facturation automatique selon la fréquence définie</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvel abonnement
        </button>
      </div>

      {/* Formulaire création */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Nouvel abonnement</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nom de l'abonnement *" value={newAbon.nom} onChange={e => setNewAbon(p => ({ ...p, nom: e.target.value }))}
              className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <input placeholder="Nom du client" value={newAbon.client_nom} onChange={e => setNewAbon(p => ({ ...p, client_nom: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <input placeholder="Email du client" type="email" value={newAbon.client_email} onChange={e => setNewAbon(p => ({ ...p, client_email: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <select value={newAbon.frequence} onChange={e => setNewAbon(p => ({ ...p, frequence: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="hebdo">Hebdomadaire</option>
              <option value="mensuel">Mensuel</option>
              <option value="trimestriel">Trimestriel</option>
              <option value="annuel">Annuel</option>
            </select>
            <input type="date" value={newAbon.prochaine_facturation} onChange={e => setNewAbon(p => ({ ...p, prochaine_facturation: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <div className="col-span-2 space-y-2">
              <p className="text-xs font-medium text-gray-600">Ligne de facturation</p>
              <div className="flex gap-2">
                <input placeholder="Description" value={newAbon.lignes[0].description}
                  onChange={e => setNewAbon(p => ({ ...p, lignes: [{ ...p.lignes[0], description: e.target.value }] }))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="number" placeholder="PU HT" value={newAbon.lignes[0].prix_unitaire_ht || ''}
                  onChange={e => setNewAbon(p => ({ ...p, lignes: [{ ...p.lignes[0], prix_unitaire_ht: parseFloat(e.target.value) || 0 }] }))}
                  className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void handleCreate()} disabled={saving || !newAbon.nom.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {abonnements.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <RefreshCw className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">Aucun abonnement</p>
          <p className="text-xs text-gray-500">Automatisez votre facturation récurrente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {abonnements.map(ab => {
            const totaux = calculTotaux(ab.lignes, 0, 0)
            const daysUntil = getDaysUntil(ab.prochaine_facturation)

            return (
              <div key={ab.id} className={`bg-white rounded-2xl border p-5 flex items-center gap-4 ${ab.actif ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-semibold text-gray-900">{ab.nom}</p>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {FREQUENCE_LABELS[ab.frequence]}
                    </span>
                  </div>
                  {ab.client_nom && (
                    <p className="text-sm text-gray-500">{ab.client_nom}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm font-semibold text-emerald-700">
                      {totaux.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € TTC
                    </span>
                    {ab.actif && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${daysUntil <= 3 ? 'text-red-600' : daysUntil <= 7 ? 'text-amber-600' : 'text-gray-500'}`}>
                        <Calendar className="w-3 h-3" />
                        {daysUntil <= 0 ? 'À facturer maintenant' : `Prochaine dans ${daysUntil}j (${new Date(ab.prochaine_facturation).toLocaleDateString('fr-FR')})`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {ab.actif && (
                    <button
                      onClick={() => void handleFacturer(ab.id)}
                      disabled={facturantId === ab.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {facturantId === ab.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Facturer
                    </button>
                  )}
                  <button
                    onClick={() => void handleToggle(ab.id, ab.actif)}
                    disabled={togglingId === ab.id}
                    title={ab.actif ? 'Désactiver' : 'Activer'}
                    className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {togglingId === ab.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : ab.actif ? (
                      <ToggleRight className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
