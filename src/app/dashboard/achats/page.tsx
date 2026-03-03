'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout'
import { Card } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useUserPlan } from '@/hooks/useUserPlan'
import { createClient } from '@/lib/supabase/client'
import {
  ShoppingCart, Plus, AlertCircle, CheckCircle2, X, Clock,
  ChevronDown, Settings,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type DAStatut = 'brouillon' | 'en_attente' | 'approuve' | 'bc_emis' | 'receptionne' | 'facture' | 'cloture' | 'refuse'

interface DemandeAchat {
  id: string
  numero_da: string
  fournisseur_nom: string | null
  description: string
  montant_estime: number
  statut: DAStatut
  demandeur_nom: string | null
  approbateur_nom: string | null
  date_demande: string
  date_approbation: string | null
  motif_refus: string | null
  created_at: string
}

interface SeuilApprobation {
  id: string
  montant_min: number
  montant_max: number | null
  approbateur_nom: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<DAStatut, { label: string; color: string }> = {
  brouillon:    { label: 'Brouillon',     color: 'bg-gray-100 text-gray-600' },
  en_attente:   { label: 'En attente',    color: 'bg-amber-100 text-amber-700' },
  approuve:     { label: 'Approuvé',      color: 'bg-blue-100 text-blue-700' },
  bc_emis:      { label: 'BC émis',       color: 'bg-indigo-100 text-indigo-700' },
  receptionne:  { label: 'Réceptionné',   color: 'bg-cyan-100 text-cyan-700' },
  facture:      { label: 'Facturé',       color: 'bg-purple-100 text-purple-700' },
  cloture:      { label: 'Clôturé',       color: 'bg-emerald-100 text-emerald-700' },
  refuse:       { label: 'Refusé',        color: 'bg-red-100 text-red-700' },
}

const STATUT_FLOW: DAStatut[] = ['brouillon', 'en_attente', 'approuve', 'bc_emis', 'receptionne', 'facture', 'cloture']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function generateNumeroDa(userId: string, supabase: ReturnType<typeof createClient>): Promise<string> {
  const year = new Date().getFullYear()
  const { data } = await supabase
    .from('demandes_achat')
    .select('numero_da')
    .eq('user_id', userId)
    .ilike('numero_da', `DA-${year}-%`)
  const n = (data?.length ?? 0) + 1
  return `DA-${year}-${String(n).padStart(3, '0')}`
}

// ─── Plan banner ──────────────────────────────────────────────────────────────

function PlanRequiredBanner({ required, current }: { required: string; current: string }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-800">
          Cette fonctionnalité est disponible à partir du plan {required}.
        </p>
        <p className="text-xs text-amber-600 mt-0.5">Votre plan actuel : {current}</p>
      </div>
      <Link href="/#pricing" className="px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors">
        Mettre à niveau →
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AchatsPage() {
  const { user } = useAuth()
  const { plan, loading: planLoading } = useUserPlan()
  const [demandes, setDemandes] = useState<DemandeAchat[]>([])
  const [seuils, setSeuils] = useState<SeuilApprobation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showSeuils, setShowSeuils] = useState(false)
  const [filterStatut, setFilterStatut] = useState<DAStatut | 'tous'>('tous')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [form, setForm] = useState({
    fournisseur_nom: '', description: '', montant_estime: '', demandeur_nom: '',
  })
  const [seuilForm, setSeuilForm] = useState({ montant_min: '', montant_max: '', approbateur_nom: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    void (async () => {
      const [daRes, seuilRes] = await Promise.all([
        supabase.from('demandes_achat').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('seuils_approbation').select('*').eq('user_id', user.id).order('montant_min'),
      ])
      setDemandes((daRes.data ?? []) as DemandeAchat[])
      setSeuils((seuilRes.data ?? []) as SeuilApprobation[])
      setLoading(false)
    })()
  }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    const supabase = createClient()
    const numero = await generateNumeroDa(user.id, supabase)
    const montant = parseFloat(form.montant_estime)

    // Check seuils to auto-approve or route to approver
    const seuil = seuils.find(s => montant >= s.montant_min && (s.montant_max == null || montant <= s.montant_max))
    const statut: DAStatut = seuil?.approbateur_nom === 'auto' ? 'approuve' : 'en_attente'

    const { data } = await supabase.from('demandes_achat').insert({
      user_id: user.id,
      numero_da: numero,
      fournisseur_nom: form.fournisseur_nom || null,
      description: form.description,
      montant_estime: montant,
      statut,
      demandeur_nom: form.demandeur_nom || null,
      approbateur_nom: seuil?.approbateur_nom ?? null,
      date_demande: new Date().toISOString().split('T')[0],
    }).select().single()

    if (data) {
      setDemandes(prev => [data as DemandeAchat, ...prev])
      setShowAdd(false)
      setForm({ fournisseur_nom: '', description: '', montant_estime: '', demandeur_nom: '' })
    }
    setSubmitting(false)
  }

  const handleAddSeuil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase.from('seuils_approbation').insert({
      user_id: user.id,
      montant_min: parseFloat(seuilForm.montant_min),
      montant_max: seuilForm.montant_max ? parseFloat(seuilForm.montant_max) : null,
      approbateur_nom: seuilForm.approbateur_nom,
    }).select().single()
    if (data) {
      setSeuils(prev => [...prev, data as SeuilApprobation].sort((a, b) => a.montant_min - b.montant_min))
      setSeuilForm({ montant_min: '', montant_max: '', approbateur_nom: '' })
    }
  }

  const handleDeleteSeuil = async (id: string) => {
    const supabase = createClient()
    await supabase.from('seuils_approbation').delete().eq('id', id)
    setSeuils(prev => prev.filter(s => s.id !== id))
  }

  const handleUpdateStatut = async (id: string, newStatut: DAStatut) => {
    const supabase = createClient()
    const updates: Partial<DemandeAchat> = { statut: newStatut }
    if (newStatut === 'approuve') updates.date_approbation = new Date().toISOString().split('T')[0]
    await supabase.from('demandes_achat').update(updates).eq('id', id)
    setDemandes(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
  }

  const filtered = filterStatut === 'tous' ? demandes : demandes.filter(d => d.statut === filterStatut)

  const isEssentielPlus = plan === 'cabinet' || plan === 'pro'

  if (planLoading) return null

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Module Achats</h1>
            <p className="text-sm text-navy-500 mt-1">Demandes d&apos;achat, approbations et suivi fournisseurs</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSeuils(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-slate-600">
              <Settings className="w-3.5 h-3.5" />Circuits d&apos;approbation
            </button>
            <button onClick={() => setShowAdd(true)} disabled={!isEssentielPlus}
              className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium">
              <Plus className="w-4 h-4" />Nouvelle demande
            </button>
          </div>
        </div>

        {!isEssentielPlus && (
          <PlanRequiredBanner required="Essentiel" current="Starter" />
        )}

        {/* ── KPIs ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {([
            { label: 'Total demandes', value: String(demandes.length), icon: ShoppingCart, color: 'bg-blue-500' },
            { label: 'En attente', value: String(demandes.filter(d => d.statut === 'en_attente').length), icon: Clock, color: 'bg-amber-500' },
            { label: 'Approuvées', value: String(demandes.filter(d => d.statut === 'approuve').length), icon: CheckCircle2, color: 'bg-emerald-500' },
            { label: 'Montant total', value: formatCurrency(demandes.reduce((s, d) => s + d.montant_estime, 0)), icon: ShoppingCart, color: 'bg-purple-500' },
          ] as const).map((kpi, i) => (
            <div key={i} className="rounded-xl border border-navy-100 bg-white p-4 relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${kpi.color} rounded-l-xl`} />
              <p className="text-xs font-medium text-navy-500 uppercase tracking-wide mb-1">{kpi.label}</p>
              <p className="text-xl font-bold text-navy-900">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filtres ──────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setFilterStatut('tous')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filterStatut === 'tous' ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-600 border-gray-200 hover:border-navy-300'}`}>
            Toutes ({demandes.length})
          </button>
          {Object.entries(STATUT_CONFIG).map(([key, cfg]) => {
            const count = demandes.filter(d => d.statut === key).length
            if (count === 0) return null
            return (
              <button key={key} onClick={() => setFilterStatut(key as DAStatut)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filterStatut === key ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-600 border-gray-200 hover:border-navy-300'}`}>
                {cfg.label} ({count})
              </button>
            )
          })}
        </div>

        {/* ── Tableau des DA ───────────────────────────────────── */}
        <Card>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-navy-50 animate-pulse rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-10 h-10 text-navy-200 mx-auto mb-3" />
              <p className="text-sm text-navy-400">Aucune demande d&apos;achat</p>
              <button onClick={() => setShowAdd(true)} disabled={!isEssentielPlus}
                className="mt-3 text-xs text-emerald-600 hover:underline disabled:opacity-50">
                Creer la premiere &rarr;
              </button>
              <div className="mt-2">
                <a href="/api/seed/demo" className="text-sm text-emerald-500 underline cursor-pointer">
                  &rarr; Charger des donnees de demonstration
                </a>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-navy-400 border-b border-navy-100">
                    <th className="text-left pb-2 pr-4">N° DA</th>
                    <th className="text-left pb-2 pr-4">Description</th>
                    <th className="text-left pb-2 pr-4">Fournisseur</th>
                    <th className="text-right pb-2 pr-4">Montant estimé</th>
                    <th className="text-left pb-2 pr-4">Statut</th>
                    <th className="text-left pb-2 pr-4">Demandeur</th>
                    <th className="text-left pb-2 pr-4">Date</th>
                    <th className="pb-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {filtered.map(da => {
                    const cfg = STATUT_CONFIG[da.statut]
                    const isExpanded = expandedId === da.id
                    const currentIdx = STATUT_FLOW.indexOf(da.statut)
                    const canAdvance = currentIdx >= 0 && currentIdx < STATUT_FLOW.length - 1
                    const nextStatut = canAdvance ? STATUT_FLOW[currentIdx + 1] : null

                    return (
                      <tr key={da.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="py-3 pr-4 font-mono text-xs font-semibold text-navy-700">{da.numero_da}</td>
                        <td className="py-3 pr-4 text-navy-800 max-w-[200px] truncate">{da.description}</td>
                        <td className="py-3 pr-4 text-navy-500 text-xs">{da.fournisseur_nom ?? '—'}</td>
                        <td className="py-3 pr-4 text-right font-mono font-semibold text-navy-900">{formatCurrency(da.montant_estime)}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-navy-500 text-xs">{da.demandeur_nom ?? '—'}</td>
                        <td className="py-3 pr-4 text-navy-500 text-xs">{formatDate(da.date_demande)}</td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {nextStatut && da.statut !== 'refuse' && (
                              <button onClick={() => void handleUpdateStatut(da.id, nextStatut)}
                                title={`Passer à: ${STATUT_CONFIG[nextStatut].label}`}
                                className="px-2 py-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                                → {STATUT_CONFIG[nextStatut].label}
                              </button>
                            )}
                            {da.statut === 'en_attente' && (
                              <button onClick={() => void handleUpdateStatut(da.id, 'refuse')}
                                className="p-1 text-gray-300 hover:text-red-400 transition-colors" title="Refuser">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => setExpandedId(isExpanded ? null : da.id)}
                              className="p-1 text-navy-300 hover:text-navy-600 transition-colors">
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ── MODAL NOUVELLE DA ─────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-navy-900 mb-4">Nouvelle demande d&apos;achat</h3>
            <form onSubmit={e => void handleAdd(e)} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-navy-700 mb-1 block">Description *</label>
                <textarea required value={form.description} rows={2}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Objet de la demande…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-navy-700 mb-1 block">Fournisseur</label>
                  <input value={form.fournisseur_nom}
                    onChange={e => setForm(p => ({ ...p, fournisseur_nom: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-navy-700 mb-1 block">Montant estimé HT (€) *</label>
                  <input required type="number" min="0" step="0.01" value={form.montant_estime}
                    onChange={e => setForm(p => ({ ...p, montant_estime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-navy-700 mb-1 block">Demandeur</label>
                <input value={form.demandeur_nom}
                  onChange={e => setForm(p => ({ ...p, demandeur_nom: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              {form.montant_estime && seuils.length > 0 && (
                <div className="text-xs bg-blue-50 rounded-xl p-3 text-blue-700">
                  {(() => {
                    const m = parseFloat(form.montant_estime)
                    const s = seuils.find(s => m >= s.montant_min && (s.montant_max == null || m <= s.montant_max))
                    if (!s) return 'Aucun circuit d\'approbation applicable'
                    if (s.approbateur_nom === 'auto') return '✅ Montant sous le seuil → auto-approuvé'
                    return `📋 Approbation requise par : ${s.approbateur_nom}`
                  })()}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-navy-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50">
                  {submitting ? 'Envoi…' : 'Soumettre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CIRCUITS D'APPROBATION ──────────────────────── */}
      {showSeuils && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-navy-900">Circuits d&apos;approbation</h3>
              <button onClick={() => setShowSeuils(false)} className="text-navy-400 hover:text-navy-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-navy-500 mb-4">
              Définissez les seuils de montant et les approbateurs correspondants.
              Utilisez &quot;auto&quot; comme approbateur pour l&apos;auto-approbation.
            </p>

            <div className="space-y-2 mb-4">
              {seuils.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="text-sm">
                    <span className="font-mono text-navy-700">{formatCurrency(s.montant_min)}</span>
                    {' '}—{' '}
                    <span className="font-mono text-navy-700">{s.montant_max ? formatCurrency(s.montant_max) : '∞'}</span>
                    <span className="ml-3 text-navy-500">→ <strong>{s.approbateur_nom}</strong></span>
                  </div>
                  <button onClick={() => void handleDeleteSeuil(s.id)} className="text-gray-300 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={e => void handleAddSeuil(e)} className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-navy-600 mb-1 block">Min (€) *</label>
                <input required type="number" min="0" value={seuilForm.montant_min}
                  onChange={e => setSeuilForm(p => ({ ...p, montant_min: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-xs text-navy-600 mb-1 block">Max (€)</label>
                <input type="number" min="0" value={seuilForm.montant_max}
                  onChange={e => setSeuilForm(p => ({ ...p, montant_max: e.target.value }))}
                  placeholder="illimité"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-xs text-navy-600 mb-1 block">Approbateur *</label>
                <input required value={seuilForm.approbateur_nom}
                  onChange={e => setSeuilForm(p => ({ ...p, approbateur_nom: e.target.value }))}
                  placeholder="Nom ou 'auto'"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div className="col-span-3 flex justify-end">
                <button type="submit"
                  className="px-4 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600">
                  Ajouter le seuil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
