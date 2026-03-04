'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { FactureClient, StatutPaiement } from '@/types'
import { calculTotaux } from '@/lib/factures/calculs'
import { ChevronRight, Pencil, Printer, Copy, Trash2, Loader2, CheckCircle, Link2, CreditCard } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

const STATUT_LABELS: Record<StatutPaiement, string> = {
  en_attente: 'En attente',
  payee: 'Payée',
  en_retard: 'En retard',
  partiellement_payee: 'Partiellement payée',
}

const STATUT_COLORS: Record<StatutPaiement, string> = {
  en_attente: 'bg-amber-100 text-amber-800',
  payee: 'bg-emerald-100 text-emerald-800',
  en_retard: 'bg-red-100 text-red-800',
  partiellement_payee: 'bg-blue-100 text-blue-800',
}

export default function FactureDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [facture, setFacture] = useState<FactureClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/factures/clients/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFacture(d.facture)
        else setError(d.error ?? 'Facture introuvable')
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false))
  }, [id])

  const handleMarkPaid = async () => {
    if (!facture) return
    setMarkingPaid(true)
    try {
      const res = await fetch(`/api/factures/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut_paiement: 'payee',
          montant_paye: facture.montant_ttc,
          date_dernier_paiement: new Date().toISOString().split('T')[0],
        }),
      })
      const d = await res.json()
      if (d.success) {
        setFacture(d.facture)
        toast.success('Facture marquée comme payée')
      } else {
        toast.error(d.error ?? 'Erreur')
      }
    } catch { toast.error('Erreur réseau') }
    setMarkingPaid(false)
  }

  const handleGeneratePaymentLink = async () => {
    if (!facture) return
    setGeneratingLink(true)
    try {
      const res = await fetch('/api/stripe/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: facture.montant_ttc,
          invoiceId: facture.id,
          description: `Facture ${facture.numero_facture}`,
        }),
      })
      const d = await res.json()
      if (d.success) {
        setPaymentLinkUrl(d.url)
        await navigator.clipboard.writeText(d.url)
        toast.success('Lien de paiement copié !')
      } else {
        toast.error(d.error ?? 'Erreur Stripe')
      }
    } catch { toast.error('Erreur réseau') }
    setGeneratingLink(false)
  }

  const handleDelete = async () => {
    if (!facture || !confirm(`Supprimer la facture ${facture.numero_facture} ?`)) return
    setDeleting(true)
    const res = await fetch(`/api/factures/clients/${id}`, { method: 'DELETE' })
    const d = await res.json()
    if (d.success) router.push('/factures?tab=clients')
    else { alert(d.error ?? 'Erreur'); setDeleting(false) }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      </AppShell>
    )
  }

  if (error || !facture) {
    return (
      <AppShell>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-red-600">{error ?? 'Facture introuvable'}</p>
          <Link href="/factures" className="text-emerald-600 underline mt-2 block">
            Retour aux factures
          </Link>
        </main>
      </AppShell>
    )
  }

  const totaux = calculTotaux(facture.lignes ?? [], facture.remise_percent ?? 0)

  return (
    <AppShell>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-navy-500 mb-6">
          <Link href="/factures?tab=clients" className="hover:text-navy-900">Factures</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-navy-900 font-medium">{facture.numero_facture}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-bold text-navy-900">{facture.numero_facture}</h1>
            {facture.objet && <p className="text-navy-500 mt-1">{facture.objet}</p>}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUT_COLORS[facture.statut_paiement]}`}>
            {STATUT_LABELS[facture.statut_paiement]}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={<Pencil className="w-4 h-4" />}
            onClick={() => router.push(`/factures/${id}/modifier`)}
          >
            Modifier
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.open(`/factures/${id}/print`, '_blank')}
          >
            Aperçu / Imprimer
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Copy className="w-4 h-4" />}
            onClick={() => router.push(`/factures/nouvelle?from=${id}`)}
          >
            Dupliquer
          </Button>
          {facture.statut_paiement !== 'payee' && (
            <Button
              variant="primary"
              size="sm"
              loading={markingPaid}
              icon={<CheckCircle className="w-4 h-4" />}
              onClick={handleMarkPaid}
            >
              Marquer payée
            </Button>
          )}
          {facture.statut_paiement !== 'payee' && (
            <Button
              variant="outline"
              size="sm"
              loading={generatingLink}
              icon={<CreditCard className="w-4 h-4" />}
              onClick={handleGeneratePaymentLink}
            >
              Lien de paiement
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            loading={deleting}
            icon={<Trash2 className="w-4 h-4" />}
            onClick={handleDelete}
          >
            Supprimer
          </Button>
        </div>

        {/* Payment link banner */}
        {paymentLinkUrl && (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-6">
            <Link2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-800">Lien de paiement actif</p>
              <p className="text-xs font-mono text-emerald-600 truncate">{paymentLinkUrl}</p>
            </div>
            <button
              onClick={() => { void navigator.clipboard.writeText(paymentLinkUrl); toast.success('Copié !') }}
              className="text-xs px-2 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Copier
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Infos facture */}
          <Card>
            <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wide mb-4">Détails</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-500">Client</dt>
                <dd className="font-medium text-navy-900">{facture.client?.nom ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-500">Date d&apos;émission</dt>
                <dd className="text-navy-900">{new Date(facture.date_emission).toLocaleDateString('fr-FR')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-500">Échéance</dt>
                <dd className="text-navy-900">{new Date(facture.date_echeance).toLocaleDateString('fr-FR')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-500">Conditions</dt>
                <dd className="text-navy-900">{facture.conditions_paiement ?? '—'}</dd>
              </div>
            </dl>
          </Card>

          {/* Totaux */}
          <Card>
            <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wide mb-4">Montants</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-500">Total HT</dt>
                <dd className="font-mono text-navy-900">{totaux.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</dd>
              </div>
              {(facture.remise_percent ?? 0) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-navy-500">Remise {facture.remise_percent}%</dt>
                  <dd className="font-mono text-red-600">-{totaux.remiseAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-navy-500">TVA</dt>
                <dd className="font-mono text-navy-900">{totaux.totalTVA.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</dd>
              </div>
              <div className="flex justify-between font-semibold border-t border-navy-100 pt-2">
                <dt className="text-navy-900">Total TTC</dt>
                <dd className="font-mono text-emerald-600">{totaux.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</dd>
              </div>
              {facture.montant_paye > 0 && (
                <div className="flex justify-between text-blue-700">
                  <dt>Déjà payé</dt>
                  <dd className="font-mono">{facture.montant_paye.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>

        {/* Lignes */}
        {facture.lignes && facture.lignes.length > 0 && (
          <Card padding="none" className="mt-6">
            <div className="px-6 py-4 border-b border-navy-100">
              <h2 className="text-base font-semibold text-navy-900">Lignes</h2>
            </div>
            <div className="divide-y divide-navy-100">
              {facture.lignes.map((ligne, i) => (
                <div key={i} className="px-6 py-3 grid grid-cols-[3fr_1fr_1.5fr_1fr_1fr] gap-4 text-sm">
                  <span className="text-navy-900">{ligne.description}</span>
                  <span className="text-navy-500">{ligne.quantite}</span>
                  <span className="font-mono text-navy-700">
                    {ligne.prix_unitaire_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                  <span className="text-navy-500">TVA {ligne.taux_tva}%</span>
                  <span className="font-mono text-navy-900 text-right">
                    {(ligne.quantite * ligne.prix_unitaire_ht).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {facture.notes && (
          <Card className="mt-6">
            <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wide mb-2">Notes</h2>
            <p className="text-sm text-navy-700 whitespace-pre-wrap">{facture.notes}</p>
          </Card>
        )}
      </main>
    </AppShell>
  )
}
