import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobDescription } = await req.json()

  // Extract company/title from job description (simple heuristic)
  const lines = jobDescription.split('\n').filter((l: string) => l.trim())
  const jobTitle = lines[0]?.slice(0, 80) || 'Vacature'

  const { data, error } = await supabase
    .from('applications')
    .insert({
      user_id: user.id,
      job_description: jobDescription,
      job_title: jobTitle,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
