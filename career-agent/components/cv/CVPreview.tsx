'use client'

import { useState } from 'react'
import { FileText, Mail, Phone, MapPin, Link, Download } from 'lucide-react'

type Props = {
  profile: any
  experiences: any[]
  application: any
  fullWidth?: boolean
}

type Template = 'modern' | 'klassiek'
type ColorScheme = { primary: string; accent: string; name: string }

const COLOR_SCHEMES: ColorScheme[] = [
  { primary: '#2d6a4f', accent: '#52b788', name: 'Groen' },
  { primary: '#1d4ed8', accent: '#60a5fa', name: 'Blauw' },
  { primary: '#7c3aed', accent: '#a78bfa', name: 'Paars' },
  { primary: '#b45309', accent: '#fbbf24', name: 'Goud' },
  { primary: '#1f2937', accent: '#6b7280', name: 'Grijs' },
]

export default function CVPreview({ profile, experiences, application, fullWidth }: Props) {
  const [template, setTemplate] = useState<Template>('modern')
  const [colorScheme, setColorScheme] = useState<ColorScheme>(COLOR_SCHEMES[0])
  const [activeView, setActiveView] = useState<'cv' | 'brief'>('brief')

  const name = profile?.full_name || 'Jouw Naam'
  const coverLetter = application?.cover_letter

  return (
    <div className={`flex flex-col h-full overflow-hidden ${fullWidth ? 'max-w-5xl mx-auto w-full p-6' : ''}`}>
      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0 flex-wrap gap-y-2">
        {/* View toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
          <button
            onClick={() => setActiveView('brief')}
            className={`px-3 py-1.5 rounded-md transition-colors ${activeView === 'brief' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Brief
          </button>
          <button
            onClick={() => setActiveView('cv')}
            className={`px-3 py-1.5 rounded-md transition-colors ${activeView === 'cv' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            CV
          </button>
        </div>

        {/* Template toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
          {(['modern', 'klassiek'] as Template[]).map(t => (
            <button
              key={t}
              onClick={() => setTemplate(t)}
              className={`px-3 py-1.5 rounded-md transition-colors capitalize ${template === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Color picker */}
        <div className="flex gap-1.5">
          {COLOR_SCHEMES.map(scheme => (
            <button
              key={scheme.name}
              onClick={() => setColorScheme(scheme)}
              title={scheme.name}
              className={`w-5 h-5 rounded-full border-2 transition-all ${colorScheme.name === scheme.name ? 'border-gray-900 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: scheme.primary }}
            />
          ))}
        </div>

        <button
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Downloaden
        </button>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
        <div className="bg-white shadow-lg rounded-sm mx-auto" style={{ maxWidth: '680px' }}>
          {activeView === 'brief' ? (
            <LetterPreview
              profile={profile}
              application={application}
              colorScheme={colorScheme}
              template={template}
            />
          ) : (
            <CVDocument
              profile={profile}
              experiences={experiences}
              colorScheme={colorScheme}
              template={template}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function LetterPreview({ profile, application, colorScheme, template }: any) {
  const letterText = application?.cover_letter
    ?.replace(/\[BRIEF_GEGENEREERD\][\s\S]*$/, '')
    ?.trim()

  if (!letterText) {
    return (
      <div className="p-12 text-center text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium text-sm">Nog geen brief gegenereerd</p>
        <p className="text-xs mt-1">Plak een vacature in de chat om te beginnen</p>
      </div>
    )
  }

  return (
    <div className={`p-10 font-serif text-sm leading-relaxed text-gray-800 ${template === 'modern' ? '' : 'font-sans'}`}
      style={{ minHeight: '800px' }}>
      {/* Header */}
      {template === 'modern' && (
        <div className="mb-8 pb-6 border-b-2" style={{ borderColor: colorScheme.primary }}>
          <h1 className="text-2xl font-bold" style={{ color: colorScheme.primary }}>
            {profile?.full_name || 'Jouw Naam'}
          </h1>
          <div className="flex gap-4 text-xs text-gray-500 mt-1">
            {profile?.email && <span>{profile.email}</span>}
          </div>
        </div>
      )}
      <div className="whitespace-pre-wrap">{letterText}</div>
    </div>
  )
}

function CVDocument({ profile, experiences, colorScheme, template }: any) {
  if (template === 'modern') {
    return (
      <div>
        {/* Header band */}
        <div className="p-8 text-white" style={{ backgroundColor: colorScheme.primary }}>
          <h1 className="text-3xl font-bold">{profile?.full_name || 'Jouw Naam'}</h1>
          <p className="opacity-80 mt-1 text-sm">Professioneel profiel</p>
          <div className="flex flex-wrap gap-4 mt-3 text-xs opacity-90">
            {profile?.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{profile.email}</span>}
          </div>
        </div>

        <div className="grid grid-cols-3">
          {/* Main */}
          <div className="col-span-2 p-6">
            <Section title="Werkervaring" color={colorScheme.primary}>
              {experiences.length > 0 ? experiences.map((exp: any) => (
                <div key={exp.id} className="mb-5">
                  <div className="flex justify-between">
                    <div className="font-semibold text-gray-900 text-sm">{exp.job_title}</div>
                    <div className="text-xs text-gray-400">{exp.start_date?.slice(0, 7)} – {exp.current ? 'heden' : exp.end_date?.slice(0, 7)}</div>
                  </div>
                  <div className="text-xs font-medium mt-0.5" style={{ color: colorScheme.accent }}>{exp.company}</div>
                  {exp.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{exp.description}</p>}
                  {exp.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {exp.skills.map((s: string) => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${colorScheme.accent}22`, color: colorScheme.primary }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              )) : <p className="text-xs text-gray-400">Voeg ervaringen toe via de AI Agent</p>}
            </Section>
          </div>

          {/* Sidebar */}
          <div className="p-5 border-l border-gray-100" style={{ backgroundColor: '#f9fafb' }}>
            <Section title="Profiel" color={colorScheme.primary}>
              <p className="text-xs text-gray-500 leading-relaxed">
                {profile?.full_name ? `${profile.full_name} is een gedreven professional.` : 'Voeg een profiel toe.'}
              </p>
            </Section>
          </div>
        </div>
      </div>
    )
  }

  // Klassiek
  return (
    <div className="p-8 font-serif">
      <h1 className="text-2xl font-bold text-gray-900 text-center">{profile?.full_name || 'Jouw Naam'}</h1>
      <div className="flex justify-center gap-4 text-xs text-gray-500 mt-2 mb-8">
        {profile?.email && <span>{profile.email}</span>}
      </div>
      <Section title="Werkervaring" color={colorScheme.primary}>
        {experiences.map((exp: any) => (
          <div key={exp.id} className="mb-4">
            <div className="flex justify-between font-semibold text-sm">
              <span>{exp.job_title} – {exp.company}</span>
              <span className="text-gray-400 font-normal text-xs">{exp.start_date?.slice(0, 4)} – {exp.current ? 'heden' : exp.end_date?.slice(0, 4)}</span>
            </div>
            {exp.description && <p className="text-xs text-gray-500 mt-1">{exp.description}</p>}
          </div>
        ))}
      </Section>
    </div>
  )
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-bold uppercase tracking-widest mb-3 pb-2 border-b-2"
        style={{ color, borderColor: color + '40' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}
