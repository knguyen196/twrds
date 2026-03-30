import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const LETTERS = 'TWRDS'.split('')

const confidenceConfig = {
  high:   { bar: 'bg-emerald-400', text: 'text-emerald-600', dot: 'bg-emerald-400', pct: 90 },
  medium: { bar: 'bg-amber-400',   text: 'text-amber-500',   dot: 'bg-amber-400',   pct: 55 },
  low:    { bar: 'bg-rose-400',    text: 'text-rose-400',    dot: 'bg-rose-400',    pct: 25 },
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const [decisions, setDecisions] = useState([])
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('twrds_decisions') || '[]')
    setDecisions(saved)
  }, [])

  const deleteDecision = (id) => {
    const filtered = decisions.filter(item => item.id !== id)
    localStorage.setItem('twrds_decisions', JSON.stringify(filtered))
    setDecisions(filtered)
    setConfirmDeleteId(null)
  }

  const viewDecision = (decision) => {
    navigate('/analysis', { state: { decision } })
  }

  const followUpDecision = (decision) => {
    navigate('/chat', { state: { formData: decision.formData, pastDecision: decision } })
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-6 pb-12">
      <div className="w-full max-w-md">

        {/* Animated logo */}
        <motion.div
          className="flex flex-col items-center mb-10 mt-10"
          initial="hidden"
          animate="visible"
        >
          <div className="flex gap-0.5 mb-2">
            {LETTERS.map((letter, i) => (
              <motion.span
                key={i}
                className="text-4xl font-black text-stone-800 tracking-tight"
                initial={{ opacity: 0, y: 20, rotateX: -60 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                {letter}
              </motion.span>
            ))}
          </div>
          <motion.p
            className="text-stone-400 text-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
          >
            A nudge in the right direction
          </motion.p>
        </motion.div>

        {/* CTA button */}
        <motion.button
          onClick={() => navigate('/prechat')}
          className="w-full bg-teal-600 text-white px-6 py-4 rounded-2xl text-base font-semibold hover:bg-teal-700 transition shadow-lg shadow-teal-200 mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          Make a Decision
        </motion.button>

        {/* Past decisions */}
        <AnimatePresence mode="popLayout">
          {decisions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.75 }}
            >
              <p className="text-xs text-stone-400 uppercase font-semibold tracking-wider mb-4">
                Past decisions
              </p>
              <div className="flex flex-col gap-3">
                {decisions.map((decision, i) => {
                  const cfg = confidenceConfig[decision.analysis.confidence] || confidenceConfig.medium

                  return (
                    <motion.div
                      key={decision.id}
                      layout
                      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden border border-white"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ duration: 0.35, delay: i * 0.07 }}
                      whileHover={{ y: -2, shadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                    >
                      {/* Left accent stripe */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.bar} rounded-l-2xl`} />

                      {/* Clickable body */}
                      <button
                        onClick={() => viewDecision(decision)}
                        className="w-full text-left pl-5 pr-4 pt-4 pb-3 hover:bg-stone-50/50 transition"
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-xs text-stone-400">{decision.date}</span>
                          <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full capitalize">
                            {decision.formData.decisionType}
                          </span>
                        </div>
                        <p className="text-sm text-stone-800 font-medium leading-snug mb-2">
                          {decision.analysis.summary}
                        </p>

                        {/* Mini confidence bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${cfg.bar}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${cfg.pct}%` }}
                              transition={{ duration: 0.8, delay: i * 0.07 + 0.3, ease: 'easeOut' }}
                            />
                          </div>
                          <span className={`text-xs font-medium capitalize ${cfg.text}`}>
                            {decision.analysis.confidence}
                          </span>
                        </div>

                        <p className="text-xs text-teal-500 mt-2 font-medium">View analysis →</p>
                      </button>

                      {/* Action row */}
                      <div className="flex border-t border-stone-100 pl-5">
                        <button
                          onClick={() => followUpDecision(decision)}
                          className="flex-1 py-2.5 text-xs font-semibold text-teal-600 hover:bg-teal-50 transition text-left"
                        >
                          Follow up
                        </button>
                        <div className="w-px bg-stone-100" />
                        <AnimatePresence mode="wait">
                          {confirmDeleteId === decision.id ? (
                            <motion.div
                              key="confirm"
                              className="flex flex-1"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                            >
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 py-2.5 text-xs font-medium text-stone-400 hover:bg-stone-50 transition"
                              >
                                Cancel
                              </button>
                              <div className="w-px bg-stone-100" />
                              <button
                                onClick={() => deleteDecision(decision.id)}
                                className="flex-1 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 transition"
                              >
                                Delete
                              </button>
                            </motion.div>
                          ) : (
                            <motion.button
                              key="delete-btn"
                              onClick={() => setConfirmDeleteId(decision.id)}
                              className="flex-1 py-2.5 text-xs font-medium text-stone-300 hover:text-rose-400 hover:bg-rose-50 transition"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                            >
                              Delete
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {decisions.length === 0 && (
          <motion.div
            className="text-center mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.75 }}
          >
            <p className="text-stone-400 text-sm">No past decisions yet.</p>
            <p className="text-stone-300 text-xs mt-1">Make your first one above.</p>
          </motion.div>
        )}

      </div>
    </div>
  )
}
