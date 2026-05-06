'use client'

import { useState } from 'react'
import { Upload, Loader2, CheckCircle, Sparkles, X } from 'lucide-react'

type Props = {
  userId: string
  existingDNA: any
}

export default function StyleDNAUploader({ userId, existingDNA }: Props) {
  const [documents, setDocuments] = useState<string[]>(['', '', ''])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(existingDNA || null)
  const [error, setError] = useState('')

  async function analyze() {
    const validDocs = documents.filter(d => d.trim().length > 50)
    if (validDocs.length === 0) {
      setError('Voeg minstens één motivatiebrief toe (minimaal 50 tekens)')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/analyze-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: validDocs }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.styleDNA)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {result ? (
        <div className="bg-white rounded-2xl border border-emerald-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Schrijfstijl DNA geanalyseerd</h3>
              <p className="text-sm text-gray-500">De AI gebruikt dit profiel voor elke nieuwe brief</p>
            </div>
            <button onClick={() => setResult(null)} className="ml-auto text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {result.toon && <DNABadge label="Toon" value={result.toon} />}
            {result.zinslengte && <DNABadge label="Zinnen" value={result.zinslengte} />}
            {result.energieniveau && <DNABadge label="Energie" value={result.energieniveau} />}
            {result.gebruik_van_ik !== undefined && <DNABadge label="Gebruik van 'ik'" value={result.gebruik_van_ik ? 'Ja' : 'Nee'} />}
          </div>

          {result.samenvatting && (
            <div className="mt-4 bg-emerald-50 rounded-xl p-4">
              <p className="text-sm text-emerald-800 leading-relaxed">"{result.samenvatting}"</p>
            </div>
          )}

          {result.kenmerkende_woorden?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Kenmerkende woorden</p>
              <div className="flex flex-wrap gap-1.5">
                {result.kenmerkende_woorden.slice(0, 8).map((w: string) => (
                  <span key={w} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{w}</span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setResult(null)}
            className="mt-4 text-sm text-emerald-600 hover:underline"
          >
            Opnieuw analyseren
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">
                  Motivatiebrief {i + 1} {i === 0 ? '(verplicht)' : '(optioneel)'}
                </span>
                {doc.length > 0 && (
                  <span className="text-xs text-gray-400">{doc.length} tekens</span>
                )}
              </div>
              <textarea
                value={doc}
                onChange={e => {
                  const updated = [...documents]
                  updated[i] = e.target.value
                  setDocuments(updated)
                }}
                placeholder={`Plak hier je ${i === 0 ? 'eerste' : i === 1 ? 'tweede' : 'derde'} motivatiebrief…`}
                rows={6}
                className="w-full px-4 py-3 text-sm text-gray-700 resize-none focus:outline-none"
              />
            </div>
          ))}

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <button
            onClick={analyze}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyseren…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Schrijfstijl analyseren</>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Hoe meer tekst je aanlevert, hoe nauwkeuriger het profiel.
          </p>
        </div>
      )}
    </div>
  )
}

function DNABadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-gray-800 capitalize">{value}</div>
    </div>
  )
}
