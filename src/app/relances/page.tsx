'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Settings, Send, AlertTriangle, Clock, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'

interface FactureRetard {
  id: string
  numero_facture: string
  montant_ttc: number
  date_echeance: string
  jours_retard: number
  client_nom: string
  client_email: string | null
  niveau: 1 | 2 | 3
}

interface Config {
  actif: boolean
  delai_j1: number
  delai_j2: number
  delai_j3: number
  ton: string
}

const NIVEAU_CONFIG = {
  1: { label: 'J+7', color: 'bg-amber-100 text-amber-800', desc: '1ère relance' },
  2: { label: 'J+15', color: 'bg-orange-100 text-orange-800', desc: '2ème relance' },
  3: { label: 'J+30', color: 'bg-red-100 text-red-800', desc: 'Mise en demeure' },
}

export default function RelancesPage() {
  const router = useRouter()
  const [factures, setFactures] = useState<FactureRetard[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [togglingAuto, setTogglingAuto] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [retardRes, configRes] = await Promise.all([
        fetch('/api/relances/retard'),
        fetch('/api/relances/config'),
      ])
      const retardData = await retardRes.json()
      const configData = await configRes.json()
      if (retardData.success) setFactures(retardData.factures ?? [])
      if (configData.success) setConfig(configData.config)
      setLoading(false)
    }
    void load()
  }, [])

  const toggleAuto = async () => {
    if (!config) return
    setTogglingAuto(true)
    await fetch('/api/relances/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !config.actif }),
    })
    setConfig(prev => prev ? { ...prev, actif: !prev.actif } : prev)
    setTogglingAuto(false)
  }

  const sendNow = async (facture: FactureRetard) => {
    setSendingId(facture.id)
    await fetch('/api/relances/envoyer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facture_id: facture.id, niveau: facture.niveau }),
    })
    setSendingId(null)
    // Show brief success feedback
    setFactures(prev => prev.filter(f => f.id !== facture.id))
  }

  const totalMontant = factures.reduce((s, f) => s + f.montant_ttc, 0)

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Relances impayés</h1>
            <p className="text-navy-500 text-sm mt-1">
              {factures.length} facture{factures.length !== 1 ? 's' : ''} en retard
              {factures.length > 0 && ` · ${totalMontant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" icon={<Settings className="w-4 h-4" />}
              onClick={() => router.push('/relances/configuration')}>
              Configuration
            </Button>
            {config && (
              <Button variant={config.actif ? 'secondary' : 'outline'}
                loading={togglingAuto}
                icon={config.actif ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                onClick={() => void toggleAuto()}>
                Auto {config.actif ? 'ON' : 'OFF'}
              </Button>
            )}
          </div>
        </div>

        {config?.actif && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Relances automatiques activées — envoi quotidien à 9h
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : factures.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-navy-500">Aucune facture en retard — bravo !</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {factures.map(facture => {
              const niv = NIVEAU_CONFIG[facture.niveau]
              return (
                <div key={facture.id} className="bg-white border border-navy-100 rounded-2xl p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
                  <div className="flex-shrink-0">
                    <AlertTriangle className={`w-5 h-5 ${facture.niveau >= 3 ? 'text-red-500' : facture.niveau === 2 ? 'text-orange-500' : 'text-amber-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-navy-900">{facture.client_nom}</span>
                      <span className="font-mono text-sm text-navy-500">{facture.numero_facture}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${niv.color}`}>
                        {niv.label} — {niv.desc}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-navy-500">
                      <span className="font-mono font-semibold text-navy-900">
                        {facture.montant_ttc.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {facture.jours_retard} jours de retard
                      </span>
                      {facture.client_email && <span className="text-xs">{facture.client_email}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline"
                    loading={sendingId === facture.id}
                    icon={<Send className="w-4 h-4" />}
                    onClick={() => void sendNow(facture)}
                    disabled={!facture.client_email}>
                    Relancer
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
