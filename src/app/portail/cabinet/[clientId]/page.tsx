'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Send, FileText, MessageSquare, Receipt, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Doc { id: string; nom: string; type: string; statut: string; uploaded_by: string; created_at: string }
interface Msg { id: string; expediteur: string; message: string; lu: boolean; created_at: string }
interface Portail { id: string; client_id: string | null; client_nom: string; client_email: string; token: string }

export default function PortailClientPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const [portail, setPortail] = useState<Portail | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [activeTab, setActiveTab] = useState<'docs' | 'messages' | 'factures'>('docs')
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      // Find portail by clientId
      const res = await fetch('/api/portail/liste')
      const data = await res.json()
      if (data.success) {
        const found = data.portails.find((p: Portail) => p.id === clientId || p.client_id === clientId)
        if (found) {
          setPortail(found)
          // Load docs and messages via token
          const [docsRes, msgsRes] = await Promise.all([
            fetch(`/api/portail/${found.token}/documents`),
            fetch(`/api/portail/${found.token}/messages`),
          ])
          const docsData = await docsRes.json()
          const msgsData = await msgsRes.json()
          if (docsData.success) setDocs(docsData.documents)
          if (msgsData.success) setMessages(msgsData.messages)
        }
      }
      setLoading(false)
    }
    void init()
  }, [clientId])

  const sendMessage = async () => {
    if (!portail || !newMessage.trim()) return
    setSending(true)
    await fetch(`/api/portail/${portail.token}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expediteur: 'Cabinet', message: newMessage }),
    })
    setNewMessage('')
    const res = await fetch(`/api/portail/${portail.token}/messages`)
    const data = await res.json()
    if (data.success) setMessages(data.messages)
    setSending(false)
  }

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    </AppShell>
  )

  if (!portail) return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-navy-500">Portail introuvable. <Link href="/portail" className="text-emerald-600 underline">Retour</Link></p>
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/portail" className="text-navy-500 hover:text-navy-900 text-sm">← Portail</Link>
          <span className="text-navy-300">/</span>
          <h1 className="text-xl font-bold text-navy-900">{portail.client_nom}</h1>
          <span className="text-sm text-navy-500">{portail.client_email}</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-navy-200 mb-6">
          {([['docs', FileText, 'Documents'], ['messages', MessageSquare, 'Messagerie'], ['factures', Receipt, 'Factures']] as const).map(([tab, Icon, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-navy-500 hover:text-navy-700'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'docs' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-navy-600">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
            </div>
            {docs.length === 0 ? (
              <Card className="text-center py-12 text-navy-500 text-sm">Aucun document déposé</Card>
            ) : (
              docs.map(doc => {
                const isNew = (Date.now() - new Date(doc.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000
                const STATUT_MAP: Record<string, { label: string; cls: string }> = {
                  en_attente: { label: 'En attente', cls: 'bg-amber-100 text-amber-800' },
                  recu: { label: 'Reçu', cls: 'bg-blue-100 text-blue-800' },
                  traite: { label: 'Traité', cls: 'bg-indigo-100 text-indigo-800' },
                  valide: { label: 'Validé', cls: 'bg-emerald-100 text-emerald-800' },
                }
                const st = STATUT_MAP[doc.statut] ?? { label: doc.statut, cls: 'bg-gray-100 text-gray-800' }
                return (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-navy-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-navy-400" />
                      <div>
                        <p className="font-medium text-navy-900">
                          {doc.nom}
                          {isNew && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white uppercase">Nouveau</span>}
                        </p>
                        <p className="text-xs text-navy-400">
                          {doc.uploaded_by === 'client' ? '📤 Client' : '📥 Cabinet'} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div className="space-y-3 min-h-[300px] max-h-[400px] overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-sm text-navy-400 text-center py-12">Aucun message</p>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.expediteur === 'Cabinet' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${msg.expediteur === 'Cabinet' ? 'bg-emerald-500 text-white' : 'bg-white border border-navy-200 text-navy-900'}`}>
                    <p className="font-medium text-xs opacity-70 mb-1">{msg.expediteur}</p>
                    <p>{msg.message}</p>
                    <p className="text-xs opacity-50 mt-1">{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage() } }}
                placeholder="Message au client..."
                className="flex-1 px-4 py-2.5 bg-white border-2 border-navy-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-emerald-500"
              />
              <Button onClick={() => void sendMessage()} loading={sending} icon={<Send className="w-4 h-4" />} disabled={!newMessage.trim()}>Envoyer</Button>
            </div>
          </div>
        )}

        {activeTab === 'factures' && (
          <Card className="text-center py-12 text-navy-500 text-sm">
            <Receipt className="w-8 h-8 mx-auto mb-3 text-navy-300" />
            Associez ce client à un dossier pour voir ses factures
          </Card>
        )}
      </div>
    </AppShell>
  )
}
