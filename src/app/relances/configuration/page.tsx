'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ChevronLeft, Save, Loader2 } from 'lucide-react'

const PREVIEW_TEMPLATES: Record<number, Record<string, string>> = {
  1: {
    cordial: 'Bonjour,\n\nNous vous rappelons que la facture FAC-2026-001 (1 200,00 €) est arrivée à échéance il y a 7 jours.\n\nPeut-être s\'agit-il d\'un simple oubli ? Nous vous invitons à régulariser dans les meilleurs délais.\n\nCordialement,\n[Votre signature]',
    ferme: 'Bonjour,\n\nMalgré nos relances, la facture FAC-2026-001 (1 200,00 €) reste impayée depuis 7 jours.\n\nNous vous demandons de procéder au règlement sous 48 heures.\n\nCordialement,\n[Votre signature]',
    urgent: 'MISE EN DEMEURE\n\nNous vous mettons en demeure de régler immédiatement la facture FAC-2026-001 (1 200,00 €), impayée depuis 7 jours.\n\nSans règlement sous 8 jours, une procédure de recouvrement sera engagée.\n\n[Votre signature]',
  },
}

export default function RelancesConfigPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [previewNiveau, setPreviewNiveau] = useState(1)

  const [actif, setActif] = useState(false)
  const [delaiJ1, setDelaiJ1] = useState(7)
  const [delaiJ2, setDelaiJ2] = useState(15)
  const [delaiJ3, setDelaiJ3] = useState(30)
  const [ton, setTon] = useState('cordial')
  const [signature, setSignature] = useState('')

  useEffect(() => {
    fetch('/api/relances/config')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.config) {
          const c = d.config
          setActif(c.actif)
          setDelaiJ1(c.delai_j1)
          setDelaiJ2(c.delai_j2)
          setDelaiJ3(c.delai_j3)
          setTon(c.ton)
          setSignature(c.signature ?? '')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/relances/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif, delai_j1: delaiJ1, delai_j2: delaiJ2, delai_j3: delaiJ3, ton, signature }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return (
    <AppShell><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div></AppShell>
  )

  const preview = PREVIEW_TEMPLATES[1][ton] ?? PREVIEW_TEMPLATES[1]['cordial']

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-1.5 text-navy-400 hover:text-navy-700">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-navy-900">Configuration des relances</h1>
        </div>

        <div className="space-y-6">
          {/* Activation */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-navy-900">Relances automatiques</p>
                <p className="text-sm text-navy-500 mt-0.5">Envoi quotidien à 9h pour toutes les factures en retard</p>
              </div>
              <button onClick={() => setActif(!actif)}
                className={`w-12 h-6 rounded-full transition-colors ${actif ? 'bg-emerald-500' : 'bg-navy-200'} relative`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${actif ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </Card>

          {/* Délais */}
          <Card className="space-y-4">
            <h2 className="font-semibold text-navy-900">Délais de relance</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">
                  1ère relance (J+ <span className="text-emerald-600">{delaiJ1}</span>)
                </label>
                <input type="range" min="1" max="30" value={delaiJ1} onChange={e => setDelaiJ1(+e.target.value)}
                  className="w-full accent-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">
                  2ème relance (J+ <span className="text-orange-600">{delaiJ2}</span>)
                </label>
                <input type="range" min="1" max="60" value={delaiJ2} onChange={e => setDelaiJ2(+e.target.value)}
                  className="w-full accent-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">
                  Mise en demeure (J+ <span className="text-red-600">{delaiJ3}</span>)
                </label>
                <input type="range" min="1" max="90" value={delaiJ3} onChange={e => setDelaiJ3(+e.target.value)}
                  className="w-full accent-red-500" />
              </div>
            </div>
          </Card>

          {/* Ton */}
          <Card className="space-y-4">
            <h2 className="font-semibold text-navy-900">Ton des emails</h2>
            <div className="flex gap-3">
              {(['cordial', 'ferme', 'urgent'] as const).map(t => (
                <button key={t} onClick={() => setTon(t)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-colors capitalize ${ton === t ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-navy-200 text-navy-700 hover:border-navy-300'}`}>
                  {t === 'cordial' ? '🤝 Cordial' : t === 'ferme' ? '📋 Ferme' : '⚖️ Urgent'}
                </button>
              ))}
            </div>
          </Card>

          {/* Signature */}
          <Card>
            <h2 className="font-semibold text-navy-900 mb-3">Signature email</h2>
            <textarea value={signature} onChange={e => setSignature(e.target.value)} rows={3}
              placeholder="Cordialement,&#10;[Votre nom]&#10;Cabinet [Nom]"
              className="w-full px-4 py-2.5 bg-white border-2 border-navy-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </Card>

          {/* Preview */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-navy-900">Aperçu email</h2>
              <div className="flex gap-1">
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => setPreviewNiveau(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${previewNiveau === n ? 'bg-navy-900 text-white' : 'bg-navy-100 text-navy-500'}`}>
                    N{n}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 border border-navy-100 rounded-xl p-4">
              <pre className="text-xs text-navy-700 whitespace-pre-wrap font-sans leading-relaxed">{preview}</pre>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => router.back()}>Annuler</Button>
            <Button onClick={() => void handleSave()} loading={saving} icon={<Save className="w-4 h-4" />}>
              {saved ? 'Sauvegardé ✓' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
