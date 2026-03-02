'use client'

import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout'
import { FactureClientForm } from '@/components/factures/FactureClientForm'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function ModifierFacturePage() {
  const { id } = useParams<{ id: string }>()

  return (
    <AppShell>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center gap-2 text-sm text-navy-500 mb-6">
          <Link href="/factures?tab=clients" className="hover:text-navy-900">Factures</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/factures/${id}`} className="hover:text-navy-900">Facture</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-navy-900 font-medium">Modifier</span>
        </nav>

        <h1 className="text-2xl font-display font-bold text-navy-900 mb-6">
          Modifier la facture
        </h1>

        <FactureClientForm mode="edit" factureId={id} />
      </main>
    </AppShell>
  )
}
