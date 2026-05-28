import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomeScreen from '../components/HomeScreen'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, animate, initial, exit, transition, variants, whileHover, whileTap, layout, custom, ...props }) =>
      React.createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }) => children,
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockDecision = {
  id: 1,
  date: '3/30/2026',
  formData: { emotionalState: 'Calm', stakes: 'High', decisionType: 'Personal' },
  analysis: {
    summary: 'Should I change jobs?',
    confidence: 'high',
    pros: ['Better pay'],
    cons: ['Risk'],
    insights: 'You value growth.',
    recommendation: 'Go for it.',
  },
}

function renderScreen() {
  return render(
    <MemoryRouter>
      <HomeScreen />
    </MemoryRouter>
  )
}

describe('HomeScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    localStorage.clear()
  })

  it('shows empty state when no past decisions', () => {
    renderScreen()
    expect(screen.getByText('No past decisions yet.')).toBeInTheDocument()
  })

  it('renders past decisions from localStorage', () => {
    localStorage.setItem('twrds_decisions', JSON.stringify([mockDecision]))
    renderScreen()
    expect(screen.getByText('Should I change jobs?')).toBeInTheDocument()
    expect(screen.getByText('3/30/2026')).toBeInTheDocument()
  })

  it('clicking "Make a Decision" navigates to /prechat', () => {
    renderScreen()
    fireEvent.click(screen.getByText('Make a Decision'))
    expect(mockNavigate).toHaveBeenCalledWith('/prechat')
  })

  it('clicking "View analysis →" navigates to /analysis with decision', () => {
    localStorage.setItem('twrds_decisions', JSON.stringify([mockDecision]))
    renderScreen()
    fireEvent.click(screen.getByText('View analysis →'))
    expect(mockNavigate).toHaveBeenCalledWith('/analysis', { state: { decision: mockDecision } })
  })

  it('clicking "Follow up" navigates to /chat with pastDecision', () => {
    localStorage.setItem('twrds_decisions', JSON.stringify([mockDecision]))
    renderScreen()
    fireEvent.click(screen.getByText('Follow up'))
    expect(mockNavigate).toHaveBeenCalledWith('/chat', {
      state: { formData: mockDecision.formData, pastDecision: mockDecision },
    })
  })

  it('delete requires confirmation before removing', () => {
    localStorage.setItem('twrds_decisions', JSON.stringify([mockDecision]))
    renderScreen()
    fireEvent.click(screen.getByText('Delete'))
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.getByText('Should I change jobs?')).toBeInTheDocument()
  })

  it('confirming delete removes the decision', () => {
    localStorage.setItem('twrds_decisions', JSON.stringify([mockDecision]))
    renderScreen()
    fireEvent.click(screen.getByText('Delete'))
    fireEvent.click(screen.getByText('Delete')) // confirm
    expect(screen.queryByText('Should I change jobs?')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('twrds_decisions'))).toHaveLength(0)
  })
})
