'use client'

import { AppShell } from '@/components/layout'
import { AgentCreatorWizard } from '@/components/ia/AgentCreatorWizard'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function CreerAgentPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm text-navy-500 mb-6">
          <Link href="/ia" className="hover:text-navy-900">Assistant IA</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/ia/mes-agents" className="hover:text-navy-900">Mes agents</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-navy-900 font-medium">Créer un agent</span>
        </nav>
        <h1 className="text-2xl font-bold text-navy-900 mb-6">Créer un agent IA personnalisé</h1>
        <AgentCreatorWizard mode="create" />
      </div>
    </AppShell>
  )
}
