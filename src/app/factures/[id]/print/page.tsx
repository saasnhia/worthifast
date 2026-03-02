'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { calculTotaux } from '@/lib/factures/calculs'
import type { FactureClient } from '@/types'

export default function PrintFacturePage() {
  const { id } = useParams<{ id: string }>()
  const [facture, setFacture] = useState<FactureClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/factures/clients/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFacture(d.facture)
        else setError(d.error ?? 'Introuvable')
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (facture) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [facture])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
      </div>
    )
  }
  if (error || !facture) {
    return <div className="p-8 text-red-600">{error ?? 'Facture introuvable'}</div>
  }

  const totaux = calculTotaux(facture.lignes ?? [], facture.remise_percent ?? 0)

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1e293b; background: white; }
      `}</style>

      {/* Print button — hidden on print */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
        >
          Imprimer
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Fermer
        </button>
      </div>

      <div className="max-w-[210mm] mx-auto bg-white p-10 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">FACTURE</h1>
            <p className="text-lg font-semibold text-emerald-600">{facture.numero_facture}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Date d&apos;émission : <strong>{new Date(facture.date_emission).toLocaleDateString('fr-FR')}</strong></p>
            <p>Date d&apos;échéance : <strong>{new Date(facture.date_echeance).toLocaleDateString('fr-FR')}</strong></p>
            <p>Conditions : {facture.conditions_paiement ?? '30 jours'}</p>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Émetteur</p>
            <p className="font-semibold text-gray-900">Votre entreprise</p>
            <p className="text-gray-600 text-sm">Adresse, ville, CP</p>
            <p className="text-gray-600 text-sm">SIRET : XXXXXXXXXXXXXX</p>
            <p className="text-gray-600 text-sm">TVA : FR XXXXXXXXXXXX</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Client</p>
            <p className="font-semibold text-gray-900">{facture.client?.nom ?? '—'}</p>
            {facture.client?.adresse && <p className="text-gray-600 text-sm whitespace-pre-line">{facture.client.adresse}</p>}
            {facture.client?.email && <p className="text-gray-600 text-sm">{facture.client.email}</p>}
            {facture.client?.siren && <p className="text-gray-600 text-sm">SIREN : {facture.client.siren}</p>}
          </div>
        </div>

        {facture.objet && (
          <p className="mb-6 text-sm text-gray-700">
            <strong>Objet :</strong> {facture.objet}
          </p>
        )}

        {/* Lignes */}
        <table className="w-full mb-8" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th className="text-left py-2 px-3 text-xs font-bold text-gray-600 uppercase">Description</th>
              <th className="text-right py-2 px-3 text-xs font-bold text-gray-600 uppercase">Qté</th>
              <th className="text-right py-2 px-3 text-xs font-bold text-gray-600 uppercase">PU HT</th>
              <th className="text-right py-2 px-3 text-xs font-bold text-gray-600 uppercase">TVA</th>
              <th className="text-right py-2 px-3 text-xs font-bold text-gray-600 uppercase">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {(facture.lignes ?? []).map((ligne, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td className="py-2 px-3 text-sm text-gray-900">{ligne.description || '—'}</td>
                <td className="py-2 px-3 text-sm text-gray-700 text-right">{ligne.quantite}</td>
                <td className="py-2 px-3 text-sm text-gray-700 text-right font-mono">
                  {ligne.prix_unitaire_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </td>
                <td className="py-2 px-3 text-sm text-gray-700 text-right">{ligne.taux_tva}%</td>
                <td className="py-2 px-3 text-sm text-gray-900 text-right font-mono font-semibold">
                  {(ligne.quantite * ligne.prix_unitaire_ht).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="flex justify-end mb-10">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total HT</span>
              <span className="font-mono">{totaux.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
            </div>
            {(facture.remise_percent ?? 0) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Remise {facture.remise_percent}%</span>
                <span className="font-mono">-{totaux.remiseAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
              </div>
            )}
            {Object.entries(totaux.tvaParTaux).map(([taux, montant]) =>
              montant > 0 ? (
                <div key={taux} className="flex justify-between text-gray-600">
                  <span>TVA {taux}%</span>
                  <span className="font-mono">{montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                </div>
              ) : null
            )}
            <div className="flex justify-between font-bold text-base border-t border-gray-300 pt-2">
              <span>Total TTC</span>
              <span className="font-mono text-emerald-700">
                {totaux.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </span>
            </div>
            {facture.montant_paye > 0 && (
              <>
                <div className="flex justify-between text-blue-700">
                  <span>Acompte versé</span>
                  <span className="font-mono">{facture.montant_paye.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                </div>
                <div className="flex justify-between font-bold text-red-700">
                  <span>Reste à payer</span>
                  <span className="font-mono">
                    {(totaux.totalTTC - facture.montant_paye).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {facture.notes && (
          <div className="mb-8 p-4 bg-gray-50 rounded text-sm text-gray-700">
            <strong>Notes :</strong> {facture.notes}
          </div>
        )}

        {/* Mentions légales */}
        <div className="border-t border-gray-200 pt-6 text-xs text-gray-500 space-y-1">
          <p>En cas de retard de paiement, des pénalités de retard au taux de 3 fois le taux d&apos;intérêt légal sont applicables (art. L.441-10 du Code de commerce).</p>
          <p>Une indemnité forfaitaire de 40 € pour frais de recouvrement est due en cas de retard (décret n° 2012-1115).</p>
          <p>TVA acquittée sur les débits. Exonération de TVA selon l&apos;article 293B du CGI si applicable.</p>
        </div>
      </div>
    </>
  )
}
