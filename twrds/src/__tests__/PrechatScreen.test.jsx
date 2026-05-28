import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrechatScreen from '../components/PrechatScreen'

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

function renderScreen() {
  return render(
    <MemoryRouter>
      <PrechatScreen />
    </MemoryRouter>
  )
}

describe('PrechatScreen', () => {
  beforeEach(() => mockNavigate.mockClear())

  it('renders the first question on load', () => {
    renderScreen()
    expect(screen.getByText('How are you feeling right now?')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
  })

  it('Next button does nothing if no option selected', () => {
    renderScreen()
    fireEvent.click(screen.getByText('Next →'))
    expect(screen.getByText('How are you feeling right now?')).toBeInTheDocument()
  })

  it('selecting an option and clicking Next advances to step 2', () => {
    renderScreen()
    fireEvent.click(screen.getByText('Calm'))
    fireEvent.click(screen.getByText('Next →'))
    expect(screen.getByText('How big is this decision?')).toBeInTheDocument()
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
  })

  it('Back on step 1 navigates to home', () => {
    renderScreen()
    fireEvent.click(screen.getByText('← Back'))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('Back on step 2 returns to step 1', () => {
    renderScreen()
    fireEvent.click(screen.getByText('Calm'))
    fireEvent.click(screen.getByText('Next →'))
    fireEvent.click(screen.getByText('← Back'))
    expect(screen.getByText('How are you feeling right now?')).toBeInTheDocument()
  })

  it('last step shows "Let\'s talk →" button', () => {
    renderScreen()
    fireEvent.click(screen.getByText('Calm'))
    fireEvent.click(screen.getByText('Next →'))
    fireEvent.click(screen.getByText('High'))
    fireEvent.click(screen.getByText('Next →'))
    expect(screen.getByText("Let's talk →")).toBeInTheDocument()
    expect(screen.getByText('What kind of decision is this?')).toBeInTheDocument()
  })

  it('completing all steps navigates to /chat with formData', () => {
    renderScreen()
    fireEvent.click(screen.getByText('Calm'))
    fireEvent.click(screen.getByText('Next →'))
    fireEvent.click(screen.getByText('High'))
    fireEvent.click(screen.getByText('Next →'))
    fireEvent.click(screen.getByText('Personal'))
    fireEvent.click(screen.getByText("Let's talk →"))
    expect(mockNavigate).toHaveBeenCalledWith('/chat', {
      state: { formData: { emotionalState: 'Calm', stakes: 'High', decisionType: 'Personal' } },
    })
  })
})
