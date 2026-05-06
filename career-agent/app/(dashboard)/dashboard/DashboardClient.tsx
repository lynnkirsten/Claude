'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import {
  BrainCircuit, FileText, MessageSquare, Briefcase,
  TrendingUp, Plus, LogOut, ChevronRight, Sparkles, Upload
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ChatAgent from '@/components/chat/ChatAgent'
import CVPreview from '@/components/cv/CVPreview'
import StyleDNAUploader from '@/components/StyleDNAUploader'

type Props = {
  user: User
  profile: any
  experiences: any[]
  applications: any[]
}

type Tab = 'agent' | 'cv' | 'applications' | 'stijl'

export default function DashboardClient({ user, profile, experiences, applications }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('agent')
  const [activeApplication, setActiveApplication] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  const hasStyleDNA = profile?.style_dna && Object.keys(profile.style_dna).length > 0

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tabs = [
    { id: 'agent' as Tab, label: 'AI Agent', icon: MessageSquare },
    { id: 'cv' as Tab, label: 'Mijn CV', icon: FileText },
    { id: 'applications' as Tab, label: 'Sollicitaties', icon: Briefcase },
    { id: 'stijl' as Tab, label: 'Schrijfstijl', icon: Sparkles },
  ]

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-600',
    interview: 'bg-emerald-100 text-emerald-600',
    rejected: 'bg-red-100 text-red-600',
    offer: 'bg-yellow-100 text-yellow-700',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Concept', sent: 'Verstuurd', interview: 'Gesprek', rejected: 'Afgewezen', offer: 'Aanbieding',
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">Career Agent</span>
          {!hasStyleDNA && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Upload je schrijfstijl voor betere brieven
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{profile?.full_name || user.email}</span>
          <button onClick={logout} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
          <nav className="flex-1 p-3 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>

          {/* Stats */}
          <div className="p-3 border-t border-gray-100 space-y-2">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-gray-600">Overzicht</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center mt-2">
                <div>
                  <div className="text-lg font-bold text-gray-900">{experiences.length}</div>
                  <div className="text-xs text-gray-400">Ervaringen</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{applications.length}</div>
                  <div className="text-xs text-gray-400">Sollicitaties</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex">
          {activeTab === 'agent' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Chat — left */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
                  <h2 className="font-semibold text-gray-900">AI Career Agent</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Plak een vacature, stel vragen, en krijg een brief die echt bij jou past.
                  </p>
                </div>
                <ChatAgent
                  userId={user.id}
                  profile={profile}
                  experiences={experiences}
                  onApplicationCreated={setActiveApplication}
                />
              </div>
              {/* Preview — right */}
              <div className="w-[420px] border-l border-gray-200 flex flex-col overflow-hidden bg-white">
                <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
                  <h3 className="font-semibold text-gray-900 text-sm">Live Preview</h3>
                  <p className="text-xs text-gray-500">Jouw brief / CV in real-time</p>
                </div>
                <CVPreview
                  profile={profile}
                  experiences={experiences}
                  application={activeApplication}
                />
              </div>
            </div>
          )}

          {activeTab === 'cv' && (
            <div className="flex-1 overflow-auto">
              <div className="flex overflow-hidden h-full">
                <CVPreview profile={profile} experiences={experiences} application={null} fullWidth />
              </div>
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Sollicitaties</h2>
                  <button
                    onClick={() => setActiveTab('agent')}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Nieuwe brief
                  </button>
                </div>

                {applications.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nog geen sollicitaties</p>
                    <p className="text-sm mt-1">Gebruik de AI Agent om je eerste brief te schrijven</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applications.map(app => (
                      <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:border-emerald-300 transition-colors cursor-pointer"
                        onClick={() => { setActiveApplication(app); setActiveTab('agent') }}>
                        <div>
                          <div className="font-semibold text-gray-900">{app.job_title || 'Onbekende functie'}</div>
                          <div className="text-sm text-gray-500">{app.company_name || 'Bedrijf onbekend'}</div>
                          <div className="text-xs text-gray-400 mt-1">{new Date(app.created_at).toLocaleDateString('nl-NL')}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          {app.match_score != null && (
                            <div className="text-center">
                              <div className={`text-lg font-bold ${app.match_score >= 80 ? 'text-emerald-600' : app.match_score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                                {app.match_score}%
                              </div>
                              <div className="text-xs text-gray-400">match</div>
                            </div>
                          )}
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[app.status] || statusColors.draft}`}>
                            {statusLabels[app.status] || 'Concept'}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'stijl' && (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Schrijfstijl DNA</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Upload 2–3 eerdere motivatiebrieven. De AI analyseert jouw toon, woordkeuze en structuur
                    en schrijft daarna elke brief precies in jouw stem.
                  </p>
                </div>
                <StyleDNAUploader userId={user.id} existingDNA={profile?.style_dna} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
