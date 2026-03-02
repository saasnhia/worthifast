'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, FileText, MessageSquare, ExternalLink, Loader2, X } from 'lucide-react'

interface PortailEntry {
  id: string
  client_id: string | null
  client_email: string
  client_nom: string
  token: string
  actif: boolean
  derniere_connexion: string | null
  created_at: string
  docs_count?: number
  messages_count?: number
}

export default function PortailDashboard() {
  const router = useRouter()
  const [portails, setPortails] = useState<PortailEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [invitEmail, setInvitEmail] = useState('')
  const [invitNom, setInvitNom] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const fetchPortails = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portail/liste')
      const data = await res.json()
      if (data.success) setPortails(data.portails ?? [])
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { void fetchPortails() }, [])

  const handleInvite = async () => {
    if (!invitEmail.trim() || !invitNom.trim()) return
    setInviting(true)
    try {
      const res = await fetch('/api/portail/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_email: invitEmail, client_nom: invitNom }),
      })
      const data = await res.json()
      if (data.success) {
        setInviteSuccess(data.portal_url)
        setInvitEmail('')
        setInvitNom('')
        void fetchPortails()
      }
    } catch { /* silent */ }
    setInviting(false)
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Portail Clients</h1>
            <p className="text-navy-500 text-sm mt-1">Espace collaboratif sécurisé pour vos clients</p>
          </div>
          <Button onClick={() => setShowInvite(true)} icon={<Plus className="w-4 h-4" />}>
            Inviter un client
          </Button>
        </div>

        {/* Invite modal */}
        {showInvite && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md relative">
              <button onClick={() => { setShowInvite(false); setInviteSuccess(null) }}
                className="absolute top-4 right-4 text-navy-400 hover:text-navy-700">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-navy-900 mb-4">Inviter un client</h2>
              {inviteSuccess ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-sm text-emerald-800 font-medium">Invitation envoyée !</p>
                    <p className="text-xs text-emerald-600 mt-1">Lien portail :</p>
                    <p className="text-xs font-mono text-emerald-700 mt-1 break-all">{inviteSuccess}</p>
                  </div>
                  <Button onClick={() => setShowInvite(false)}>Fermer</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input label="Nom du client" value={invitNom} onChange={e => setInvitNom(e.target.value)} placeholder="SARL Dupont" />
                  <Input label="Email du client" type="email" value={invitEmail} onChange={e => setInvitEmail(e.target.value)} placeholder="contact@dupont.fr" />
                  <Button onClick={() => void handleInvite()} loading={inviting} disabled={!invitEmail.trim() || !invitNom.trim()}>
                    Envoyer l&apos;invitation
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : portails.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-navy-500 mb-4">Aucun portail client activé</p>
            <Button onClick={() => setShowInvite(true)} icon={<Plus className="w-4 h-4" />}>
              Inviter votre premier client
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {portails.map(p => (
              <div key={p.id} className="bg-white border border-navy-100 rounded-2xl p-5 hover:shadow-sm transition-shadow flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg flex-shrink-0">
                  {p.client_nom.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy-900">{p.client_nom}</p>
                  <p className="text-sm text-navy-500">{p.client_email}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-navy-400">
                    {p.derniere_connexion && (
                      <span>Dernière connexion : {new Date(p.derniere_connexion).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline"
                    icon={<FileText className="w-4 h-4" />}
                    onClick={() => router.push(`/portail/cabinet/${p.client_id ?? p.id}`)}>
                    Gérer
                  </Button>
                  <a href={`${baseUrl}/portail/${p.token}`} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 text-navy-400 hover:text-navy-700 transition-colors" title="Ouvrir le portail client">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
