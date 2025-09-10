'use client'

import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react'
import { TextStreamChatTransport } from 'ai'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from 'ai'

import { StreamingWords } from '@/components/storyReader/StreamingWords'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '@clerk/nextjs'
import { useAuthState } from '@/hooks/useAuthState'
import { useRouter } from 'next/navigation'

type Side = 'A' | 'B'
type ModelKey = 'gpt-4o' | 'gpt-5-chat'

const QUESTIONS: string[] = [
  'What should I do today for some fun?',
  'Describe a quiet room using synesthetic imagery where sounds have colors and scents have shapes; keep it intimate and evocative.',
  'Personify the feeling of envy as a character entering a dinner party—show their mannerisms through action and subtext.',
  'Turn a mundane errand (buying batteries) into a micro-quest with stakes, allies, and a tiny triumph; 150–200 words.',
  'Invent a lost festival from an imagined seaside town and explain its most meaningful ritual in a lyrical paragraph.',
  'Write a dialogue between a chipped coffee mug and a restless houseplant; give them clashing moods but a shared longing.',
  'Compose an apology from an unreliable narrator who sincerely believes they did nothing wrong—make it charming yet unsettling.',
  'Craft a 100-word story that begins joyful and ends with a quiet, earned ache—no twists, just inevitability.',
  'Write a pep talk from an unexpected coach (a lighthouse, a metronome, or a library card) to someone who’s stuck.',
  'Record a dream journal entry that blends three unrelated scenes into a single coherent emotional arc.',
  'Write a free-verse poem about waiting at an airport gate that lands on a hopeful, specific image.',
  'Sketch a character using five vivid details, none of which are physical descriptors or adjectives.',
  'Write a polite breakup text that is kind, unambiguous, and quietly devastating—three to five sentences.',
  'Give playful instructions for making tea as if written by a benevolent trickster spirit who loves humans.',
  'Invent a myth that explains a small everyday phenomenon (like tangled earbuds or missing socks) with tenderness.',
  'Write a scene where two strangers share a bench in the rain; let the subtext do the heavy lifting.',
  'Compose a toast for a best friend that celebrates their quirks while gently roasting them—keep it warm.',
  'Write a eulogy for a piece of outdated technology that shaped a generation; be affectionate, not sarcastic.',
  'Rewrite the cliché “time heals all wounds” as three fresh metaphors that feel grounded and original.',
  'End with a promise: write a single paragraph that starts in doubt and ends in courageous resolve.',
]

function useNoAuthTransport(path: string, baseBody?: Record<string, unknown>) {
  const { getToken } = useAuth()
  const { sessionId } = useAuthState()
  // Use Convex HTTP fully-qualified
  const apiBase = process.env.NEXT_PUBLIC_CONVEX_SITE_URL!
  return useMemo(() => {
    return new TextStreamChatTransport({
      api: `${apiBase}${path}`,
      body: { ...baseBody, sessionId },
      headers: () => ({}),
      fetch: (async (url, options) => {
        const token = await getToken({ template: 'convex' })
        const headers = new Headers(options?.headers)
        if (token) headers.set('Authorization', `Bearer ${token}`)
        return globalThis.fetch(url, { ...options, headers })
      }) as typeof fetch,
      credentials: 'include',
    })
  }, [apiBase, path, baseBody, sessionId, getToken])
}

function GlassCard(
  { children, className = '', ...rest }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>
) {
  return (
    <div className={`glass-primary bg-stone-800/20 backdrop-blur-xl border border-white/20 rounded-lg ${className}`} {...rest}>
      {children}
    </div>
  )
}

