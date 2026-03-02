'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout'
import { DocumentsList } from '@/components/commercial/DocumentsList'
import { AbonnementsRecurrents } from '@/components/commercial/AbonnementsRecurrents'
import { ShoppingCart, RefreshCw, Package, Upload } from 'lucide-react'
import Link from 'next/link'

type Tab = 'documents' | 'abonnements'

export default function CommercialPage() {
  const [tab, setTab] = useState<Tab>('documents')

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6 text-emerald-500" />
              <h1 className="text-2xl font-bold text-gray-900">Gestion Commerciale</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">Devis, bons de commande, livraisons, factures et avoirs</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/commercial/catalogue"
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              <Package className="w-4 h-4" />
              Catalogue
            </Link>
            <Link href="/commercial/imports"
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              <Upload className="w-4 h-4" />
              Imports
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
          <button onClick={() => setTab('documents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'documents' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}>
            <ShoppingCart className="w-4 h-4" />
            Documents
          </button>
          <button onClick={() => setTab('abonnements')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'abonnements' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}>
            <RefreshCw className="w-4 h-4" />
            Récurrents
          </button>
        </div>

        {tab === 'documents' && <DocumentsList />}
        {tab === 'abonnements' && <AbonnementsRecurrents />}
      </div>
    </AppShell>
  )
}
