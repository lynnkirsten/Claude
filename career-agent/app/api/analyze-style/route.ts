import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { documents } = await req.json()

  if (!documents || documents.length === 0) {
    return NextResponse.json({ error: 'Geen documenten aangeleverd' }, { status: 400 })
  }

  const combinedText = documents.map((d: string, i: number) =>
    `=== Document ${i + 1} ===\n${d}`
  ).join('\n\n')

  const prompt = `Analyseer de volgende motivatiebrief(ven) en maak een gedetailleerd "Schrijfstijl DNA" profiel in JSON.

${combinedText}

Geef een JSON object terug met:
{
  "toon": "formeel/informeel/persoonlijk/zakelijk",
  "structuur": "beschrijving van hoe de persoon zijn tekst opbouwt",
  "zinslengte": "kort/gemiddeld/lang",
  "kenmerkende_woorden": ["woord1", "woord2", ...],
  "stijlkenmerken": ["kenmerk1", "kenmerk2", ...],
  "openingsstijl": "hoe de persoon een brief opent",
  "afsluitingsstijl": "hoe de persoon een brief afsluit",
  "gebruik_van_ik": true/false,
  "aanspreking": "hoe de persoon de lezer aanspreekt",
  "energieniveau": "enthousiast/rustig/gedreven/nuchter",
  "samenvatting": "korte Nederlandse beschrijving van de schrijfstijl"
}

Geef ALLEEN de JSON terug, geen extra tekst.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

  let styleDNA: Record<string, any>
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    styleDNA = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  } catch {
    return NextResponse.json({ error: 'Kon stijl niet analyseren' }, { status: 500 })
  }

  // Save to profile
  await supabase
    .from('profiles')
    .update({ style_dna: styleDNA, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  // Save documents for reference
  for (const doc of documents) {
    await supabase.from('uploaded_documents').insert({
      user_id: user.id,
      name: `Motivatiebrief ${new Date().toLocaleDateString('nl-NL')}`,
      content: doc,
      doc_type: 'cover_letter',
    })
  }

  return NextResponse.json({ styleDNA })
}