export default function BlindTestPage() {
  const router = useRouter()
  const { sessionId } = useAuthState()
  const { getToken } = useAuth()
  // Dynamic layout measurements for the single bottom bar
  const bottomBarRef = useRef<HTMLDivElement | null>(null)
  const [spacers, setSpacers] = useState<{ top: number; bottom: number }>({ top: 0, bottom: 0 })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [draftQuestion, setDraftQuestion] = useState('')
  // Whether to reveal which actual models are A/B
  const [modelsRevealed, setModelsRevealed] = useState(false)
  const [perQuestionVotes, setPerQuestionVotes] = useState<Record<number, any>>({})
  const [overall, setOverall] = useState<any>(null)
  const [activeSideMobile, setActiveSideMobile] = useState<Side>('A')
  const [selectedByQuestion, setSelectedByQuestion] = useState<Record<number, Side | undefined>>({})
  const [postedByQuestion, setPostedByQuestion] = useState<Record<number, boolean>>({})
  const [questionAskedByIndex, setQuestionAskedByIndex] = useState<Record<number, boolean>>({})
  const lastSubmitRef = useRef<{ text: string; ts: number } | null>(null)
  const [showResultsModal, setShowResultsModal] = useState(false)

  // Random model assignment per question
  const [modelAssignments, setModelAssignments] = useState<Record<number, { A: ModelKey; B: ModelKey }>>({})

  const defaultQuestion = QUESTIONS[currentIndex]
  const [activeQuestion, setActiveQuestion] = useState(defaultQuestion)

  // Get current assignment or create new random one
  const currentAssignment = useMemo(() => {
    if (modelAssignments[currentIndex]) {
      return modelAssignments[currentIndex]
    }
    
    // Randomly assign models to A and B
    const models: ModelKey[] = ['gpt-4o', 'gpt-5-chat']
    const isAFirst = Math.random() < 0.5
    const assignment = {
      A: isAFirst ? models[0] : models[1],
      B: isAFirst ? models[1] : models[0]
    }
    
    setModelAssignments(prev => ({ ...prev, [currentIndex]: assignment }))
    return assignment
  }, [currentIndex, modelAssignments])

  const modelA = currentAssignment.A
  const modelB = currentAssignment.B
  const modelAName = modelA
  const modelBName = modelB

  const transportA = useNoAuthTransport('/api/blind_test/chat', { model: modelA })
  const transportB = useNoAuthTransport('/api/blind_test/chat', { model: modelB })

  const initialMessages = useMemo<UIMessage[]>(() => {
    // No initial messages until the user submits the first time for this question
    return []
  }, [currentIndex])

  const chatA = useChat({ id: `blind-${currentIndex}-A`, transport: transportA })
  const chatB = useChat({ id: `blind-${currentIndex}-B`, transport: transportB })

  // When switching question index, reset chats; user must submit the first message
  useEffect(() => {
    chatA.setMessages([])
    chatB.setMessages([])
    setFollowUpsUsed(0)
    setQuestionAskedByIndex(prev => ({ ...prev, [currentIndex]: false }))
    setDraftQuestion('')
  }, [currentIndex])

  // Auto-submit the first question for the user with a short delay to avoid rapid navigation triggering it
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!questionAskedByIndex[currentIndex]) {
        handlePrimarySubmit()
      }
    }, 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex])

  // Fetch vote results on mount and question change
  useEffect(() => {
    fetchVoteResults()
  }, [currentIndex, activeQuestion])

  const isStreamingA = chatA.status === 'streaming'
  const isStreamingB = chatB.status === 'streaming'
  const lastTextA = chatA.messages.filter(m => m.role === 'assistant').at(-1)?.parts?.filter(p => p.type === 'text').map(p => (p as any).text).join('') || ''
  const lastTextB = chatB.messages.filter(m => m.role === 'assistant').at(-1)?.parts?.filter(p => p.type === 'text').map(p => (p as any).text).join('') || ''
  const lastAssistantIndexA = (() => { let i = -1; chatA.messages.forEach((m, idx) => { if (m.role === 'assistant') i = idx }) ; return i })()
  const lastAssistantIndexB = (() => { let i = -1; chatB.messages.forEach((m, idx) => { if (m.role === 'assistant') i = idx }) ; return i })()

  const canNext = currentIndex < 19
  const canPrev = currentIndex > 0

  // Follow-ups up to 5
  const [followUpsUsed, setFollowUpsUsed] = useState(0)
  const inFlight = (isStreamingA ? 1 : 0) + (isStreamingB ? 1 : 0)
  const disableFollowUp = followUpsUsed >= 5 || inFlight >= 2 || !lastTextA || !lastTextB

  function handlePrimarySubmit() {
    const text = draftQuestion.trim()
    const isAsked = !!questionAskedByIndex[currentIndex]
    if (!isAsked) {
      const first = text || defaultQuestion
      if (!first) return
      const now = Date.now()
      if (lastSubmitRef.current && lastSubmitRef.current.text === first && now - lastSubmitRef.current.ts < 800) {
        return
      }
      lastSubmitRef.current = { text: first, ts: now }
      setDraftQuestion('')
      setActiveQuestion(first)
      setQuestionAskedByIndex(prev => ({ ...prev, [currentIndex]: true }))
      // send both chats the first question
      chatA.setMessages([])
      chatB.setMessages([])
      setTimeout(() => {
        chatA.sendMessage({ text: first })
        chatB.sendMessage({ text: first })
      }, 0)
      return
    }
    if (!text || disableFollowUp) return
    const now = Date.now()
    if (lastSubmitRef.current && lastSubmitRef.current.text === text && now - lastSubmitRef.current.ts < 800) {
      return
    }
    lastSubmitRef.current = { text, ts: now }
    setDraftQuestion('')
    setFollowUpsUsed(n => Math.min(5, n + 1))
    chatA.sendMessage({ text })
    chatB.sendMessage({ text })
  }

  async function fetchVoteResults() {
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/api/blind_test/results`)
      url.searchParams.set('questionText', activeQuestion)
      url.searchParams.set('sessionId', sessionId || '')
      const token = await getToken({ template: 'convex' })
      const res = await fetch(url.toString(), { 
        credentials: 'include',
        ...(token && { headers: { 'Authorization': `Bearer ${token}` } })
      })
      const data = await res.json()
      console.log('Vote results:', data)
      console.log('Overall data structure:', {
        overall: data.overall,
        globalCounts: data.overall?.global,
        userCounts: data.overall?.user
      })
      
      setPerQuestionVotes(prev => ({
        ...prev,
        [currentIndex]: data.question,
      }))
      setOverall(data.overall)
    } catch (error) {
      console.error('Failed to fetch vote results:', error)
    }
  }

  async function vote(side: Side) {
    // Update selection immediately for UI feedback
    setSelectedByQuestion(prev => ({ ...prev, [currentIndex]: side }))
    
    // If we haven't posted a vote for this question yet, post it now
    if (!postedByQuestion[currentIndex]) {
      try {
        const winnerModel = side === 'A' ? modelA : modelB
        console.log('Voting for:', { side, winnerModel, modelA, modelB })
        
        const token = await getToken({ template: 'convex' })
        const response = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/api/blind_test/vote`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({ 
            questionText: activeQuestion, 
            winnerModel,
            sessionId,
          }),
          credentials: 'include',
        })
        
        if (!response.ok) {
          const error = await response.text()
          console.error('Vote failed:', response.status, error)
          return
        }
        
        setPostedByQuestion(prev => ({ ...prev, [currentIndex]: true }))
        
        // Always fetch updated results after voting
        await fetchVoteResults()
        // If this was the last question, show results modal
        if (currentIndex === 19) {
          setShowResultsModal(true)
        }
      } catch (error) {
        console.error('Failed to post vote:', error)
      }
    }
  }

  async function revealModels() {
    try {
      const picked = selectedByQuestion[currentIndex]
      if (picked && !postedByQuestion[currentIndex]) {
        const winnerModel = picked === 'A' ? modelA : modelB
        const token = await getToken({ template: 'convex' })
        await fetch(`${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/api/blind_test/vote`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({ 
            questionText: activeQuestion, 
            winnerModel,
            sessionId,
          }),
          credentials: 'include',
        })
        setPostedByQuestion(prev => ({ ...prev, [currentIndex]: true }))
      }
      
      // Always fetch results when revealing
      await fetchVoteResults()
    } catch (error) {
      console.error('Failed to reveal models:', error)
    }
    setModelsRevealed(true)
  }

  // Get the vote counts for display in the cards
  const aVotes = perQuestionVotes[currentIndex]?.global?.[modelA] || 0
  const bVotes = perQuestionVotes[currentIndex]?.global?.[modelB] || 0

  // Measure fixed bottom bar to set content padding (esp. on mobile)
  useLayoutEffect(() => {
    const updateSpacers = () => {
      const bottomHeight = bottomBarRef.current?.offsetHeight ?? 0
      setSpacers({ top: 0, bottom: bottomHeight })
    }
    updateSpacers()

    // Observe size changes of the bars (content can expand/collapse)
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSpacers) : null
    if (resizeObserver) {
      if (bottomBarRef.current) resizeObserver.observe(bottomBarRef.current)
    }
    window.addEventListener('resize', updateSpacers)
    const interval = window.setInterval(updateSpacers, 500) // defensive in case of font loads

    return () => {
      window.removeEventListener('resize', updateSpacers)
      if (resizeObserver) resizeObserver.disconnect()
      window.clearInterval(interval)
    }
  }, [])

  function nextQuestion() {
    setDraftQuestion('')
    setModelsRevealed(false)
    setCurrentIndex(i => {
      const ni = Math.min(19, i + 1)
      setActiveQuestion(QUESTIONS[ni])
      return ni
    })
  }
  function prevQuestion() {
    setDraftQuestion('')
    setModelsRevealed(false)
    setCurrentIndex(i => {
      const ni = Math.max(0, i - 1)
      setActiveQuestion(QUESTIONS[ni])
      return ni
    })
  }

  // Tighter padding on mobile
  const cardClass = 'p-3 md:p-6'

  return (
    <div className="min-h-screen min-h-[100svh] relative">
      {/* Background now handled globally in root layout */}

      {/* Top header removed; controls moved to bottom */}

      {/* Main content (spaced above bottom bar) */}
      <div
        className="max-w-6xl mx-auto px-3 md:px-6"
        style={{ paddingBottom: spacers.bottom ? spacers.bottom + 8 : undefined, paddingTop: 16 }}
      >

        {/* Question editor + controls */}
        {/* Header moved to fixed top */}

        {/* Desktop side-by-side */}
        <div className="hidden md:grid grid-cols-2 gap-4 mb-16">
          {/* A */}
          <GlassCard
            className={`${cardClass} cursor-pointer hover:bg-emerald-300/5 ${selectedByQuestion[currentIndex] === 'A' ? 'ring-2 ring-emerald-400/50 border-emerald-300/50 bg-emerald-300/5' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={selectedByQuestion[currentIndex] === 'A'}
            onClick={() => vote('A')}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/70 text-sm md:text-base uppercase tracking-wider">{modelsRevealed ? modelAName : 'Model A'}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => vote('A')} className={`px-2 py-1 text-xs md:px-3 md:py-1.5 md:text-sm rounded-md border text-amber-50/90 hover:bg-emerald-100/10 ${selectedByQuestion[currentIndex]==='A' ? 'border-emerald-300/60 bg-emerald-100/10' : 'border-white/20'}`}>Vote A</button>
              </div>
            </div>
            <div className="text-white/85 whitespace-pre-wrap break-words min-h-[320px] space-y-1 text-base md:text-lg">
              {chatA.messages.map((m, idx) => {
                const content = (m.parts || []).filter(p => p.type === 'text').map(p => (p as any).text).join('')
                if (m.role === 'user') {
                  return (
                    <div key={`a-user-${idx}`} className="text-sky-300/90 text-base md:text-lg pb-2 mb-2 border-b border-white/10">You: {content}</div>
                  )
                }
                // assistant
                if (idx === lastAssistantIndexA && isStreamingA) {
                  return (
                    <div key={`a-assistant-${idx}`}>
                      <StreamingWords text={content} baseDelay={0} perWordDelay={0} />
                    </div>
                  )
                }
                return (
                  <div key={`a-assistant-${idx}`} className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => {
                          // Skip empty paragraphs
                          const isEmpty = !children || (Array.isArray(children) && children.length === 0) || 
                            (typeof children === 'string' && children.trim() === '');
                          if (isEmpty) return null;
                          return <p className="my-0 leading-snug">{children}</p>;
                        },
                        ul: ({ children }) => <ul className="my-0.5 ml-4 list-disc leading-snug">{children}</ul>,
                        ol: ({ children }) => <ol className="my-0.5 ml-4 list-decimal leading-snug">{children}</ol>,
                        li: ({ children }) => <li className="-my-0.5">{children}</li>,
                        h1: ({ children }) => <h1 className="text-xl font-semibold mt-1 mb-0.5 leading-tight">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-semibold mt-0.5 mb-0 leading-tight">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-semibold mt-0.5 mb-0 leading-tight">{children}</h3>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      }}
                    >
                      {content.replace(/\n{3,}/g, '\n\n').trim()}
                    </ReactMarkdown>
                  </div>
                )
              })}
              {!chatA.messages.some(m => m.role === 'assistant') && (
                <span className="text-white/50">Waiting for response…</span>
              )}
            </div>
            {modelsRevealed && (
              <div className="mt-3 text-xs text-amber-50/70">Votes: {aVotes}</div>
            )}
          </GlassCard>

          {/* B */}
          <GlassCard
            className={`${cardClass} cursor-pointer hover:bg-emerald-300/5 ${selectedByQuestion[currentIndex] === 'B' ? 'ring-2 ring-emerald-400/50 border-emerald-300/50 bg-emerald-300/5' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={selectedByQuestion[currentIndex] === 'B'}
            onClick={() => vote('B')}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/70 text-sm md:text-base uppercase tracking-wider">{modelsRevealed ? modelBName : 'Model B'}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => vote('B')} className={`px-2 py-1 text-xs md:px-3 md:py-1.5 md:text-sm rounded-md border text-amber-50/90 hover:bg-emerald-100/10 ${selectedByQuestion[currentIndex]==='B' ? 'border-emerald-300/60 bg-emerald-100/10' : 'border-white/20'}`}>Vote B</button>
              </div>
            </div>
            <div className="text-white/85 whitespace-pre-wrap break-words min-h-[320px] space-y-1 text-base md:text-lg">
              {chatB.messages.map((m, idx) => {
                const content = (m.parts || []).filter(p => p.type === 'text').map(p => (p as any).text).join('')
                if (m.role === 'user') {
                  return (
                    <div key={`b-user-${idx}`} className="text-sky-300/90 text-base md:text-lg pb-2 mb-2 border-b border-white/10">You: {content}</div>
                  )
                }
                if (idx === lastAssistantIndexB && isStreamingB) {
                  return (
                    <div key={`b-assistant-${idx}`}>
                      <StreamingWords text={content} baseDelay={0} perWordDelay={0} />
                    </div>
                  )
                }
                return (
                  <div key={`b-assistant-${idx}`} className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => {
                          // Skip empty paragraphs
                          const isEmpty = !children || (Array.isArray(children) && children.length === 0) || 
                            (typeof children === 'string' && children.trim() === '');
                          if (isEmpty) return null;
                          return <p className="my-0 leading-snug">{children}</p>;
                        },
                        ul: ({ children }) => <ul className="my-0.5 ml-4 list-disc leading-snug">{children}</ul>,
                        ol: ({ children }) => <ol className="my-0.5 ml-4 list-decimal leading-snug">{children}</ol>,
                        li: ({ children }) => <li className="-my-0.5">{children}</li>,
                        h1: ({ children }) => <h1 className="text-xl font-semibold mt-1 mb-0.5 leading-tight">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-semibold mt-0.5 mb-0 leading-tight">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-semibold mt-0.5 mb-0 leading-tight">{children}</h3>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      }}
                    >
                      {content.replace(/\n{3,}/g, '\n\n').trim()}
                    </ReactMarkdown>
                  </div>
                )
              })}
              {!chatB.messages.some(m => m.role === 'assistant') && (
                <span className="text-white/50">Waiting for response…</span>
              )}
            </div>
            {modelsRevealed && (
              <div className="mt-3 text-xs text-amber-50/70">Votes: {bVotes}</div>
            )}
          </GlassCard>
        </div>

        {/* Follow-up moved into fixed bottom controls */}

        {/* Mobile toggle between A/B */}
        <div className="md:hidden mb-16">
          <GlassCard
            className={`${cardClass} mb-16 cursor-pointer hover:bg-emerald-300/5 ${selectedByQuestion[currentIndex] === activeSideMobile ? 'ring-2 ring-emerald-400/50 border-emerald-300/50 bg-emerald-300/5' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={selectedByQuestion[currentIndex] === activeSideMobile}
            onClick={() => vote(activeSideMobile)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/70 text-sm md:text-base uppercase tracking-wider">{modelsRevealed ? (activeSideMobile === 'A' ? modelAName : modelBName) : (activeSideMobile === 'A' ? 'Model A' : 'Model B')}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => vote(activeSideMobile)} className={`px-2 py-1 text-xs md:px-3 md:py-1.5 md:text-sm rounded-md border text-amber-50/90 hover:bg-emerald-100/10 ${(selectedByQuestion[currentIndex]===activeSideMobile) ? 'border-emerald-300/60 bg-emerald-100/10' : 'border-white/20'}`}>Vote {activeSideMobile}</button>
              </div>
            </div>
            <div className="text-white/85 whitespace-pre-wrap break-words min-h-[320px] text-base md:text-lg space-y-1">
              {(activeSideMobile === 'A' ? chatA.messages : chatB.messages).map((m, idx) => {
                const content = (m.parts || []).filter(p => p.type === 'text').map(p => (p as any).text).join('')
                if (m.role === 'user') {
                  return (
                    <div key={`m-user-${idx}`} className="text-sky-300/90 text-base md:text-lg pb-2 mb-2 border-b border-white/10">You: {content}</div>
                  )
                }
                const msgs = activeSideMobile === 'A' ? chatA.messages : chatB.messages
                const lastAssistant = (() => { let i = -1; msgs.forEach((mm, ii) => { if (mm.role==='assistant') i = ii }); return i })()
                const streaming = activeSideMobile === 'A' ? isStreamingA : isStreamingB
                if (idx === lastAssistant && streaming) {
                  return (
                    <div key={`m-assistant-${idx}`}>
                      <StreamingWords text={content} baseDelay={0} perWordDelay={0} />
                    </div>
                  )
                }
                return (
                  <div key={`m-assistant-${idx}`} className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => {
                          // Skip empty paragraphs
                          const isEmpty = !children || (Array.isArray(children) && children.length === 0) || 
                            (typeof children === 'string' && children.trim() === '');
                          if (isEmpty) return null;
                          return <p className="my-0 leading-snug">{children}</p>;
                        },
                        ul: ({ children }) => <ul className="my-0.5 ml-4 list-disc leading-snug">{children}</ul>,
                        ol: ({ children }) => <ol className="my-0.5 ml-4 list-decimal leading-snug">{children}</ol>,
                        li: ({ children }) => <li className="-my-0.5">{children}</li>,
                        h1: ({ children }) => <h1 className="text-xl font-semibold mt-1 mb-0.5 leading-tight">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-semibold mt-0.5 mb-0 leading-tight">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-semibold mt-0.5 mb-0 leading-tight">{children}</h3>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      }}
                    >
                      {content.replace(/\n{3,}/g, '\n\n').trim()}
                    </ReactMarkdown>
                  </div>
                )
              })}
              {!((activeSideMobile === 'A' ? chatA.messages : chatB.messages).some(m => m.role === 'assistant')) && (
                <span className="text-white/50">Waiting for response…</span>
              )}
            </div>
            {modelsRevealed && (
              <div className="mt-3 text-xs text-amber-50/70">Votes: {activeSideMobile === 'A' ? aVotes : bVotes}</div>
            )}
          </GlassCard>

          {/* Bottom mobile buttons removed in favor of single bottom bar */}
        </div>

        {/* Footer controls moved to bottom bar */}
      </div>

      {/* Fixed bottom controls (moved former top bar here) */}
      <div ref={bottomBarRef} className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-6xl px-3 md:px-6">
          <GlassCard className={`p-2 md:p-4 rounded-t-lg md:rounded-lg`}>
            <div className="flex items-center justify-between gap-2 md:gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/')}
                  className="px-2 py-1 text-xs md:px-3 md:py-2 md:text-sm rounded-md border border-white/20 text-white/80 hover:bg-white/10 flex items-center gap-1"
                  aria-label="Go to FromYou home"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M10.707 2.293a1 1 0 0 1 1.414 0l8 8A1 1 0 0 1 19.707 11H18v8a1 1 0 0 1-1 1h-3v-5H10v5H7a1 1 0 0 1-1-1v-8H4.293a1 1 0 0 1-.707-1.707l7-7z"/>
                  </svg>
                  fromyou
                </button>
                <span className="hidden md:block text-amber-50/80 text-sm">Question {currentIndex + 1} / 20</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setModelsRevealed(v => (v ? false : (revealModels(), true)))} className="px-2 py-1 text-xs md:px-3 md:py-2 md:text-sm rounded-md border border-white/20 text-white/80 hover:bg-white/10">{modelsRevealed ? 'Hide' : 'Reveal'}</button>
                <button onClick={prevQuestion} disabled={!canPrev} className="px-2 py-1 text-xs md:px-3 md:py-2 md:text-sm rounded-md border border-white/20 text-white/80 disabled:opacity-40">Prev</button>
                <button onClick={nextQuestion} disabled={!canNext} className="px-2 py-1 text-xs md:px-3 md:py-2 md:text-sm rounded-md border border-white/20 text-white/80 disabled:opacity-40">Next</button>
              </div>
            </div>
            <div className="mt-2">
              {modelsRevealed && (
                <>
                  {perQuestionVotes[currentIndex]?.global && (
                    <div className="mb-1 text-[10px] md:text-xs text-amber-50/75 flex flex-wrap items-center gap-2">
                      {(() => {
                        const q4 = perQuestionVotes[currentIndex]?.global?.['gpt-4o'] || 0
                        const q5 = perQuestionVotes[currentIndex]?.global?.['gpt-5-chat'] || 0
                        const qTotal = q4 + q5
                        return (
                          <>
                            <span className="opacity-80">All Votes for Question {currentIndex + 1}:</span>
                            <span className="px-2 py-0.5 rounded bg-white/10">GPT-4o: {q4}</span>
                            <span className="px-2 py-0.5 rounded bg-white/10">GPT-5: {q5}</span>
                          </>
                        )
                      })()}
                    </div>
                  )}
                  <div className="mb-2 text-[11px] md:text-xs text-amber-50/80 flex flex-wrap items-center gap-2">All Votes:
                    {(() => {
                      console.log('All Votes display - overall object:', overall)
                      console.log('All Votes display - overall.global:', overall?.global)
                      const g4 = overall?.global?.['gpt-4o'] || 0
                      const g5 = overall?.global?.['gpt-5-chat'] || 0
                      const total = g4 + g5
                      const g4p = total > 0 ? ((g4 / total) * 100).toFixed(1) : '0.0'
                      const g5p = total > 0 ? ((g5 / total) * 100).toFixed(1) : '0.0'
                      console.log('All Votes display - calculated values:', { g4, g5, total, g4p, g5p })
                      return (
                        <>
                          <span className="px-2 py-0.5 rounded bg-emerald-600/30 border border-emerald-400/40 text-emerald-100">GPT-4o: {g4p}% ({g4})</span>
                          <span className="px-2 py-0.5 rounded bg-purple-600/30 border border-purple-400/40 text-purple-100">GPT-5: {g5p}% ({g5})</span>
                        </>
                      )
                    })()}
                  </div>
                </>
              )}
              <div className="relative">
                <textarea
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handlePrimarySubmit()
                    }
                  }}
                  className="w-full bg-transparent border border-white/20 rounded-md px-3 pr-10 py-2 text-amber-50 placeholder-white/40 focus:outline-none resize-none"
                  placeholder={questionAskedByIndex[currentIndex] ? 'Send a follow-up to both models' : defaultQuestion}
                  value={draftQuestion}
                  onChange={(e) => setDraftQuestion(e.target.value)}
                />
                <button
                  aria-label={questionAskedByIndex[currentIndex] ? 'Submit' : 'Start'}
                  onClick={handlePrimarySubmit}
                  className={`absolute right-1 top-1 h-8 md:h-9 rounded-md border border-white/20 text-white/80 hover:bg-white/10 ${questionAskedByIndex[currentIndex] ? 'w-8 grid place-items-center' : 'px-2 text-xs md:text-sm'}`}
                >
                  {questionAskedByIndex[currentIndex] ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 md:h-5 md:w-5">
                      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  ) : (
                    'Start'
                  )}
                </button>
              </div>
            </div>
            {followUpsUsed >= 5 && (
              <div className="mt-1 text-[10px] md:text-xs text-amber-50/60">Follow-ups used: {followUpsUsed} / 5</div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Floating mobile A/B toggle above bottom bar */}
      <div
        className="md:hidden fixed left-0 right-0 z-50 flex justify-center"
        style={{ bottom: `calc(${spacers.bottom}px + env(safe-area-inset-bottom, 0px) + 0.5rem)` }}
      >
        <div className="px-3 w-full max-w-6xl">
          <div className="flex justify-center">
            <div className="glass-primary rounded-full border border-white/20 backdrop-blur-xl px-2 py-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSideMobile('A')}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors ${activeSideMobile === 'A' ? 'border-emerald-300/60 bg-emerald-100/10 text-emerald-100' : 'border-white/20 text-white/80 hover:bg-white/10'}`}
                >
                  Model A
                </button>
                <button
                  onClick={() => setActiveSideMobile('B')}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors ${activeSideMobile === 'B' ? 'border-emerald-300/60 bg-emerald-100/10 text-emerald-100' : 'border-white/20 text-white/80 hover:bg-white/10'}`}
                >
                  Model B
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Modal */}
      {showResultsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowResultsModal(false)} />
          <div className="relative mx-3 w-full max-w-lg">
            <GlassCard className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base md:text-lg text-amber-50/90 font-medium">Results</h2>
                <button
                  onClick={() => setShowResultsModal(false)}
                  aria-label="Close"
                  className="px-2 py-1 text-xs rounded-md border border-white/20 text-white/80 hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              {(() => {
                const userTotals: Record<string, number> = { 'gpt-4o': 0, 'gpt-5-chat': 0 }
                let userTotalCount = 0
                Object.entries(selectedByQuestion).forEach(([qIndexStr, side]) => {
                  const qIndex = Number(qIndexStr)
                  if (!postedByQuestion[qIndex] || !side) return
                  const assignment = modelAssignments[qIndex]
                  if (!assignment) return
                  const model = assignment[side as 'A' | 'B']
                  userTotals[model] = (userTotals[model] || 0) + 1
                  userTotalCount += 1
                })
                const u4 = userTotals['gpt-4o'] || 0
                const u5 = userTotals['gpt-5-chat'] || 0
                const u4p = userTotalCount > 0 ? ((u4 / userTotalCount) * 100).toFixed(1) : '0.0'
                const u5p = userTotalCount > 0 ? ((u5 / userTotalCount) * 100).toFixed(1) : '0.0'

                const g4 = overall?.global?.['gpt-4o'] || 0
                const g5 = overall?.global?.['gpt-5-chat'] || 0
                const gTotal = g4 + g5
                const g4p = gTotal > 0 ? ((g4 / gTotal) * 100).toFixed(1) : '0.0'
                const g5p = gTotal > 0 ? ((g5 / gTotal) * 100).toFixed(1) : '0.0'

                return (
                  <div className="space-y-3">
                    <div>
                      <div className="text-amber-50/80 text-sm mb-1">Your votes</div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] md:text-xs">
                        <span className="px-2 py-0.5 rounded bg-emerald-600/30 border border-emerald-400/40 text-emerald-100">GPT-4o: {u4p}% ({u4}/{userTotalCount})</span>
                        <span className="px-2 py-0.5 rounded bg-purple-600/30 border border-purple-400/40 text-purple-100">GPT-5: {u5p}% ({u5}/{userTotalCount})</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-amber-50/80 text-sm mb-1">All users</div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] md:text-xs">
                        <span className="px-2 py-0.5 rounded bg-emerald-600/30 border border-emerald-400/40 text-emerald-100">GPT-4o: {g4p}% ({g4})</span>
                        <span className="px-2 py-0.5 rounded bg-purple-600/30 border border-purple-400/40 text-purple-100">GPT-5: {g5p}% ({g5})</span>
                      </div>
                    </div>
                    <div className="pt-1 text-[10px] md:text-xs text-amber-50/70">
                      You completed {userTotalCount} of 20 questions.
                    </div>
                  </div>
                )
              })()}
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  )
}


