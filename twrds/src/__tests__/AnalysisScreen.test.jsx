import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AnalysisScreen from '../components/AnalysisScreen'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, animate, initial, exit, transition, variants, whileHover, whileTap, layout, custom, ...props }) =>
      React.createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }) => children,
}))

const mockCreate = vi.hoisted(() => vi.fn())
vi.mock('groq-sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockAnalysis = {
  summary: 'Should I change jobs?',
  confidence: 'high',
  pros: ['Better pay', 'Growth'],
  cons: ['Risk', 'Uncertainty'],
  insights: 'You value growth.',
  recommendation: 'Go for it.',
}

const mockDecision = {
  id: 1,
  date: '3/30/2026',
  formData: { emotionalState: 'Calm', stakes: 'High', decisionType: 'Personal' },
  analysis: mockAnalysis,
}

function renderWithState(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/analysis', state }]}>
      <Routes>
        <Route path="/analysis" element={<AnalysisScreen />} />
        <Route path="/" element={<div>Home</div>} />
        <Route path="/chat" element={<div>Chat</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AnalysisScreen — viewing a past decision', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    localStorage.clear()
  })

  it('renders the analysis from a past decision without calling the API', () => {
    renderWithState({ decision: mockDecision })
    expect(screen.getByText('Should I change jobs?')).toBeInTheDocument()
    expect(screen.getByText('Go for it.')).toBeInTheDocument()
    expect(screen.getByText('Better pay')).toBeInTheDocument()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('shows pros and cons', () => {
    renderWithState({ decision: mockDecision })
    expect(screen.getByText('Better pay')).toBeInTheDocument()
    expect(screen.getByText('Risk')).toBeInTheDocument()
  })

  it('shows "Follow up in chat" button for past decisions', () => {
    renderWithState({ decision: mockDecision })
    expect(screen.getByText('Follow up in chat')).toBeInTheDocument()
  })

  it('"Follow up in chat" navigates to /chat with pastDecision', () => {
    renderWithState({ decision: mockDecision })
    fireEvent.click(screen.getByText('Follow up in chat'))
    expect(mockNavigate).toHaveBeenCalledWith('/chat', {
      state: { formData: mockDecision.formData, pastDecision: mockDecision },
    })
  })
})

describe('AnalysisScreen — new analysis', () => {
  const messages = [
    { role: 'user', text: 'I want to change jobs' },
    { role: 'ai', text: 'Tell me more' },
  ]
  const formData = { emotionalState: 'Calm', stakes: 'High', decisionType: 'Personal' }

  beforeEach(() => {
    mockNavigate.mockClear()
    localStorage.clear()
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
    })
  })

  it('calls the API and renders analysis for new conversations', async () => {
    renderWithState({ messages, formData })
    await waitFor(() => {
      expect(screen.getByText('Should I change jobs?')).toBeInTheDocument()
    })
    expect(mockCreate).toHaveBeenCalled()
  })

  it('save button appears and saves to localStorage', async () => {
    renderWithState({ messages, formData })
    await waitFor(() => screen.getByText('Save this decision'))
    fireEvent.click(screen.getByText('Save this decision'))
    expect(screen.getByText('✓ Saved to past decisions')).toBeInTheDocument()
    const saved = JSON.parse(localStorage.getItem('twrds_decisions'))
    expect(saved).toHaveLength(1)
    expect(saved[0].analysis.summary).toBe('Should I change jobs?')
  })

  it('shows error state when API fails', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API error'))
    renderWithState({ messages, formData })
    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    })
  })

  it('redirects home if no messages or formData', () => {
    renderWithState({})
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
