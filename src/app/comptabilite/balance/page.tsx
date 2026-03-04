'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import { Download, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'

// ─── Types ──────────────────────────────────────────────────

interface BalanceRow {
  category: string
  totalN: number
  totalN1: number
  count: number
}

// ─── Helpers ────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function variationPercent(n: number, n1: number): string {
  if (n1 === 0) return n === 0 ? '—' : '+\u221E'
  const pct = ((n - n1) / Math.abs(n1)) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

// ─── Page ───────────────────────────────────────────────────

export default function BalanceGeneralePage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<BalanceRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBalance = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch('/api/comptabilite/balance')
      const data = await res.json()
      if (data.success) setRows(data.rows ?? [])
    } catch { /* silent */ }
    setLoading(false)
  }, [user])

  useEffect(() => { void fetchBalance() }, [fetchBalance])

  const totalDebitN = rows.filter(r => r.totalN > 0).reduce((s, r) => s + r.totalN, 0)
  const totalCreditN = rows.filter(r => r.totalN < 0).reduce((s, r) => s + Math.abs(r.totalN), 0)
  const totalDebitN1 = rows.filter(r => r.totalN1 > 0).reduce((s, r) => s + r.totalN1, 0)
  const totalCreditN1 = rows.filter(r => r.totalN1 < 0).reduce((s, r) => s + Math.abs(r.totalN1), 0)

  const handleExportExcel = () => {
    const data = rows.map(r => ({
      'Catégorie': r.category,
      'Solde N (\u20AC)': r.totalN,
      'Solde N-1 (\u20AC)': r.totalN1,
      'Variation (%)': r.totalN1 !== 0 ? (((r.totalN - r.totalN1) / Math.abs(r.totalN1)) * 100).toFixed(1) : '—',
      'Nb écritures': r.count,
    }))
    data.push({
      'Catégorie': 'TOTAL',
      'Solde N (\u20AC)': totalDebitN - totalCreditN,
      'Solde N-1 (\u20AC)': totalDebitN1 - totalCreditN1,
      'Variation (%)': '',
      'Nb écritures': rows.reduce((s, r) => s + r.count, 0),
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Balance Générale')
    XLSX.writeFile(wb, `balance-generale-${new Date().getFullYear()}.xlsx`)
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Balance Générale</h1>
            <p className="text-sm text-navy-500 mt-1">Soldes par catégorie avec comparaison N-1</p>
          </div>
          <button
            onClick={handleExportExcel}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter Excel
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="text-center py-16">
            <p className="text-navy-500">Aucune écriture trouvée pour la période en cours.</p>
            <p className="text-sm text-navy-400 mt-2">Importez des transactions ou des factures pour voir votre balance.</p>
          </Card>
        ) : (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-navy-50 text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wide">Catégorie</th>
                    <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wide text-right">Solde N</th>
                    <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wide text-right">Solde N-1</th>
                    <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wide text-right">Variation</th>
                    <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase tracking-wide text-right">Écritures</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {rows.map(r => {
                    const variation = r.totalN1 !== 0 ? ((r.totalN - r.totalN1) / Math.abs(r.totalN1)) * 100 : 0
                    return (
                      <tr key={r.category} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-navy-900">{r.category}</td>
                        <td className="px-6 py-3 text-sm font-mono text-navy-900 text-right">{formatCurrency(r.totalN)}</td>
                        <td className="px-6 py-3 text-sm font-mono text-navy-500 text-right">
                          {r.totalN1 !== 0 ? formatCurrency(r.totalN1) : <span className="text-navy-300" title="Aucune donnée exercice précédent">—</span>}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {r.totalN1 !== 0 ? (
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                              variation > 0 ? 'text-emerald-600' : variation < 0 ? 'text-red-600' : 'text-navy-400'
                            }`}>
                              {variation > 0 ? <TrendingUp className="w-3 h-3" /> : variation < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {variationPercent(r.totalN, r.totalN1)}
                            </span>
                          ) : (
                            <span className="text-xs text-navy-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-navy-500 text-right">{r.count}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-navy-50 font-semibold">
                    <td className="px-6 py-3 text-sm text-navy-900">TOTAL</td>
                    <td className="px-6 py-3 text-sm font-mono text-navy-900 text-right">{formatCurrency(totalDebitN - totalCreditN)}</td>
                    <td className="px-6 py-3 text-sm font-mono text-navy-500 text-right">{formatCurrency(totalDebitN1 - totalCreditN1)}</td>
                    <td className="px-6 py-3" />
                    <td className="px-6 py-3 text-sm text-navy-500 text-right">{rows.reduce((s, r) => s + r.count, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
