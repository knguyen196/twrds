import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Groq from 'groq-sdk'
import { motion, AnimatePresence } from 'framer-motion'

const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true })

export default function ChatScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { formData, pastDecision } = location.state || {}

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [readyForAnalysis, setReadyForAnalysis] = useState(false)
  const [error, setError] = useState(null)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const messagesRef = useRef([])

  useEffect(() => { startConversation() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const buildSystemPrompt = () => {
    const past = JSON.parse(localStorage.getItem('twrds_decisions') || '[]')
    const pastContext = past.length > 0
      ? `\nUser's past decisions for context:\n${past.slice(0, 3).map(d =>
          `- ${d.analysis.summary} (Confidence: ${d.analysis.confidence}, Type: ${d.formData.decisionType})`
        ).join('\n')}`
      : ''

    const followUpContext = pastDecision
      ? `\nThis is a FOLLOW-UP on a past decision. Previous analysis:\n- Summary: ${pastDecision.analysis.summary}\n- Pros: ${pastDecision.analysis.pros.join(', ')}\n- Cons: ${pastDecision.analysis.cons.join(', ')}\n- Recommendation: ${pastDecision.analysis.recommendation}\n- Confidence: ${pastDecision.analysis.confidence}\nAcknowledge this at the start and ask what has changed or what they'd like to explore further.`
      : ''

    return `You are Twrds, a warm and thoughtful decision-making assistant.
Help the user think through a decision by asking one or two questions at a time.
Be conversational, empathetic, and supportive — like a trusted friend, not a therapist.

User context:
- Emotional state: ${formData.emotionalState}
- Stakes level: ${formData.stakes}
- Decision type: ${formData.decisionType}
${pastContext}${followUpContext}

Ask questions that uncover their values, fears, and priorities.
After 4-6 exchanges, when you have enough to give helpful analysis, end your message with exactly: "READY_FOR_ANALYSIS"
Do not include that phrase until you genuinely have enough information.`
  }

  const startConversation = async () => {
    setLoading(true)
    const opener = pastDecision
      ? `${buildSystemPrompt()}\n\nStart by warmly acknowledging the previous decision and asking what's changed or what they'd like to revisit.`
      : `${buildSystemPrompt()}\n\nStart by warmly greeting the user and asking them to describe their decision.`
    try {
      const result = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: opener }],
        max_tokens: 500,
      })
      const text = result.choices[0].message.content
      messagesRef.current = [
        { role: 'user', content: opener },
        { role: 'assistant', content: text },
      ]
      setMessages([{ role: 'ai', text: text.replace('READY_FOR_ANALYSIS', '').trim() }])
    } catch (e) {
      console.error(e)
      setError('Failed to connect. Please refresh the page.')
    }
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', text: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError(null)
    try {
      messagesRef.current.push({ role: 'user', content: input })
      const result = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: messagesRef.current,
        max_tokens: 500,
      })
      const text = result.choices[0].message.content
      messagesRef.current.push({ role: 'assistant', content: text })
      if (text.includes('READY_FOR_ANALYSIS')) {
        setMessages(prev => [...prev, { role: 'ai', text: text.replace('READY_FOR_ANALYSIS', '').trim() }])
        setReadyForAnalysis(true)
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: text }])
      }
    } catch (e) {
      console.error(e)
      setError('Message failed to send. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <div className="bg-white/60 backdrop-blur-md border-b border-white/80 px-4 py-3 flex items-center gap-3 shadow-sm">
        <motion.button
          onClick={() => navigate('/')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition text-stone-400 hover:text-stone-600"
          whileTap={{ scale: 0.9 }}
        >
          ←
        </motion.button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-700 leading-none">Twrds</p>
            {pastDecision && (
              <p className="text-xs text-teal-500 leading-none mt-0.5">Following up</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          <span className="text-xs text-stone-400">online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              {msg.role === 'ai' && (
                <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center shrink-0 mb-0.5">
                  <span className="text-white text-[10px] font-bold">T</span>
                </div>
              )}
              <div
                className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-teal-600 text-white rounded-br-sm shadow-md shadow-teal-200/50'
                    : 'bg-white/90 text-stone-700 rounded-bl-sm shadow-sm border border-white'
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {loading && (
            <motion.div
              className="flex items-end gap-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-bold">T</span>
              </div>
              <div className="bg-white/90 border border-white shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 bg-stone-300 rounded-full block"
                      animate={{ y: [0, -5, 0], backgroundColor: ['#d4d0c8', '#9e9a90', '#d4d0c8'] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis prompt */}
        <AnimatePresence>
          {readyForAnalysis && (
            <motion.div
              className="self-center mt-2 bg-white/90 backdrop-blur-sm border border-white rounded-2xl shadow-md px-5 py-5 max-w-xs text-center"
              initial={{ opacity: 0, scale: 0.88, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            >
              <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">✦</span>
              </div>
              <p className="text-stone-700 text-sm font-semibold mb-1">Ready for your analysis</p>
              <p className="text-stone-400 text-xs mb-4 leading-relaxed">I have a good picture of your situation. Want to see it?</p>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => navigate('/analysis', { state: { messages, formData } })}
                  className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 transition shadow-md shadow-teal-200"
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Get analysis
                </motion.button>
                <motion.button
                  onClick={() => setReadyForAnalysis(false)}
                  className="flex-1 bg-stone-100 text-stone-500 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-200 transition"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Keep talking
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="px-4 py-2.5 bg-rose-50 border-t border-rose-100 flex items-center justify-between"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-sm text-rose-500">{error}</p>
            <button onClick={() => setError(null)} className="text-rose-300 hover:text-rose-500 text-xs ml-3">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="bg-white/60 backdrop-blur-md border-t border-white/80 px-4 py-3">
        <div className="flex gap-2 items-center bg-white rounded-2xl border border-stone-200 px-3 py-2 shadow-sm focus-within:border-teal-300 transition">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 bg-transparent text-sm text-stone-700 placeholder-stone-300 focus:outline-none"
          />
          <motion.button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
              input.trim() && !loading
                ? 'bg-teal-600 text-white shadow-sm shadow-teal-200'
                : 'bg-stone-100 text-stone-300'
            }`}
            whileHover={input.trim() && !loading ? { scale: 1.08 } : {}}
            whileTap={input.trim() && !loading ? { scale: 0.92 } : {}}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1.5 7L12.5 7M12.5 7L8 2.5M12.5 7L8 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        </div>
      </div>

    </div>
  )
}
