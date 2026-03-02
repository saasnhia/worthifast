'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { calculTotaux } from '@/lib/factures/calculs'
import type { Client, FactureClient, LigneFacture } from '@/types'
import { Plus, Trash2, Printer } from 'lucide-react'

interface Props {
  mode: 'create' | 'edit'
  factureId?: string
  onSave?: (f: FactureClient) => void
}

const TVA_OPTIONS: Array<{ label: string; value: LigneFacture['taux_tva'] }> = [
  { label: '0%', value: 0 },
  { label: '5,5%', value: 5.5 },
  { label: '10%', value: 10 },
  { label: '20%', value: 20 },
]

const defaultLigne = (): LigneFacture => ({
  description: '',
  quantite: 1,
  prix_unitaire_ht: 0,
  taux_tva: 20,
})

const todayISO = () => new Date().toISOString().split('T')[0]
const in30Days = () => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]
}

export function FactureClientForm({ mode, factureId, onSave }: Props) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(mode === 'edit')
  const [globalError, setGlobalError] = useState<string | null>(null)

  // Form state
  const [clientId, setClientId] = useState('')
  const [objet, setObjet] = useState('')
  const [dateEmission, setDateEmission] = useState(todayISO())
  const [dateEcheance, setDateEcheance] = useState(in30Days())
  const [conditionsPaiement, setConditionsPaiement] = useState('30 jours')
  const [remisePct, setRemisePct] = useState(0)
  const [notes, setNotes] = useState('')
  const [lignes, setLignes] = useState<LigneFacture[]>([defaultLigne()])

  // Load clients
  useEffect(() => {
    fetch('/api/notifications/clients')
      .then((r) => r.json())
      .then((d) => { if (d.success) setClients(d.clients ?? []) })
      .catch(() => {/* silent */})
  }, [])

  // Load existing facture in edit mode
  useEffect(() => {
    if (mode !== 'edit' || !factureId) return
    fetch(`/api/factures/clients/${factureId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.facture) {
          const f: FactureClient = d.facture
          setClientId(f.client_id)
          setObjet(f.objet ?? '')
          setDateEmission(f.date_emission)
          setDateEcheance(f.date_echeance)
          setConditionsPaiement(f.conditions_paiement ?? '30 jours')
          setRemisePct(f.remise_percent ?? 0)
          setNotes(f.notes ?? '')
          setLignes(f.lignes?.length ? f.lignes : [defaultLigne()])
        }
      })
      .catch(() => {/* silent */})
      .finally(() => setLoadingData(false))
  }, [mode, factureId])

  const totaux = calculTotaux(lignes, remisePct)

  const updateLigne = useCallback(
    (idx: number, field: keyof LigneFacture, value: string | number) => {
      setLignes((prev) =>
        prev.map((l, i) =>
          i === idx
            ? { ...l, [field]: field === 'description' ? value : Number(value) }
            : l
        )
      )
    },
    []
  )

  const addLigne = useCallback(() => setLignes((prev) => [...prev, defaultLigne()]), [])
  const removeLigne = useCallback(
    (idx: number) => setLignes((prev) => prev.filter((_, i) => i !== idx)),
    []
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) { setGlobalError('Veuillez sélectionner un client'); return }
    if (!dateEcheance) { setGlobalError("Date d'échéance requise"); return }

    setSaving(true)
    setGlobalError(null)

    const payload = {
      client_id: clientId,
      objet,
      montant_ht: totaux.totalHTApresRemise,
      tva: totaux.totalTVA,
      montant_ttc: totaux.totalTTC,
      date_emission: dateEmission,
      date_echeance: dateEcheance,
      notes,
      lignes,
      conditions_paiement: conditionsPaiement,
      remise_percent: remisePct,
    }

    try {
      const res = await fetch(
        mode === 'create' ? '/api/factures/clients' : `/api/factures/clients/${factureId}`,
        {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Erreur')
      onSave?.(data.facture)
      router.push(`/factures/${data.facture.id}`)
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {globalError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {globalError}
        </div>
      )}

      {/* En-tête */}
      <Card>
        <h2 className="text-base font-semibold text-navy-900 mb-4">En-tête</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">
              Date d&apos;émission
            </label>
            <input
              type="date"
              value={dateEmission}
              onChange={(e) => setDateEmission(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border-2 border-navy-200 rounded-xl text-navy-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">
              Date d&apos;échéance <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dateEcheance}
              onChange={(e) => setDateEcheance(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-white border-2 border-navy-200 rounded-xl text-navy-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">
              Conditions de paiement
            </label>
            <select
              value={conditionsPaiement}
              onChange={(e) => setConditionsPaiement(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border-2 border-navy-200 rounded-xl text-navy-900 focus:outline-none focus:border-emerald-500"
            >
              <option>Comptant</option>
              <option>30 jours</option>
              <option>45 jours</option>
              <option>60 jours</option>
              <option>Fin de mois</option>
            </select>
          </div>
          <Input
            label="Objet / Référence"
            value={objet}
            onChange={(e) => setObjet(e.target.value)}
            placeholder="Ex: Prestation de conseil mars 2026"
          />
        </div>
      </Card>

      {/* Client */}
      <Card>
        <h2 className="text-base font-semibold text-navy-900 mb-4">
          Client <span className="text-red-500">*</span>
        </h2>
        {clients.length === 0 ? (
          <p className="text-sm text-navy-500">
            Aucun client.{' '}
            <a href="/notifications" className="text-emerald-600 underline">
              Créer un client
            </a>
          </p>
        ) : (
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-white border-2 border-navy-200 rounded-xl text-navy-900 focus:outline-none focus:border-emerald-500"
          >
            <option value="">— Sélectionner un client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        )}
      </Card>

      {/* Lignes */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-navy-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy-900">Lignes</h2>
          <Button type="button" variant="outline" size="sm" onClick={addLigne} icon={<Plus className="w-4 h-4" />}>
            Ajouter une ligne
          </Button>
        </div>

        {/* Headers — desktop */}
        <div className="hidden md:grid grid-cols-[3fr_1fr_1.5fr_1fr_1fr_auto] gap-3 px-6 py-3 bg-navy-50 text-xs font-medium text-navy-500 uppercase tracking-wide border-b border-navy-100">
          <span>Description</span>
          <span>Qté</span>
          <span>Prix HT</span>
          <span>TVA</span>
          <span>Total HT</span>
          <span></span>
        </div>

        <div className="divide-y divide-navy-100">
          {lignes.map((ligne, idx) => {
            const totalHT = ligne.quantite * ligne.prix_unitaire_ht
            return (
              <div key={idx} className="px-4 py-3 grid md:grid-cols-[3fr_1fr_1.5fr_1fr_1fr_auto] grid-cols-1 gap-3 items-center">
                <input
                  value={ligne.description}
                  onChange={(e) => updateLigne(idx, 'description', e.target.value)}
                  placeholder="Description du service / produit"
                  className="w-full px-3 py-2 bg-white border border-navy-200 rounded-lg text-sm text-navy-900 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ligne.quantite}
                  onChange={(e) => updateLigne(idx, 'quantite', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-navy-200 rounded-lg text-sm text-navy-900 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ligne.prix_unitaire_ht}
                  onChange={(e) => updateLigne(idx, 'prix_unitaire_ht', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-navy-200 rounded-lg text-sm text-navy-900 focus:outline-none focus:border-emerald-500"
                />
                <select
                  value={ligne.taux_tva}
                  onChange={(e) => updateLigne(idx, 'taux_tva', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-navy-200 rounded-lg text-sm text-navy-900 focus:outline-none focus:border-emerald-500"
                >
                  {TVA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="text-sm font-mono text-navy-900 text-right">
                  {totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </span>
                <button
                  type="button"
                  onClick={() => removeLigne(idx)}
                  disabled={lignes.length === 1}
                  className="p-1.5 text-navy-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Totaux */}
      <Card>
        <div className="flex flex-col gap-3 max-w-xs ml-auto">
          <div className="flex justify-between text-sm">
            <span className="text-navy-500">Total HT</span>
            <span className="font-mono text-navy-900">
              {totaux.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-navy-500 whitespace-nowrap">Remise</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={remisePct}
              onChange={(e) => setRemisePct(Number(e.target.value))}
              className="w-20 px-2 py-1 bg-white border border-navy-200 rounded-lg text-sm text-navy-900 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-sm text-navy-400">%</span>
            {remisePct > 0 && (
              <span className="ml-auto font-mono text-sm text-red-500">
                -{totaux.remiseAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </span>
            )}
          </div>

          {remisePct > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-navy-500">HT après remise</span>
              <span className="font-mono text-navy-900">
                {totaux.totalHTApresRemise.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </span>
            </div>
          )}

          {Object.entries(totaux.tvaParTaux).map(([taux, montant]) =>
            montant > 0 ? (
              <div key={taux} className="flex justify-between text-sm">
                <span className="text-navy-500">TVA {taux}%</span>
                <span className="font-mono text-navy-900">
                  {montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </span>
              </div>
            ) : null
          )}

          <div className="border-t border-navy-200 pt-3 flex justify-between font-semibold">
            <span className="text-navy-900">Total TTC</span>
            <span className="font-mono text-emerald-600 text-lg">
              {totaux.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </span>
          </div>
        </div>
      </Card>

      {/* Notes */}
      <Card>
        <h2 className="text-base font-semibold text-navy-900 mb-4">Notes &amp; mentions</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notes internes, mentions légales additionnelles..."
          className="w-full px-4 py-2.5 bg-white border-2 border-navy-200 rounded-xl text-navy-900 text-sm focus:outline-none focus:border-emerald-500 resize-none"
        />
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Annuler
        </Button>
        {mode === 'edit' && factureId && (
          <Button
            type="button"
            variant="outline"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.open(`/factures/${factureId}/print`, '_blank')}
          >
            Aperçu
          </Button>
        )}
        <Button type="submit" loading={saving}>
          {mode === 'create' ? 'Créer la facture' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
