'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { ChevronRight, ChevronLeft, Send, Save, RotateCcw } from 'lucide-react'

const EMOJIS = [
  '🤖','🧠','⚖️','📊','💼','🔍','📋','🏛️','💰','📈',
  '🎯','⚙️','🛡️','📝','🔑','💡','🌐','📌','🔔','✅',
  '📣','🗂️','💹','🏗️','🚗','🏥','🍽️','🏠','🛒','🎓',
]

const COULEURS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Vert', value: '#22D3A5' },
  { label: 'Bleu', value: '#3b82f6' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Corail', value: '#f43f5e' },
  { label: 'Ambre', value: '#f59e0b' },
]

const SECTEURS = ['BTP', 'Immobilier', 'Restauration', 'Transport', 'Santé', 'Retail', 'Informatique', 'Autre']

const TEMPLATES: Record<string, string> = {
  relances: `Tu es un spécialiste du recouvrement de créances pour cabinets comptables français.
Rédige des relances professionnelles adaptées au montant et à l'ancienneté de la dette.
Ton : cordial mais ferme. Cite les obligations légales si nécessaire (Art. L441-10 Code commerce).
Ne donne jamais de conseils juridiques au-delà de ton rôle de rédacteur.`,

  fiscal: `Tu es un expert fiscal français.
Réponds uniquement selon le BOFIP et le CGI en vigueur.
Cite toujours les références officielles (BOI-XX, Art. CGI).
Si tu n'es pas sûr d'une référence, dis-le explicitement.
Ne donne pas d'avis personnels — uniquement les textes officiels.`,

  onboarding: `Tu es l'assistant d'accueil d'un cabinet comptable français.
Guide les nouveaux clients avec bienveillance et professionnalisme.
Explique les étapes de l'onboarding, les documents à fournir, les délais.
Sois clair, rassurant et concis. Personnalise ton accueil selon le secteur du client.`,

  audit: `Tu es un expert-comptable spécialisé dans l'audit comptable selon le PCG français.
Vérifie les comptes présentés, signale les anomalies et incohérences.
Cite toujours le numéro de compte PCG concerné.
Propose des corrections concrètes et justifiées.
Ne valide jamais des pratiques contraires au PCG ou aux normes IFRS si applicables.`,

  libre: '',
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  mode?: 'create' | 'edit'
  agentId?: string
  initialData?: {
    nom: string
    description: string
    avatar_emoji: string
    couleur: string
    system_prompt: string
    secteur_metier: string
    sources: string[]
    temperature: number
  }
}

