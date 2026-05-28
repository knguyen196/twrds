import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

async function groqChat(messages, max_tokens, response_format) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, max_tokens, response_format }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

const confidenceConfig = {
  high:   { color: '#10b981', track: '#d1fae5', label: 'High',   pct: 0.9,  text: 'text-emerald-600' },
  medium: { color: '#f59e0b', track: '#fef3c7', label: 'Medium', pct: 0.55, text: 'text-amber-500' },
  low:    { color: '#f87171', track: '#fee2e2', label: 'Low',    pct: 0.25, text: 'text-rose-400' },
}

function ConfidenceRing({ confidence }) {
  const cfg = confidenceConfig[confidence] || confidenceConfig.medium
  const R = 36
  const circ = 2 * Math.PI * R
  const dash = circ * cfg.pct

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 shrink-0">
        <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
          <circle cx="40" cy="40" r={R} fill="none" stroke={cfg.track} strokeWidth="7" />
          <motion.circle
            cx="40" cy="40" r={R}
            fill="none"
            stroke={cfg.color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.1, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`text-lg font-black ${cfg.text}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            {Math.round(cfg.pct * 100)}%
          </motion.span>
        </div>
      </div>
      <div>
        <p className={`text-xl font-bold capitalize ${cfg.text}`}>{cfg.label}</p>
        <p className="text-xs text-stone-400 mt-0.5">confidence in this analysis</p>
      </div>
    </div>
  )
}

function ProsConsBar({ pros, cons }) {
  const total = pros.length + cons.length || 1
  const prosPct = (pros.length / total) * 100

  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs font-semibold mb-1.5">
        <span className="text-emerald-500">{pros.length} pros</span>
        <span className="text-rose-400">{cons.length} cons</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex gap-0.5 bg-stone-100">
        <motion.div
          className="h-full bg-emerald-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${prosPct}%` }}
          transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
        />
        <motion.div
          className="h-full bg-rose-300 rounded-full flex-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        />
      </div>
    </div>
  )
}

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  visible: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.45, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }
  })
}

