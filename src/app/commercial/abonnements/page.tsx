'use client'

import { AppShell } from '@/components/layout'
import { AbonnementsRecurrents } from '@/components/commercial/AbonnementsRecurrents'
import { RefreshCw } from 'lucide-react'

export default function AbonnementsPage() {
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <RefreshCw className="w-6 h-6 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Abonnements récurrents</h1>
            <p className="text-sm text-gray-500 mt-0.5">Facturation automatique selon la fréquence définie</p>
          </div>
        </div>
        <AbonnementsRecurrents />
      </div>
    </AppShell>
  )
}
