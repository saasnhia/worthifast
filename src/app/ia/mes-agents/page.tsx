'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Plus, Pencil, Copy, Trash2, MessageSquare, Loader2 } from 'lucide-react'

interface AgentCustom {
  id: string
  nom: string
  description: string | null
  avatar_emoji: string
  couleur: string
  secteur_metier: string | null
  nb_conversations: number
  actif: boolean
  created_at: string
}

export default function MesAgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<AgentCustom[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchAgents = async () => {
    setLoading(true)
    const res = await fetch('/api/ia/agents-custom')
    const data = await res.json()
    if (data.success) setAgents(data.agents)
    setLoading(false)
  }

  useEffect(() => { void fetchAgents() }, [])

  const handleDelete = async (agent: AgentCustom) => {
    if (!confirm(`Supprimer l'agent "${agent.nom}" ?`)) return
    setDeletingId(agent.id)
    await fetch(`/api/ia/agents-custom/${agent.id}`, { method: 'DELETE' })
    await fetchAgents()
    setDeletingId(null)
  }

  const handleDuplicate = async (agent: AgentCustom) => {
    await fetch('/api/ia/agents-custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: `${agent.nom} (copie)`,
        description: agent.description,
        avatar_emoji: agent.avatar_emoji,
        couleur: agent.couleur,
        secteur_metier: agent.secteur_metier,
        system_prompt: '(copie)',
      }),
    })
    await fetchAgents()
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Mes agents IA</h1>
            <p className="text-navy-500 text-sm mt-1">Agents personnalisés pour votre cabinet</p>
          </div>
          <Button onClick={() => router.push('/ia/creer-agent')} icon={<Plus className="w-4 h-4" />}>
            Créer un agent
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-5xl mb-4">🤖</div>
            <p className="text-navy-500 mb-4">Aucun agent personnalisé</p>
            <Button onClick={() => router.push('/ia/creer-agent')} icon={<Plus className="w-4 h-4" />}>
              Créer mon premier agent
            </Button>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {agents.map(agent => (
              <Card key={agent.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: `${agent.couleur}20` }}>
                    {agent.avatar_emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy-900 truncate">{agent.nom}</p>
                    {agent.secteur_metier && (
                      <span className="text-xs text-navy-500">{agent.secteur_metier}</span>
                    )}
                    {agent.description && (
                      <p className="text-xs text-navy-400 mt-1 line-clamp-2">{agent.description}</p>
                    )}
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${agent.actif ? 'bg-emerald-400' : 'bg-navy-300'}`} />
                </div>

                <div className="flex items-center justify-between text-xs text-navy-400 mb-3">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {agent.nb_conversations} conversation{agent.nb_conversations !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={() => router.push(`/ia?agent=${agent.id}`)}>
                    Utiliser
                  </Button>
                  <button onClick={() => router.push(`/ia/creer-agent?edit=${agent.id}`)}
                    className="p-1.5 text-navy-400 hover:text-navy-700 transition-colors" title="Modifier">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => void handleDuplicate(agent)}
                    className="p-1.5 text-navy-400 hover:text-navy-700 transition-colors" title="Dupliquer">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => void handleDelete(agent)} disabled={deletingId === agent.id}
                    className="p-1.5 text-navy-400 hover:text-red-500 disabled:opacity-40 transition-colors" title="Supprimer">
                    {deletingId === agent.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
