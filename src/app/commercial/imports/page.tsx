'use client'

import { useState, useRef, useCallback } from 'react'
import { AppShell } from '@/components/layout'
import { Upload, FileText, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'
import type { ImportEcriture } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  encaissement: 'Encaissements',
  vente_ecommerce: 'Ventes e-commerce',
  caisse: 'Caisse',
  paie: 'Paie',
  tiers: 'Tiers divers',
}

const STATUT_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  en_cours: { label: 'En cours', icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-600' },
  termine: { label: 'Terminé', icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-600' },
  erreur: { label: 'Erreur', icon: <XCircle className="w-4 h-4" />, color: 'text-red-600' },
}

export default function ImportsPage() {
  const [imports, setImports] = useState<ImportEcriture[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; nb_importees?: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchImports = useCallback(async () => {
    try {
      const res = await fetch('/api/imports/ecritures')
      const data = await res.json()
      if (data.success) setImports(data.imports ?? [])
    } catch { /* silent */ }
  }, [])

  const handleFile = async (file: File) => {
    if (!file) return
    setUploading(true)
    setLastResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/imports/ecritures', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        setLastResult({ success: true, message: data.message ?? 'Import réussi', nb_importees: data.nb_importees })
        await fetchImports()
      } else {
        setLastResult({ success: false, message: data.error ?? 'Erreur lors de l\'import' })
      }
    } catch (e) {
      setLastResult({ success: false, message: 'Erreur réseau' })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="w-6 h-6 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Import d'écritures</h1>
            <p className="text-sm text-gray-500 mt-0.5">Importez vos données CSV — encaissements, ventes, caisse, paie, tiers</p>
          </div>
        </div>

        {/* Zone de dépôt */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-colors mb-6 ${
            dragging ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
          }`}
        >
          <input ref={fileRef} type="file" accept=".csv,.txt,.xls,.xlsx" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f) }} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-sm font-medium text-gray-700">Import en cours...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-10 h-10 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Déposez votre fichier ici</p>
                <p className="text-xs text-gray-500 mt-1">ou cliquez pour sélectionner — CSV, TXT, XLS, XLSX</p>
              </div>
            </div>
          )}
        </div>

        {/* Résultat du dernier import */}
        {lastResult && (
          <div className={`flex items-start gap-3 p-4 rounded-xl mb-6 ${lastResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            {lastResult.success
              ? <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              : <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
            <div>
              <p className={`text-sm font-medium ${lastResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                {lastResult.message}
              </p>
              {lastResult.nb_importees !== undefined && (
                <p className="text-xs text-emerald-600 mt-0.5">{lastResult.nb_importees} écritures importées</p>
              )}
            </div>
          </div>
        )}

        {/* Types attendus */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Types de fichiers supportés</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Le type est détecté automatiquement selon les colonnes du fichier (date, montant, libellé, compte…)
          </p>
        </div>

        {/* Historique */}
        {imports.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Historique des imports</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {imports.map(imp => {
                const statut = STATUT_CONFIG[imp.statut] ?? { label: imp.statut, icon: null, color: 'text-gray-500' }
                return (
                  <div key={imp.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{imp.fichier_nom ?? 'Fichier inconnu'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {imp.type && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {TYPE_LABELS[imp.type] ?? imp.type}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(imp.created_at).toLocaleString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {imp.nb_importees !== undefined && (
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{imp.nb_importees}</p>
                          <p className="text-xs text-gray-400">importées</p>
                        </div>
                      )}
                      <div className={`flex items-center gap-1.5 ${statut.color}`}>
                        {statut.icon}
                        <span className="text-xs font-medium">{statut.label}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {imports.length === 0 && !uploading && (
          <div className="text-center py-8">
            <p className="text-xs text-gray-400">Aucun import effectué pour le moment</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
