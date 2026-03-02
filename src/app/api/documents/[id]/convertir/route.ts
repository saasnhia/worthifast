import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  devisToFacture,
  devisToCommande,
  commandeToLivraison,
  factureToAvoir,
} from '@/lib/documents/conversion'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { vers, montant } = await req.json() as {
      vers: 'facture' | 'commande' | 'livraison' | 'avoir'
      montant?: number
    }

    if (!vers) return NextResponse.json({ error: 'vers requis' }, { status: 400 })

    let result: { success: boolean; document?: unknown; error?: string }

    switch (vers) {
      case 'facture':
        result = await devisToFacture(id, supabase, user.id)
        break
      case 'commande':
        result = await devisToCommande(id, supabase, user.id)
        break
      case 'livraison':
        result = await commandeToLivraison(id, supabase, user.id)
        break
      case 'avoir':
        result = await factureToAvoir(id, supabase, user.id, montant)
        break
      default:
        return NextResponse.json({ error: `Conversion inconnue: ${vers}` }, { status: 400 })
    }

    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true, document: result.document }, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