export function AgentCreatorWizard({ mode = 'create', agentId, initialData }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [nom, setNom] = useState(initialData?.nom ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [emoji, setEmoji] = useState(initialData?.avatar_emoji ?? '🤖')
  const [couleur, setCouleur] = useState(initialData?.couleur ?? '#6366f1')
  const [secteur, setSecteur] = useState(initialData?.secteur_metier ?? '')

  // Step 2
  const [templateKey, setTemplateKey] = useState('libre')
  const [systemPrompt, setSystemPrompt] = useState(initialData?.system_prompt ?? '')
  const [temperature, setTemperature] = useState(initialData?.temperature ?? 0.3)
  const [sources, setSources] = useState<string[]>(initialData?.sources ?? ['pcg', 'bofip'])

  // Step 3
  const [docNom, setDocNom] = useState('')
  const [docContenu, setDocContenu] = useState('')
  const [docs, setDocs] = useState<Array<{ nom: string; contenu: string }>>([])

  // Step 4 — Test
  const [testMessage, setTestMessage] = useState('')
  const [conversation, setConversation] = useState<Message[]>([])
  const [testing, setTesting] = useState(false)
  const [savedAgentId, setSavedAgentId] = useState<string | null>(agentId ?? null)

  const applyTemplate = (key: string) => {
    setTemplateKey(key)
    if (TEMPLATES[key] !== undefined) setSystemPrompt(TEMPLATES[key])
  }

  const toggleSource = (s: string) => {
    setSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const addDoc = () => {
    if (!docNom.trim() || !docContenu.trim()) return
    setDocs(prev => [...prev, { nom: docNom.trim(), contenu: docContenu.trim() }])
    setDocNom('')
    setDocContenu('')
  }

  const saveAgent = async (): Promise<string | null> => {
    setSaving(true)
    setError(null)
    try {
      const payload = { nom, description, avatar_emoji: emoji, couleur, system_prompt: systemPrompt, secteur_metier: secteur, sources, temperature }
      const res = await fetch(
        mode === 'edit' && agentId ? `/api/ia/agents-custom/${agentId}` : '/api/ia/agents-custom',
        {
          method: mode === 'edit' && agentId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      const newId = data.agent.id as string

      // Upload docs
      for (const doc of docs) {
        await fetch(`/api/ia/agents-custom/${newId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc_nom: doc.nom, doc_contenu: doc.contenu }),
        })
      }

      setSavedAgentId(newId)
      return newId
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
      return null
    } finally {
      setSaving(false)
    }
  }

  const testAgent = async () => {
    if (!testMessage.trim()) return
    if (!savedAgentId) {
      const id = await saveAgent()
      if (!id) return
    }

    setTesting(true)
    const userMsg: Message = { role: 'user', content: testMessage }
    setConversation(prev => [...prev, userMsg])
    setTestMessage('')

    try {
      const res = await fetch(`/api/ia/agents-custom/${savedAgentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testMessage, conversation_history: conversation }),
      })
      const data = await res.json()
      if (data.success) {
        setConversation(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setConversation(prev => [...prev, { role: 'assistant', content: `Erreur: ${data.error}` }])
      }
    } catch {
      setConversation(prev => [...prev, { role: 'assistant', content: 'Erreur de connexion' }])
    } finally {
      setTesting(false)
    }
  }

  const handleSaveAndFinish = async () => {
    const id = await saveAgent()
    if (id) router.push('/ia/mes-agents')
  }

  const canNext1 = nom.trim().length > 0
  const canNext2 = systemPrompt.trim().length > 0

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s < step ? 'bg-emerald-500 text-white' :
              s === step ? 'bg-navy-900 text-white' :
              'bg-navy-100 text-navy-400'
            }`}>{s}</div>
            {s < 4 && <div className={`h-0.5 w-12 ${s < step ? 'bg-emerald-500' : 'bg-navy-100'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-navy-500">
          {['Identité', 'Comportement', 'Connaissances', 'Test'][step - 1]}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* ── Step 1 : Identité ── */}
      {step === 1 && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-navy-900">Identité de l&apos;agent</h2>
          <Input label="Nom de l'agent" value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Agent Relances BTP" />
          <Input label="Description courte" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ce que fait cet agent..." />

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">Avatar</label>
            <div className="grid grid-cols-10 gap-1">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-colors ${emoji === e ? 'bg-emerald-100 ring-2 ring-emerald-500' : 'hover:bg-navy-50'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">Couleur</label>
            <div className="flex gap-2">
              {COULEURS.map(c => (
                <button key={c.value} onClick={() => setCouleur(c.value)}
                  className={`w-8 h-8 rounded-full transition-transform ${couleur === c.value ? 'scale-125 ring-2 ring-offset-2 ring-navy-400' : ''}`}
                  style={{ backgroundColor: c.value }} title={c.label} />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">Secteur métier</label>
            <div className="flex flex-wrap gap-2">
              {SECTEURS.map(s => (
                <button key={s} onClick={() => setSecteur(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${secteur === s ? 'bg-emerald-500 text-white' : 'bg-navy-50 text-navy-700 hover:bg-navy-100'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ── Step 2 : Comportement ── */}
      {step === 2 && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-navy-900">Comportement de l&apos;agent</h2>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">Template prédéfini</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.keys(TEMPLATES).map(key => (
                <button key={key} onClick={() => applyTemplate(key)}
                  className={`px-3 py-2 rounded-xl text-sm border transition-colors ${templateKey === key ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-navy-200 text-navy-700 hover:border-navy-300'}`}>
                  {key === 'relances' ? '📨 Relances impayés' :
                   key === 'fiscal' ? '⚖️ Conseil fiscal' :
                   key === 'onboarding' ? '👋 Onboarding' :
                   key === 'audit' ? '🔍 Audit PCG' : '✏️ Agent libre'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">System prompt</label>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={8}
              placeholder="Décris le rôle, les règles et le comportement de cet agent..."
              className="w-full px-4 py-3 bg-white border-2 border-navy-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-emerald-500 resize-none font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">
              Température : {temperature} ({temperature <= 0.3 ? 'Précis' : temperature <= 0.6 ? 'Équilibré' : 'Créatif'})
            </label>
            <input type="range" min="0" max="1" step="0.05" value={temperature}
              onChange={e => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-emerald-500" />
            <div className="flex justify-between text-xs text-navy-400 mt-1">
              <span>Précis (0)</span><span>Créatif (1)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">Sources autorisées</label>
            <div className="flex gap-3">
              {['pcg', 'bofip', 'docs_cabinet'].map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={sources.includes(s)} onChange={() => toggleSource(s)}
                    className="accent-emerald-500 w-4 h-4" />
                  <span className="text-sm text-navy-700">
                    {s === 'pcg' ? 'PCG' : s === 'bofip' ? 'BOFIP' : 'Docs cabinet'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ── Step 3 : Base de connaissances ── */}
      {step === 3 && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-navy-900">Base de connaissances</h2>
          <p className="text-sm text-navy-500">Ajoutez des documents (procédures, tarifs, spécificités secteur) qui seront injectés comme contexte.</p>

          <div className="space-y-3">
            <Input label="Nom du document" value={docNom} onChange={e => setDocNom(e.target.value)} placeholder="Ex: Procédure onboarding clients BTP" />
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Contenu</label>
              <textarea value={docContenu} onChange={e => setDocContenu(e.target.value)} rows={5}
                placeholder="Collez ici le contenu du document..."
                className="w-full px-4 py-3 bg-white border-2 border-navy-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
            <Button type="button" variant="outline" onClick={addDoc} disabled={!docNom.trim() || !docContenu.trim()}>
              + Ajouter ce document
            </Button>
          </div>

          {docs.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-navy-700">Documents ajoutés :</p>
              {docs.map((d, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-lg">
                  <span className="text-sm text-emerald-800">📄 {d.nom}</span>
                  <button onClick={() => setDocs(prev => prev.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 text-xs">Supprimer</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Step 4 : Test ── */}
      {step === 4 && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy-900">Tester l&apos;agent</h2>
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: couleur }} className="text-2xl">{emoji}</span>
              <span className="font-medium text-navy-900">{nom}</span>
            </div>
          </div>

          <div className="bg-navy-50 rounded-xl p-4">
            <p className="text-xs font-mono text-navy-500 whitespace-pre-wrap">{systemPrompt}</p>
          </div>

          {/* Chat */}
          <div className="space-y-3 min-h-[200px] max-h-[300px] overflow-y-auto">
            {conversation.length === 0 && (
              <p className="text-sm text-navy-400 text-center py-8">Envoyez un message pour tester l&apos;agent...</p>
            )}
            {conversation.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-emerald-500 text-white rounded-br-sm'
                    : 'bg-white border border-navy-200 text-navy-900 rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {testing && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 rounded-2xl bg-white border border-navy-200">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-navy-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input value={testMessage} onChange={e => setTestMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void testAgent() } }}
              placeholder="Testez votre agent..."
              className="flex-1 px-4 py-2.5 bg-white border-2 border-navy-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-emerald-500"
            />
            <Button onClick={() => void testAgent()} loading={testing} icon={<Send className="w-4 h-4" />} disabled={!testMessage.trim()}>
              Envoyer
            </Button>
          </div>

          <Button onClick={() => setConversation([])} variant="ghost" size="sm" icon={<RotateCcw className="w-4 h-4" />}>
            Réinitialiser le test
          </Button>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/ia/mes-agents')}
          icon={<ChevronLeft className="w-4 h-4" />}>
          {step === 1 ? 'Annuler' : 'Retour'}
        </Button>

        <div className="flex gap-2">
          {step < 4 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
              icon={<ChevronRight className="w-4 h-4" />}
            >
              Suivant
            </Button>
          ) : (
            <Button onClick={() => void handleSaveAndFinish()} loading={saving} icon={<Save className="w-4 h-4" />}>
              {mode === 'edit' ? 'Enregistrer' : 'Créer l\'agent'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
