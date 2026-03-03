'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout'
import { Card } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useUserPlan } from '@/hooks/useUserPlan'
import { createClient } from '@/lib/supabase/client'
import {
  Receipt, Plus, AlertCircle, Download, CheckCircle2, X, Clock,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type NoteStatut = 'brouillon' | 'en_attente' | 'valide' | 'rembourse' | 'refuse'

interface NoteFrais {
  id: string
  date_depense: string
  categorie: string
  description: string
  montant_ttc: number
  tva_recuperable: number
  montant_ht: number | null
  justificatif_url: string | null
  statut: NoteStatut
  kilometrage: number | null
  puissance_fiscale: number | null
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES_NDF = [
  'Repas', 'Transport', 'Hébergement', 'Carburant',
  'Indemnités kilométriques', 'Fournitures', 'Autre',
]

const BAREME_KM_2025: Record<number, number> = {
  5: 0.548,
  6: 0.574,
  7: 0.601,
}

const TAUX_TVA: Record<string, number> = {
  Repas: 10,
  Transport: 10,
  Hébergement: 10,
  Carburant: 20,
  Fournitures: 20,
  'Indemnités kilométriques': 0,
  Autre: 20,
}

const STATUT_CONFIG: Record<NoteStatut, { label: string; color: string; icon: React.ReactNode }> = {
  brouillon:    { label: 'Brouillon',     color: 'bg-gray-100 text-gray-600',     icon: <Clock className="w-3 h-3" /> },
  en_attente:   { label: 'En attente',    color: 'bg-amber-100 text-amber-700',   icon: <Clock className="w-3 h-3" /> },
  valide:       { label: 'Validé',        color: 'bg-blue-100 text-blue-700',     icon: <CheckCircle2 className="w-3 h-3" /> },
  rembourse:    { label: 'Remboursé',     color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  refuse:       { label: 'Refusé',        color: 'bg-red-100 text-red-700',       icon: <X className="w-3 h-3" /> },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function calcKm(km: number, cv: number): number {
  const taux = BAREME_KM_2025[Math.min(cv, 7)] ?? BAREME_KM_2025[7]
  return km * taux
}

function calcHT(ttc: number, cat: string): number {
  const tva = TAUX_TVA[cat] ?? 20
  if (tva === 0) return ttc
  return ttc / (1 + tva / 100)
}

function calcTVA(ttc: number, cat: string): number {
  return ttc - calcHT(ttc, cat)
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

export default function NotesDefraisPage() {
  const { user } = useAuth()
  const { plan, loading: planLoading } = useUserPlan()
  const [notes, setNotes] = useState<NoteFrais[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filterStatut, setFilterStatut] = useState<NoteStatut | 'tous'>('tous')
  const [filterMois, setFilterMois] = useState('')

  const [form, setForm] = useState({
    date_depense: new Date().toISOString().split('T')[0],
    categorie: 'Repas',
    description: '',
    montant_ttc: '',
    kilometrage: '',
    puissance_fiscale: '5',
  })

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    void (async () => {
      const { data } = await supabase
        .from('notes_frais')
        .select('*')
        .eq('user_id', user.id)
        .order('date_depense', { ascending: false })
      setNotes((data ?? []) as NoteFrais[])
      setLoading(false)
    })()
  }, [user])

  const isKm = form.categorie === 'Indemnités kilométriques'

  const montantTTC = isKm && form.kilometrage && form.puissance_fiscale
    ? calcKm(parseFloat(form.kilometrage), parseInt(form.puissance_fiscale))
    : parseFloat(form.montant_ttc || '0')

  const montantHT = calcHT(montantTTC, form.categorie)
  const tvaRec = calcTVA(montantTTC, form.categorie)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase.from('notes_frais').insert({
      user_id: user.id,
      date_depense: form.date_depense,
      categorie: form.categorie,
      description: form.description,
      montant_ttc: montantTTC,
      tva_recuperable: tvaRec,
      montant_ht: montantHT,
      statut: 'brouillon',
      kilometrage: isKm && form.kilometrage ? parseFloat(form.kilometrage) : null,
      puissance_fiscale: isKm ? parseInt(form.puissance_fiscale) : null,
    }).select().single()
    if (data) {
      setNotes(prev => [data as NoteFrais, ...prev])
      setShowAdd(false)
      setForm({ date_depense: new Date().toISOString().split('T')[0], categorie: 'Repas', description: '', montant_ttc: '', kilometrage: '', puissance_fiscale: '5' })
    }
  }

  const handleUpdateStatut = async (id: string, statut: NoteStatut) => {
    const supabase = createClient()
    await supabase.from('notes_frais').update({ statut }).eq('id', id)
    setNotes(prev => prev.map(n => n.id === id ? { ...n, statut } : n))
  }

  const handleDeleteNote = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notes_frais').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  // Export PDF mensuel (CSV version)
  const handleExport = () => {
    const headers = ['Date', 'Catégorie', 'Description', 'Montant TTC', 'TVA récupérable', 'Montant HT', 'Statut']
    const rows = filteredNotes.map(n => [
      n.date_depense, n.categorie, n.description,
      n.montant_ttc.toFixed(2), n.tva_recuperable.toFixed(2),
      (n.montant_ht ?? 0).toFixed(2), STATUT_CONFIG[n.statut].label,
    ])
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `notes-frais-${filterMois || 'toutes'}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const filteredNotes = notes.filter(n => {
    const matchStatut = filterStatut === 'tous' || n.statut === filterStatut
    const matchMois = !filterMois || n.date_depense.startsWith(filterMois)
    return matchStatut && matchMois
  })

  const totalTTC = filteredNotes.reduce((s, n) => s + n.montant_ttc, 0)
  const totalTVA = filteredNotes.reduce((s, n) => s + n.tva_recuperable, 0)

  const isEssentielPlus = plan === 'cabinet' || plan === 'pro'

  if (planLoading) return null

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Notes de frais</h1>
            <p className="text-sm text-navy-500 mt-1">Gérez vos dépenses professionnelles et indemnités kilométriques</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-slate-600">
              <Download className="w-3.5 h-3.5" />Export CSV
            </button>
            <button onClick={() => setShowAdd(true)} disabled={!isEssentielPlus}
              className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium">
              <Plus className="w-4 h-4" />Nouvelle note
            </button>
          </div>
        </div>

        {!isEssentielPlus && (
          <PlanRequiredBanner required="Essentiel" current="Starter" />
        )}

        {/* ── KPIs ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total TTC', value: formatCurrency(totalTTC), color: 'bg-blue-500' },
            { label: 'TVA récupérable', value: formatCurrency(totalTVA), color: 'bg-emerald-500' },
            { label: 'En attente validation', value: String(notes.filter(n => n.statut === 'en_attente').length), color: 'bg-amber-500' },
            { label: 'Remboursées', value: String(notes.filter(n => n.statut === 'rembourse').length), color: 'bg-purple-500' },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl border border-navy-100 bg-white p-4 relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${kpi.color} rounded-l-xl`} />
              <p className="text-xs font-medium text-navy-500 uppercase tracking-wide mb-1">{kpi.label}</p>
              <p className="text-xl font-bold text-navy-900">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filtres ──────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterStatut('tous')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filterStatut === 'tous' ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-600 border-gray-200'}`}>
              Toutes
            </button>
            {(Object.keys(STATUT_CONFIG) as NoteStatut[]).map(s => (
              <button key={s} onClick={() => setFilterStatut(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filterStatut === s ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-600 border-gray-200'}`}>
                {STATUT_CONFIG[s].label}
              </button>
            ))}
          </div>
          <input type="month" value={filterMois} onChange={e => setFilterMois(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white" />
        </div>

        {/* ── Tableau ──────────────────────────────────────────── */}
        <Card>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-navy-50 animate-pulse rounded-lg" />)}</div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-10 h-10 text-navy-200 mx-auto mb-3" />
              <p className="text-sm text-navy-400">Aucune note de frais</p>
              <div className="mt-3">
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
                    <th className="text-left pb-2 pr-4">Date</th>
                    <th className="text-left pb-2 pr-4">Catégorie</th>
                    <th className="text-left pb-2 pr-4">Description</th>
                    <th className="text-right pb-2 pr-4">Montant TTC</th>
                    <th className="text-right pb-2 pr-4">TVA récup.</th>
                    <th className="text-right pb-2 pr-4">Montant HT</th>
                    <th className="text-left pb-2 pr-4">Statut</th>
                    <th className="pb-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {filteredNotes.map(note => {
                    const cfg = STATUT_CONFIG[note.statut]
                    return (
                      <tr key={note.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="py-3 pr-4 text-navy-500 text-xs">{formatDate(note.date_depense)}</td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-navy-700">
                            {note.categorie}
                            {note.kilometrage && (
                              <span className="text-navy-400">({note.kilometrage} km)</span>
                            )}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-navy-800 max-w-[180px] truncate">{note.description}</td>
                        <td className="py-3 pr-4 text-right font-mono font-semibold text-navy-900">{formatCurrency(note.montant_ttc)}</td>
                        <td className="py-3 pr-4 text-right font-mono text-emerald-700">{formatCurrency(note.tva_recuperable)}</td>
                        <td className="py-3 pr-4 text-right font-mono text-navy-600">{formatCurrency(note.montant_ht ?? 0)}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {note.statut === 'brouillon' && (
                              <button onClick={() => void handleUpdateStatut(note.id, 'en_attente')}
                                className="px-2 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg">
                                Soumettre
                              </button>
                            )}
                            {note.statut === 'en_attente' && (
                              <>
                                <button onClick={() => void handleUpdateStatut(note.id, 'valide')}
                                  className="px-2 py-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg">
                                  Valider
                                </button>
                                <button onClick={() => void handleUpdateStatut(note.id, 'refuse')}
                                  className="px-2 py-1 text-[10px] font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg">
                                  Refuser
                                </button>
                              </>
                            )}
                            {note.statut === 'valide' && (
                              <button onClick={() => void handleUpdateStatut(note.id, 'rembourse')}
                                className="px-2 py-1 text-[10px] font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg">
                                Remboursé
                              </button>
                            )}
                            {(note.statut === 'brouillon' || note.statut === 'refuse') && (
                              <button onClick={() => void handleDeleteNote(note.id)}
                                className="p-1 text-gray-300 hover:text-red-400 transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-navy-100 font-semibold text-sm">
                    <td colSpan={3} className="pt-2 text-navy-600">Total</td>
                    <td className="pt-2 text-right font-mono text-navy-900">{formatCurrency(totalTTC)}</td>
                    <td className="pt-2 text-right font-mono text-emerald-700">{formatCurrency(totalTVA)}</td>
                    <td className="pt-2 text-right font-mono text-navy-600">
                      {formatCurrency(filteredNotes.reduce((s, n) => s + (n.montant_ht ?? 0), 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        {/* Bareme kilometrique */}
        <div className="mt-4 text-xs text-navy-400">
          Bareme kilometrique 2026 : en attente de publication officielle. Bareme 2025 applique par defaut (5CV &rarr; 0,548&euro;/km &middot; 6CV &rarr; 0,574&euro;/km &middot; 7CV+ &rarr; 0,601&euro;/km).
        </div>
      </div>

      {/* ── MODAL NOUVELLE NOTE ───────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-navy-900 mb-4">Nouvelle note de frais</h3>
            <form onSubmit={e => void handleAdd(e)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-navy-700 mb-1 block">Date *</label>
                  <input required type="date" value={form.date_depense}
                    onChange={e => setForm(p => ({ ...p, date_depense: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-navy-700 mb-1 block">Catégorie *</label>
                  <select value={form.categorie}
                    onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    {CATEGORIES_NDF.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-navy-700 mb-1 block">Description *</label>
                <input required value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ex: Déjeuner client, trajet Paris-Lyon…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              {isKm ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-navy-700 mb-1 block">Kilométrage *</label>
                    <input required type="number" min="0" step="0.1" value={form.kilometrage}
                      onChange={e => setForm(p => ({ ...p, kilometrage: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-navy-700 mb-1 block">Puissance fiscale (CV)</label>
                    <select value={form.puissance_fiscale}
                      onChange={e => setForm(p => ({ ...p, puissance_fiscale: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                      <option value="5">5 CV (0,548€/km)</option>
                      <option value="6">6 CV (0,574€/km)</option>
                      <option value="7">7 CV+ (0,601€/km)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-navy-700 mb-1 block">Montant TTC (€) *</label>
                  <input required type="number" min="0" step="0.01" value={form.montant_ttc}
                    onChange={e => setForm(p => ({ ...p, montant_ttc: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              )}

              {(montantTTC > 0) && (
                <div className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Montant TTC</span>
                    <strong>{formatCurrency(montantTTC)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA récupérable ({TAUX_TVA[form.categorie] ?? 0}%)</span>
                    <strong>{formatCurrency(tvaRec)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Montant HT</span>
                    <strong>{formatCurrency(montantHT)}</strong>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-navy-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
