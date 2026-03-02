import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email-sender'

async function getPortailByToken(token: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('portail_acces')
    .select('*')
    .eq('token', token)
    .eq('actif', true)
    .single()
  return { supabase, portail: data }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const { supabase, portail } = await getPortailByToken(token)
    if (!portail) return NextResponse.json({ error: 'Portail introuvable' }, { status: 404 })

    const { data: documents, error } = await supabase
      .from('portail_documents')
      .select('*')
      .eq('portail_id', portail.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, documents: documents ?? [], portail })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const { supabase, portail } = await getPortailByToken(token)
    if (!portail) return NextResponse.json({ error: 'Portail introuvable' }, { status: 404 })

    const body = await req.json()
    const { nom, url, type = 'autre', uploaded_by = 'client', commentaire } = body

    const { data: doc, error } = await supabase
      .from('portail_documents')
      .insert({
        portail_id: portail.id,
        nom: nom?.trim() ?? 'Document',
        url: url ?? null,
        type,
        uploaded_by,
        statut: 'en_attente',
        commentaire: commentaire?.trim() ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update last connection (non-critical, fire-and-forget)
    void (async () => { try { await supabase.from('portail_acces').update({ derniere_connexion: new Date().toISOString() }).eq('id', portail.id) } catch { /* non-critical */ } })()

    // Notify cabinet if client uploaded
    if (uploaded_by === 'client') {
      const { data: cabinetUser } = await supabase.auth.admin
        .getUserById(portail.cabinet_user_id)
        .catch(() => ({ data: null }))

      if (cabinetUser?.user?.email) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://finpilote.vercel.app'
        void sendEmail({
          from: process.env.RESEND_FROM_EMAIL ?? 'noreply@finpilote.app',
          to: [cabinetUser.user.email],
          subject: `Nouveau document déposé — ${portail.client_nom}`,
          html: `<p>${portail.client_nom} a déposé un nouveau document : <strong>${nom ?? 'Document'}</strong>.</p>
                 <a href="${baseUrl}/portail/${portail.client_id ?? ''}">Voir le portail</a>`,
        }).catch(() => {/* non-critical */})
      }
    }

    return NextResponse.json({ success: true, document: doc }, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