export default function AnalysisScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const { messages, formData, decision } = location.state || {}

  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const saveDecision = () => {
    const decisionToSave = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      formData,
      analysis,
    }
    const existing = JSON.parse(localStorage.getItem('twrds_decisions') || '[]')
    localStorage.setItem('twrds_decisions', JSON.stringify([decisionToSave, ...existing]))
    setSaved(true)
  }

  useEffect(() => {
    if (decision) {
      setAnalysis(decision.analysis)
      setSaved(true)
      setLoading(false)
      return
    }
    if (!messages || !formData) { navigate('/'); return }
    generateAnalysis()
  }, [])

  const generateAnalysis = async () => {
    try {
      const conversationText = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Twrds'}: ${m.text}`)
        .join('\n')

      const prompt = `Based on this decision-making conversation, provide a structured analysis.

User context:
- Emotional state: ${formData.emotionalState}
- Stakes level: ${formData.stakes}
- Decision type: ${formData.decisionType}

Conversation:
${conversationText}

Respond with ONLY valid JSON in this exact format:
{
  "summary": "one sentence summary of the decision",
  "pros": ["pro 1", "pro 2", "pro 3"],
  "cons": ["con 1", "con 2", "con 3"],
  "insights": "2-3 sentences about what their answers reveal",
  "recommendation": "a clear warm 2-3 sentence recommendation",
  "confidence": "high"
}

Output JSON only. No text before or after.`

      const result = await groqChat(
        [{ role: 'user', content: prompt }],
        1000,
        { type: 'json_object' }
      )
      const text = result.choices[0].message.content
      setAnalysis(JSON.parse(text))
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
        >
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="22" stroke="#c7ebe8" strokeWidth="2.5" strokeDasharray="6 6" />
            <circle cx="28" cy="28" r="12" stroke="#2d9e96" strokeWidth="2" strokeDasharray="4 4" />
            <circle cx="28" cy="28" r="4" fill="#2d9e96" />
          </svg>
        </motion.div>
        <div className="text-center">
          <p className="text-stone-700 text-sm font-medium">Thinking it through...</p>
          <p className="text-stone-400 text-xs mt-1">Building your analysis</p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-stone-400 text-sm">Something went wrong. Please try again.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-teal-600 text-sm font-medium">← Go home</button>
      </div>
    )
  }

  const fd = decision?.formData || formData

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto pb-12">

      {/* Header */}
      <motion.div
        className="flex items-start gap-3 mb-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.button
          onClick={() => navigate('/')}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 border border-stone-200 text-stone-400 hover:text-stone-600 hover:bg-white transition mt-0.5 shrink-0"
          whileTap={{ scale: 0.9 }}
        >
          ←
        </motion.button>
        <div>
          <h2 className="text-2xl font-bold text-stone-800 leading-tight">Your Analysis</h2>
          <p className="text-stone-400 text-sm mt-0.5 leading-snug">{analysis.summary}</p>
        </div>
      </motion.div>

      {/* Context pills */}
      {fd && (
        <motion.div
          className="flex gap-2 flex-wrap mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          {['decisionType', 'stakes', 'emotionalState'].map(key => (
            fd[key] ? (
              <span key={key} className="text-xs bg-white/80 border border-stone-200 text-stone-500 px-2.5 py-1 rounded-full capitalize">
                {fd[key]}
              </span>
            ) : null
          ))}
          {decision?.date && (
            <span className="text-xs bg-white/80 border border-stone-200 text-stone-400 px-2.5 py-1 rounded-full">
              {decision.date}
            </span>
          )}
        </motion.div>
      )}

      {/* Confidence card */}
      <motion.div
        className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white mb-4"
        custom={0}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <p className="text-xs text-stone-400 uppercase font-semibold tracking-wider mb-4">Confidence</p>
        <ConfidenceRing confidence={analysis.confidence} />
      </motion.div>

      {/* Pros & Cons card */}
      <motion.div
        className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white mb-4"
        custom={1}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <p className="text-xs text-stone-400 uppercase font-semibold tracking-wider mb-4">Pros & Cons</p>
        <ProsConsBar pros={analysis.pros} cons={analysis.cons} />
        <div className="flex gap-4 mt-3">
          <ul className="flex-1 flex flex-col gap-2">
            {analysis.pros.map((pro, i) => (
              <motion.li
                key={i}
                className="flex items-start gap-2 text-sm text-stone-600"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
              >
                <span className="text-emerald-500 mt-0.5 shrink-0 font-bold">+</span>
                {pro}
              </motion.li>
            ))}
          </ul>
          <div className="w-px bg-stone-100" />
          <ul className="flex-1 flex flex-col gap-2">
            {analysis.cons.map((con, i) => (
              <motion.li
                key={i}
                className="flex items-start gap-2 text-sm text-stone-600"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
              >
                <span className="text-rose-400 mt-0.5 shrink-0 font-bold">−</span>
                {con}
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Insights card */}
      <motion.div
        className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white mb-4"
        custom={2}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <p className="text-xs text-stone-400 uppercase font-semibold tracking-wider mb-3">What this reveals</p>
        <p className="text-sm text-stone-600 leading-relaxed">{analysis.insights}</p>
      </motion.div>

      {/* Recommendation */}
      <motion.div
        className="relative rounded-2xl p-5 mb-6 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)' }}
        custom={3}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <p className="text-xs text-teal-200 uppercase font-semibold tracking-wider mb-2 relative">Recommendation</p>
        <p className="text-sm text-white leading-relaxed relative">{analysis.recommendation}</p>
      </motion.div>

      {/* Actions */}
      <AnimatePresence mode="wait">
        {decision ? (
          <motion.div
            key="past-actions"
            className="flex gap-3 mb-3"
            custom={4}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.button
              onClick={() => navigate('/chat', { state: { formData: decision.formData, pastDecision: decision } })}
              className="flex-1 bg-teal-600 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-teal-700 transition shadow-md shadow-teal-200"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              Follow up in chat
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="save-actions"
            className="mb-3"
            custom={4}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.button
              onClick={saveDecision}
              disabled={saved}
              className={`w-full px-6 py-3 rounded-xl text-sm font-semibold transition ${
                saved
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-200'
              }`}
              whileHover={!saved ? { scale: 1.02, y: -1 } : {}}
              whileTap={!saved ? { scale: 0.97 } : {}}
            >
              {saved ? '✓ Saved to past decisions' : 'Save this decision'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => navigate('/')}
        className="w-full bg-white/70 border border-stone-200 text-stone-500 px-6 py-3 rounded-xl text-sm font-medium hover:bg-white transition"
        custom={5}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Back to home
      </motion.button>

    </div>
  )
}
