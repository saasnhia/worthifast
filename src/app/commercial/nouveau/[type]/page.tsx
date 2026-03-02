'use client'

import { use } from 'react'
import { AppShell } from '@/components/layout'
import { DocumentForm } from '@/components/commercial/DocumentForm'
import type { DocumentType } from '@/types'
import { notFound } from 'next/navigation'

const VALID_TYPES: DocumentType[] = ['devis', 'bon_commande', 'bon_livraison', 'proforma', 'avoir', 'facture_recurrente']

const TYPE_LABELS: Record<DocumentType, string> = {
  devis: 'Nouveau devis',
  bon_commande: 'Nouveau bon de commande',
  bon_livraison: 'Nouveau bon de livraison',
  proforma: 'Nouvelle facture proforma',
  avoir: 'Nouvel avoir',
  facture_recurrente: 'Nouvelle facture',
}

export default function NouveauDocumentPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params)

  if (!VALID_TYPES.includes(type as DocumentType)) {
    notFound()
  }

  const docType = type as DocumentType

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{TYPE_LABELS[docType]}</h1>
          <p className="text-sm text-gray-500 mt-1">Remplissez les informations ci-dessous</p>
        </div>
        <DocumentForm mode="create" type={docType} />
      </div>
    </AppShell>
  )
}
