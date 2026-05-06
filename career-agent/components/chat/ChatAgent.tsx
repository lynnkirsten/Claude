'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, ClipboardPaste } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

type Props = {
  userId: string
  profile: any
  experiences: any[]
  onApplicationCreated: (app: any) => void
}

export default function ChatAgent({ userId, profile, experiences, onApplicationCreated }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hallo ${profile?.full_name?.split(' ')[0] || 'daar'}! 👋 Ik ben jouw Career Agent.\n\nPlak hieronder een vacaturetekst en ik analyseer direct hoe goed die aansluit bij jouw ervaring. Daarna stel ik je een paar gerichte vragen — en dan schrijven we samen een brief die echt opvalt.`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // Create application record if this looks like a job posting
    let currentAppId = applicationId
    if (!currentAppId && input.length > 100) {
      const res = await fetch('/api/applications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: input, userId }),
      })
      if (res.ok) {
        const { id } = await res.json()
        currentAppId = id
        setApplicationId(id)
      }
    }

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          experiences,
          styleDNA: profile?.style_dna,
          applicationId: currentAppId,
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                assistantText += parsed.text
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: assistantText }
                  return updated
                })
              }
            } catch {}
          }
        }
      }

      // Detect if a letter was generated
      if (assistantText.includes('[BRIEF_GEGENEREERD]') && currentAppId) {
        onApplicationCreated({ id: currentAppId, cover_letter: assistantText })
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Er ging iets mis. Probeer het opnieuw.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
              }`}
            >
              {msg.content || (loading && i === messages.length - 1 ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              ) : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      {messages.length === 1 && (
        <div className="px-6 pb-2 flex gap-2 flex-wrap">
          {[
            'Ik wil een vacature plakken',
            'Analyseer mijn CV kansen',
            'Welke functies passen bij mij?',
          ].map(action => (
            <button
              key={action}
              onClick={() => setInput(action)}
              className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors font-medium"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-white">
        <div className="flex gap-2 items-end bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Plak een vacature of stel een vraag… (Enter = versturen)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none max-h-32"
            style={{ minHeight: '24px' }}
            onInput={e => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = '24px'
              target.style.height = `${target.scrollHeight}px`
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="w-8 h-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">Shift+Enter voor nieuwe regel</p>
      </div>
    </div>
  )
}
