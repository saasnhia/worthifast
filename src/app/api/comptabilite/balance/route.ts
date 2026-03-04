import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const now = new Date()
    const startN = new Date(now.getFullYear(), 0, 1).toISOString()
    const endN = now.toISOString()
    const startN1 = new Date(now.getFullYear() - 1, 0, 1).toISOString()
    const endN1 = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString()

    // Fetch current year transactions
    const { data: transN } = await supabase
      .from('transactions')
      .select('category, amount, type')
      .eq('user_id', user.id)
      .gte('date', startN)
      .lte('date', endN)

    // Fetch N-1 transactions
    const { data: transN1 } = await supabase
      .from('transactions')
      .select('category, amount, type')
      .eq('user_id', user.id)
      .gte('date', startN1)
      .lte('date', endN1)

    // Group by category
    const groupBy = (transactions: typeof transN) => {
      const map = new Map<string, { total: number; count: number }>()
      for (const t of transactions ?? []) {
        const cat = t.category || 'Non catégorisé'
        const existing = map.get(cat) ?? { total: 0, count: 0 }
        const signed = t.type === 'income' ? t.amount : -t.amount
        map.set(cat, { total: existing.total + signed, count: existing.count + 1 })
      }
      return map
    }

    const mapN = groupBy(transN)
    const mapN1 = groupBy(transN1)

    // Merge all categories
    const allCats = new Set([...mapN.keys(), ...mapN1.keys()])
    const rows = Array.from(allCats).map(category => ({
      category,
      totalN: mapN.get(category)?.total ?? 0,
      totalN1: mapN1.get(category)?.total ?? 0,
      count: mapN.get(category)?.count ?? 0,
    })).sort((a, b) => a.category.localeCompare(b.category))

    return NextResponse.json({ success: true, rows })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
