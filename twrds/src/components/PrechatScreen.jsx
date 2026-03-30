import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const groups = [
  {
    label: 'How are you feeling right now?',
    sub: 'Your emotional state shapes how we approach this.',
    field: 'emotionalState',
    options: ['Calm', 'Stressed', 'Neutral', 'Excited'],
  },
  {
    label: 'How big is this decision?',
    sub: 'This helps calibrate how deeply we dig in.',
    field: 'stakes',
    options: ['Low', 'Medium', 'High'],
  },
  {
    label: 'What kind of decision is this?',
    sub: 'Different decisions call for different lenses.',
    field: 'decisionType',
    options: ['Personal', 'Professional', 'Financial', 'Other'],
  },
]

const slideVariants = {
  enter: (dir) => ({ opacity: 0, x: dir * 48 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir * -48 }),
}

export default function PrechatScreen() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [formData, setFormData] = useState({ emotionalState: '', stakes: '', decisionType: '' })

  const current = groups[step]
  const selected = formData[current.field]
  const isLast = step === groups.length - 1

  const handleSelect = (value) => {
    setFormData(prev => ({ ...prev, [current.field]: value }))
  }

  const handleNext = () => {
    if (!selected) return
    if (isLast) {
      navigate('/chat', { state: { formData } })
    } else {
      setDir(1)
      setStep(s => s + 1)
    }
  }

  const handleBack = () => {
    if (step === 0) { navigate('/'); return }
    setDir(-1)
    setStep(s => s - 1)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="w-full max-w-sm">

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-10">
          {groups.map((_, i) => (
            <motion.div
              key={i}
              className="h-1 rounded-full bg-stone-200 flex-1 overflow-hidden"
              layout
            >
              <motion.div
                className="h-full bg-teal-500 rounded-full"
                initial={false}
                animate={{ width: i <= step ? '100%' : '0%' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </motion.div>
          ))}
        </div>

        {/* Step counter */}
        <motion.p
          className="text-xs text-stone-400 font-medium mb-4 uppercase tracking-wider"
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          Step {step + 1} of {groups.length}
        </motion.p>

        {/* Question slide */}
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <h2 className="text-2xl font-bold text-stone-800 mb-1 leading-snug">
                {current.label}
              </h2>
              <p className="text-sm text-stone-400 mb-7">{current.sub}</p>

              <div className={`grid gap-3 ${current.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {current.options.map((value) => {
                  const isSelected = selected === value
                  return (
                    <motion.button
                      key={value}
                      onClick={() => handleSelect(value)}
                      className={`relative flex items-center justify-center p-4 rounded-2xl border-2 transition-colors ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-stone-200 bg-white/70 hover:border-stone-300 hover:bg-white'
                      }`}
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <span className={`text-sm font-semibold ${isSelected ? 'text-teal-700' : 'text-stone-600'}`}>
                        {value}
                      </span>

                      {/* Checkmark badge */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            className="absolute top-2 right-2 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center"
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          >
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nav */}
        <div className="flex gap-3 mt-8">
          <motion.button
            onClick={handleBack}
            className="px-4 py-3 rounded-xl text-sm font-medium text-stone-400 hover:text-stone-600 hover:bg-white/60 transition"
            whileTap={{ scale: 0.96 }}
          >
            ← Back
          </motion.button>
          <motion.button
            onClick={handleNext}
            disabled={!selected}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition ${
              selected
                ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-200'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
            whileHover={selected ? { scale: 1.02, y: -1 } : {}}
            whileTap={selected ? { scale: 0.97 } : {}}
            animate={selected ? { opacity: 1 } : { opacity: 0.6 }}
          >
            {isLast ? "Let's talk →" : 'Next →'}
          </motion.button>
        </div>

      </div>
    </div>
  )
}
