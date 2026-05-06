import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, jobDescription, experiences, styleDNA, applicationId } = await req.json()

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Build the system prompt
  const styleContext = styleDNA && Object.keys(styleDNA).length > 0
    ? `\n\nDe gebruiker heeft een schrijfstijl DNA: ${JSON.stringify(styleDNA, null, 2)}\nGebruik deze stijl EXACT bij het schrijven van de brief.`
    : '\n\nDe gebruiker heeft nog geen schrijfstijl geüpload. Schrijf in een professionele maar persoonlijke Nederlandse stijl.'

  const experienceContext = experiences?.length > 0
    ? `\n\nErvaringen van de gebruiker:\n${experiences.map((e: any) =>
        `- ${e.job_title} bij ${e.company}: ${e.description || ''} Skills: ${(e.skills || []).join(', ')}`
      ).join('\n')}`
    : '\n\nDe gebruiker heeft nog geen ervaringen ingevuld.'

  const systemPrompt = `Je bent een scherpe, empathische AI Career Agent die mensen helpt de perfecte baan te krijgen.
Je naam is "Career Agent". Je spreekt altijd in het Nederlands.

Jouw werkwijze:
1. Als een gebruiker een vacature deelt, analyseer je EERST de gap tussen de vacature en de ervaringen.
2. Je stelt dan 2-3 GERICHTE vragen om ontbrekende info op te halen (niet direct een brief schrijven!).
3. PAS na antwoord van de gebruiker schrijf je een motivatiebrief die perfect aansluit bij de vacature EN bij de schrijfstijl van de gebruiker.
4. Je geeft ook een match-score (0-100) en concrete tips.

Gebruiker: ${profile?.full_name || 'Onbekend'}
${experienceContext}
${styleContext}

Wanneer je een volledige brief hebt gegenereerd, sluit je je bericht altijd af met:
[BRIEF_GEGENEREERD]
[MATCH_SCORE: XX]`

  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Stream de response
  ;(async () => {
    try {
      let fullResponse = ''

      const anthropicMessages = messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: anthropicMessages,
        stream: true,
      })

      for await (const event of response) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text
          fullResponse += text
          await writer.write(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        }
      }

      // Save to DB if a letter was generated
      if (fullResponse.includes('[BRIEF_GEGENEREERD]') && applicationId) {
        const matchMatch = fullResponse.match(/\[MATCH_SCORE:\s*(\d+)\]/)
        const matchScore = matchMatch ? parseInt(matchMatch[1]) : null

        // Extract the letter (text before the tags)
        const letterText = fullResponse
          .replace(/\[BRIEF_GEGENEREERD\][\s\S]*$/, '')
          .trim()

        await supabase
          .from('applications')
          .update({ cover_letter: letterText, match_score: matchScore })
          .eq('id', applicationId)
      }

      await writer.write(encoder.encode('data: [DONE]\n\n'))
    } catch (err: any) {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`))
    } finally {
      await writer.close()
    }
  })()

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
