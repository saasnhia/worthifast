import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface MessageParam {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { message, conversation_history = [] } = await req.json() as {
      message: string
      conversation_history: MessageParam[]
    }
    if (!message?.trim()) return NextResponse.json({ error: 'Message requis' }, { status: 400 })

    // Fetch agent with docs
    const { data: agent, error: agentErr } = await supabase
      .from('agents_ia_custom')
      .select('*, docs:agents_ia_custom_docs(*)')
      .eq('id', id).eq('user_id', user.id).single()

    if (agentErr || !agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })
    if (!agent.actif) return NextResponse.json({ error: 'Agent désactivé' }, { status: 400 })

    // Build system prompt with docs context
    let systemPrompt = agent.system_prompt
    if (agent.docs && agent.docs.length > 0) {
      const docsContext = agent.docs
        .map((d: { nom?: string; contenu?: string }) => `=== ${d.nom ?? 'Document'} ===\n${d.contenu ?? ''}`)
        .join('\n\n')
      systemPrompt += `\n\n--- BASE DE CONNAISSANCES DU CABINET ---\n${docsContext}`
    }

    // Build messages
    const messages: MessageParam[] = [
      ...conversation_history.slice(-10),
      { role: 'user', content: message },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      temperature: agent.temperature ?? 0.3,
      system: systemPrompt,
      messages,
    })

    const responseText = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens

    // Increment conversation count (non-blocking)
    void supabase
      .from('agents_ia_custom')
      .update({ nb_conversations: (agent.nb_conversations ?? 0) + 1 })
      .eq('id', id)
      .then(() => {/* non-critical */})

    return NextResponse.json({ success: true, response: responseText, tokens_used: tokensUsed })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur IA'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
