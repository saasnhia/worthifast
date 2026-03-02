'use client'

import { use, useState, useEffect } from 'react'
import { AppShell } from '@/components/layout'
import { DocumentForm } from '@/components/commercial/DocumentForm'
import type { DocumentType } from '@/types'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function ModifierDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [type, setType] = useState<DocumentType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setType(data.document.type as DocumentType)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <AppShell>
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    </AppShell>
  )

  if (!type) return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">Document introuvable</p>
        <Link href="/commercial" className="text-emerald-600 hover:underline text-sm mt-2 block">Retour</Link>
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/commercial/${id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Modifier le document</h1>
            <p className="text-sm text-gray-500 mt-0.5">Apportez vos modifications puis enregistrez</p>
          </div>
        </div>
        <DocumentForm mode="edit" type={type} documentId={id} />
      </div>
    </AppShell>
  )
}
