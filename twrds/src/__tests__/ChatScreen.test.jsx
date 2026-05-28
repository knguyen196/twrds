import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ChatScreen from '../components/ChatScreen'

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

const defaultFormData = { emotionalState: 'Calm', stakes: 'High', decisionType: 'Personal' }

function renderWithState(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/chat', state }]}>
      <Routes>
        <Route path="/chat" element={<ChatScreen />} />
        <Route path="/analysis" element={<div>Analysis</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ChatScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Hi! Tell me about your decision.' } }],
    })
  })

  it('loads and displays the initial AI message', async () => {
    renderWithState({ formData: defaultFormData })
    await waitFor(() => {
      expect(screen.getByText('Hi! Tell me about your decision.')).toBeInTheDocument()
    })
  })

  it('sends a user message and displays the AI reply', async () => {
    renderWithState({ formData: defaultFormData })
    await waitFor(() => screen.getByText('Hi! Tell me about your decision.'))

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'That sounds important!' } }],
    })

    const input = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(input, { target: { value: 'I want to change careers' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('I want to change careers')).toBeInTheDocument()
      expect(screen.getByText('That sounds important!')).toBeInTheDocument()
    })
  })

  it('clears the input after sending', async () => {
    renderWithState({ formData: defaultFormData })
    await waitFor(() => screen.getByText('Hi! Tell me about your decision.'))

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Tell me more.' } }],
    })

    const input = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(input, { target: { value: 'My situation is...' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(input.value).toBe(''))
  })

  it('shows the analysis prompt when READY_FOR_ANALYSIS is returned', async () => {
    renderWithState({ formData: defaultFormData })
    await waitFor(() => screen.getByText('Hi! Tell me about your decision.'))

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'I have enough info. READY_FOR_ANALYSIS' } }],
    })

    const input = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(input, { target: { value: 'Here is my situation' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('Ready for your analysis')).toBeInTheDocument()
    })
  })

  it('strips READY_FOR_ANALYSIS from the displayed message', async () => {
    renderWithState({ formData: defaultFormData })
    await waitFor(() => screen.getByText('Hi! Tell me about your decision.'))

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Great chat. READY_FOR_ANALYSIS' } }],
    })

    fireEvent.change(screen.getByPlaceholderText('Type your message...'), {
      target: { value: 'test' },
    })
    fireEvent.keyDown(screen.getByPlaceholderText('Type your message...'), { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('Great chat.')).toBeInTheDocument()
      expect(screen.queryByText('READY_FOR_ANALYSIS')).not.toBeInTheDocument()
    })
  })

  it('shows error banner when initial load fails', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Network error'))
    renderWithState({ formData: defaultFormData })
    await waitFor(() => {
      expect(screen.getByText('Failed to connect. Please refresh the page.')).toBeInTheDocument()
    })
  })

  it('shows error banner when sending a message fails', async () => {
    renderWithState({ formData: defaultFormData })
    await waitFor(() => screen.getByText('Hi! Tell me about your decision.'))

    mockCreate.mockRejectedValueOnce(new Error('Network error'))

    const input = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('Message failed to send. Please try again.')).toBeInTheDocument()
    })
  })

  it('dismisses the error banner when ✕ is clicked', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Network error'))
    renderWithState({ formData: defaultFormData })
    await waitFor(() => screen.getByText('Failed to connect. Please refresh the page.'))
    fireEvent.click(screen.getByText('✕'))
    expect(screen.queryByText('Failed to connect. Please refresh the page.')).not.toBeInTheDocument()
  })
})
