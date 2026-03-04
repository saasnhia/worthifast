import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-01-28.clover' })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { amount, invoiceId, description } = await req.json() as {
      amount: number
      invoiceId: string
      description?: string
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }
    if (!invoiceId) {
      return NextResponse.json({ error: 'ID facture requis' }, { status: 400 })
    }

    // Verify invoice ownership
    const { data: facture } = await supabase
      .from('factures_clients')
      .select('id, numero_facture')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single()

    if (!facture) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: description ?? `Facture ${facture.numero_facture}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      metadata: {
        invoice_id: invoiceId,
        user_id: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      url: paymentLink.url,
      id: paymentLink.id,
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur Stripe' },
      { status: 500 }
    )
  }
}
