'use client'

import { useState, useEffect, useCallback } from 'react'
import type { FactureClient } from '@/types'

interface Filters {
  statut?: string
  clientId?: string
  search?: string
}

interface UseFacturesClientsReturn {
  factures: FactureClient[]
  loading: boolean
  error: string | null
  filters: Filters
  setFilters: (f: Filters) => void
  refresh: () => void
  createFacture: (data: Partial<FactureClient>) => Promise<FactureClient>
  updateFacture: (id: string, data: Partial<FactureClient>) => Promise<FactureClient>
  deleteFacture: (id: string) => Promise<void>
}

export function useFacturesClients(): UseFacturesClientsReturn {
  const [factures, setFactures] = useState<FactureClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({})
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (filters.statut) params.set('statut', filters.statut)
    if (filters.clientId) params.set('client_id', filters.clientId)
    if (filters.search) params.set('search', filters.search)

    fetch(`/api/factures/clients?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.success) {
          setFactures(data.factures ?? [])
        } else {
          setError(data.error ?? 'Erreur')
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur réseau')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [filters, refreshKey])

  const createFacture = useCallback(async (data: Partial<FactureClient>): Promise<FactureClient> => {
    const res = await fetch('/api/factures/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error ?? 'Erreur création')
    refresh()
    return json.facture as FactureClient
  }, [refresh])

  const updateFacture = useCallback(async (id: string, data: Partial<FactureClient>): Promise<FactureClient> => {
    const res = await fetch(`/api/factures/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error ?? 'Erreur mise à jour')
    refresh()
    return json.facture as FactureClient
  }, [refresh])

  const deleteFacture = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/factures/clients/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.success) throw new Error(json.error ?? 'Erreur suppression')
    refresh()
  }, [refresh])

  return { factures, loading, error, filters, setFilters, refresh, createFacture, updateFacture, deleteFacture }
}
