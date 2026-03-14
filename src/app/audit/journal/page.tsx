'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { AppShell } from '@/components/layout'
import { Card, Button } from '@/components/ui'
import {
  BookOpen,
  Search,
  Download,
  Filter,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Ecriture {
  id: string
  ecriture_num: string
  journal_code: string
  date_ecriture: string
  piece_ref: string | null
  compte_num: string
  compte_lib: string | null
  debit: number
  credit: number
  libelle: string
  is_validated: boolean
  source: string
}

interface Totals {
  debit: number
  credit: number
  solde: number
}

const JOURNAL_LABELS: Record<string, string> = {
  VE: 'Ventes',
  AC: 'Achats',
  BQ: 'Banque',
  OD: 'Opérations Div.',
  AN: 'À-Nouveau',
  SA: 'Salaires',
  CA: 'Caisse',
}

const JOURNAL_COLORS: Record<string, string> = {
  VE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  AC: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  BQ: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  OD: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  AN: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
  SA: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  CA: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const formatEuro = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

// ─── Composant ───────────────────────────────────────────────────────────────

export default function JournalPage() {
  const [ecritures, setEcritures] = useState<Ecriture[]>([])
  const [totals, setTotals] = useState<Totals>({ debit: 0, credit: 0, solde: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Filtres
  const [journal, setJournal] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Modal saisie
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newJournal, setNewJournal] = useState('OD')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [newPiece, setNewPiece] = useState('')
  const [newLignes, setNewLignes] = useState([
    { compte_num: '', compte_lib: '', debit: 0, credit: 0, libelle: '' },
    { compte_num: '', compte_lib: '', debit: 0, credit: 0, libelle: '' },
  ])

  const LIMIT = 50

  const fetchEcritures = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (journal) params.set('journal', journal)
      if (search) params.set('search', search)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const res = await fetch(`/api/comptabilite/ecritures?${params}`)
      const data = await res.json() as {
        success?: boolean
        ecritures?: Ecriture[]
        total?: number
        totals?: Totals
      }
      if (data.success) {
        setEcritures(data.ecritures ?? [])
        setTotal(data.total ?? 0)
        setTotals(data.totals ?? { debit: 0, credit: 0, solde: 0 })
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [page, journal, search, dateFrom, dateTo])

  useEffect(() => { fetchEcritures() }, [fetchEcritures])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [journal, search, dateFrom, dateTo])

  const totalPages = Math.ceil(total / LIMIT)

  // ─── Export CSV ─────────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    const header = 'Date;N° Écriture;Journal;Compte;Libellé Compte;Libellé;Pièce;Débit;Crédit'
    const rows = ecritures.map(e =>
      `${e.date_ecriture};${e.ecriture_num};${e.journal_code};${e.compte_num};${e.compte_lib ?? ''};${e.libelle};${e.piece_ref ?? ''};${Number(e.debit).toFixed(2)};${Number(e.credit).toFixed(2)}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `journal-comptable-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // ─── Saisie manuelle ───────────────────────────────────────────────────────

  const addLigne = () => {
    setNewLignes(prev => [...prev, { compte_num: '', compte_lib: '', debit: 0, credit: 0, libelle: '' }])
  }

  const removeLigne = (idx: number) => {
    if (newLignes.length <= 2) return
    setNewLignes(prev => prev.filter((_, i) => i !== idx))
  }

  const updateLigne = (idx: number, field: string, value: string | number) => {
    setNewLignes(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  const newTotalDebit = newLignes.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const newTotalCredit = newLignes.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const isBalanced = Math.abs(newTotalDebit - newTotalCredit) < 0.01

  const handleSubmit = async () => {
    if (!isBalanced || newTotalDebit === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/comptabilite/ecritures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journal_code: newJournal,
          date_ecriture: newDate,
          piece_ref: newPiece || undefined,
          lignes: newLignes.filter(l => l.compte_num && (l.debit > 0 || l.credit > 0)),
        }),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (data.success) {
        setShowModal(false)
        setNewLignes([
          { compte_num: '', compte_lib: '', debit: 0, credit: 0, libelle: '' },
          { compte_num: '', compte_lib: '', debit: 0, credit: 0, libelle: '' },
        ])
        setNewPiece('')
        fetchEcritures()
      }
    } catch { /* silent */ }
    setSaving(false)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
              <Link href="/dashboard" className="hover:text-brand-green-action transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-neutral-300">Journal comptable</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-brand-green-action" />
              Journal des écritures
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              {total} écriture{total > 1 ? 's' : ''} comptables
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} icon={<Download className="w-4 h-4" />}>
              Export CSV
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowModal(true)} icon={<Plus className="w-4 h-4" />}>
              Nouvelle écriture
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-neutral-400" />
            {/* Journal pills */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setJournal('')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                  journal === '' ? 'bg-white/10 text-white border-white/20' : 'text-neutral-500 border-transparent hover:text-neutral-300'
                }`}
              >
                Tous
              </button>
              {Object.entries(JOURNAL_LABELS).map(([code, label]) => (
                <button
                  key={code}
                  onClick={() => setJournal(journal === code ? '' : code)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                    journal === code
                      ? JOURNAL_COLORS[code]
                      : 'text-neutral-500 border-transparent hover:text-neutral-300'
                  }`}
                  title={label}
                >
                  {code}
                </button>
              ))}
            </div>
            {/* Dates */}
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-brand-dark border border-white/10 text-neutral-300 text-sm rounded-lg px-2 py-1.5"
              />
              <span className="text-neutral-500 text-xs">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-brand-dark border border-white/10 text-neutral-300 text-sm rounded-lg px-2 py-1.5"
              />
            </div>
            {/* Recherche */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher libellé, pièce, compte..."
                className="w-full pl-9 pr-3 py-1.5 bg-brand-dark border border-white/10 text-neutral-300 text-sm rounded-lg focus:ring-brand-green-primary focus:border-brand-green-primary"
              />
            </div>
          </div>
        </Card>

        {/* Tableau */}
        <Card padding="none">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-brand-green-action animate-spin" />
            </div>
          ) : ecritures.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-300 mb-2 font-medium">Aucune écriture comptable</p>
              <p className="text-neutral-500 text-sm mb-6">Créez votre première écriture, importez un FEC, ou chargez les données de démonstration.</p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="primary" size="sm" onClick={() => setShowModal(true)} icon={<Plus className="w-4 h-4" />}>
                  Nouvelle écriture
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setLoading(true)
                    try {
                      const res = await fetch('/api/comptabilite/ecritures/seed', { method: 'POST' })
                      const data = await res.json() as { success?: boolean; count?: number; message?: string; error?: string }
                      if (data.success) {
                        toast.success(`${data.count ?? 0} écritures chargées`)
                        fetchEcritures()
                      } else {
                        toast.error(data.error ?? 'Erreur lors du seed')
                        console.error('Seed error:', data)
                        setLoading(false)
                      }
                    } catch (err) {
                      toast.error('Erreur réseau — vérifiez la console')
                      console.error('Seed fetch error:', err)
                      setLoading(false)
                    }
                  }}
                  icon={<BookOpen className="w-4 h-4" />}
                >
                  Charger données démo
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.04]">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">N°</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">Journal</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">Compte</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">Libellé</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">Pièce</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-emerald-500 uppercase tracking-wider">Débit</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-rose-400 uppercase tracking-wider">Crédit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ecritures.map((e, idx) => (
                      <tr
                        key={e.id}
                        className={`border-b border-white/[0.04] hover:bg-blue-500/[0.06] transition-colors ${
                          idx % 2 === 0 ? 'bg-white/[0.015]' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5 text-neutral-300 text-xs font-mono">{formatDate(e.date_ecriture)}</td>
                        <td className="px-3 py-2.5 text-neutral-400 text-xs font-mono">{e.ecriture_num}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded border ${JOURNAL_COLORS[e.journal_code] ?? 'bg-neutral-500/10 text-neutral-400'}`}>
                            {e.journal_code}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/audit/grand-livre?compte=${e.compte_num}`}
                            className="text-brand-green-action hover:underline text-xs font-mono font-semibold"
                          >
                            {e.compte_num}
                          </Link>
                          {e.compte_lib && (
                            <span className="ml-1.5 text-neutral-500 text-xs">{e.compte_lib}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-neutral-200 text-xs max-w-[280px] truncate">{e.libelle}</td>
                        <td className="px-3 py-2.5 text-neutral-500 text-xs font-mono">{e.piece_ref ?? ''}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">
                          {Number(e.debit) > 0 ? (
                            <span className="text-emerald-400 font-semibold">{formatEuro(Number(e.debit))}</span>
                          ) : (
                            <span className="text-neutral-700">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">
                          {Number(e.credit) > 0 ? (
                            <span className="text-rose-400 font-semibold">{formatEuro(Number(e.credit))}</span>
                          ) : (
                            <span className="text-neutral-700">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-white/10 bg-white/[0.04]">
                      <td colSpan={6} className="px-4 py-3 text-xs font-bold text-neutral-300 text-right uppercase tracking-wide">
                        Totaux page
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-bold text-emerald-400">
                        {formatEuro(totals.debit)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-bold text-rose-400">
                        {formatEuro(totals.credit)}
                      </td>
                    </tr>
                    {Math.abs(totals.solde) > 0.01 && (
                      <tr className="bg-white/[0.02]">
                        <td colSpan={6} className="px-4 py-2 text-xs font-semibold text-neutral-400 text-right">
                          Solde
                        </td>
                        <td colSpan={2} className="px-4 py-2 text-right font-mono text-xs font-bold text-cyan-400">
                          {formatEuro(totals.solde)}
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                  <p className="text-xs text-neutral-500">
                    Page {page} / {totalPages} ({total} écritures)
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1 rounded hover:bg-white/5 disabled:opacity-30 text-neutral-400"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1 rounded hover:bg-white/5 disabled:opacity-30 text-neutral-400"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Modal Nouvelle Écriture */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-brand-dark border border-white/10 rounded-2xl w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">Nouvelle écriture comptable</h2>
                <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                {/* En-tête */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Journal *</label>
                    <select
                      value={newJournal}
                      onChange={e => setNewJournal(e.target.value)}
                      className="w-full bg-brand-black border border-white/10 text-neutral-300 text-sm rounded-lg px-3 py-2"
                    >
                      {Object.entries(JOURNAL_LABELS).map(([code, label]) => (
                        <option key={code} value={code}>{code} — {label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Date *</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="w-full bg-brand-black border border-white/10 text-neutral-300 text-sm rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Pièce réf.</label>
                    <input
                      type="text"
                      value={newPiece}
                      onChange={e => setNewPiece(e.target.value)}
                      placeholder="FA-2026-001"
                      className="w-full bg-brand-black border border-white/10 text-neutral-300 text-sm rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                {/* Lignes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-neutral-400">Lignes d&apos;écriture</label>
                    <button onClick={addLigne} className="text-xs text-brand-green-action hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Ajouter ligne
                    </button>
                  </div>
                  <div className="space-y-2">
                    {newLignes.map((l, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={l.compte_num}
                          onChange={e => updateLigne(i, 'compte_num', e.target.value)}
                          placeholder="411"
                          className="col-span-2 bg-brand-black border border-white/10 text-neutral-300 text-sm rounded-lg px-2 py-1.5 font-mono"
                        />
                        <input
                          type="text"
                          value={l.libelle}
                          onChange={e => updateLigne(i, 'libelle', e.target.value)}
                          placeholder="Libellé"
                          className="col-span-4 bg-brand-black border border-white/10 text-neutral-300 text-sm rounded-lg px-2 py-1.5"
                        />
                        <input
                          type="number"
                          value={l.debit || ''}
                          onChange={e => updateLigne(i, 'debit', parseFloat(e.target.value) || 0)}
                          placeholder="Débit"
                          min="0"
                          step="0.01"
                          className="col-span-2 bg-brand-black border border-white/10 text-neutral-300 text-sm rounded-lg px-2 py-1.5 font-mono text-right"
                        />
                        <input
                          type="number"
                          value={l.credit || ''}
                          onChange={e => updateLigne(i, 'credit', parseFloat(e.target.value) || 0)}
                          placeholder="Crédit"
                          min="0"
                          step="0.01"
                          className="col-span-2 bg-brand-black border border-white/10 text-neutral-300 text-sm rounded-lg px-2 py-1.5 font-mono text-right"
                        />
                        <div className="col-span-2 flex items-center gap-1">
                          <input
                            type="text"
                            value={l.compte_lib}
                            onChange={e => updateLigne(i, 'compte_lib', e.target.value)}
                            placeholder="Lib. compte"
                            className="flex-1 bg-brand-black border border-white/10 text-neutral-400 text-xs rounded-lg px-2 py-1.5"
                          />
                          {newLignes.length > 2 && (
                            <button onClick={() => removeLigne(i)} className="text-neutral-600 hover:text-coral-400">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totaux */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-neutral-400">Débit: <span className="font-mono text-neutral-200">{formatEuro(newTotalDebit)}</span></span>
                    <span className="text-neutral-400">Crédit: <span className="font-mono text-neutral-200">{formatEuro(newTotalCredit)}</span></span>
                  </div>
                  {isBalanced && newTotalDebit > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Équilibrée
                    </span>
                  ) : (
                    <span className="text-xs text-coral-400">
                      Écart: {formatEuro(Math.abs(newTotalDebit - newTotalCredit))}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10">
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  loading={saving}
                  disabled={!isBalanced || newTotalDebit === 0}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
