import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFacturesEnRetard, calculNiveauRelance } from '@/lib/relances/engine'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const factures = await getFacturesEnRetard(user.id)

    const { data: configRow } = await supabase
      .from('relances_config')
      .select('delai_j1, delai_j2, delai_j3, ton, signature, actif')
      .eq('user_id', user.id)
      .maybeSingle()

    const config = configRow ?? { actif: false, delai_j1: 7, delai_j2: 15, delai_j3: 30, ton: 'cordial', signature: null }

    const facturesWithNiveau = factures.map(f => ({
      ...f,
      niveau: calculNiveauRelance(f.jours_retard, config),
    }))

    return NextResponse.json({ success: true, factures: facturesWithNiveau })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
