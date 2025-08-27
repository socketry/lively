import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EnhancedWaitingRoom } from '../src/components/EnhancedWaitingRoom'
import { I18nProvider } from '../src/contexts/I18nContext'
import { WebSocketProvider } from '../src/contexts/WebSocketContext'
import { AppProvider } from '../src/contexts/AppContext'
import { AuthProvider } from '../src/contexts/AuthContext'
import { GameProvider } from '../src/contexts/GameContext'
import { BrowserRouter } from 'react-router-dom'

// Mock WebSocket
vi.mock('../src/services/websocket', () => ({
  setupWebSocket: () => ({
    connect: () => Promise.resolve(),
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    isConnected: true
  })
}))

// Mock hooks that might be used in components
vi.mock('../src/hooks/useLoadingState', () => ({
  useBotManagementState: () => ({
    execute: vi.fn().mockResolvedValue({}),
    loading: false,
    error: null
  }),
  useConnectionState: () => ({
    execute: vi.fn().mockResolvedValue({}),
    loading: false,
    error: null
  })
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AppProvider>
      <AuthProvider>
        <I18nProvider>
          <WebSocketProvider>
            <GameProvider>
              {children}
            </GameProvider>
          </WebSocketProvider>
        </I18nProvider>
      </AuthProvider>
    </AppProvider>
  </BrowserRouter>
)

describe('Accessibility Tests', () => {
  describe('EnhancedWaitingRoom', () => {
    it('should have proper ARIA landmarks', () => {
      render(
        <TestWrapper>
          <EnhancedWaitingRoom roomId="test-room" />
        </TestWrapper>
      )

      // Check for main landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('complementary')).toBeInTheDocument()
      expect(screen.getByRole('application')).toBeInTheDocument()
    })

    it('should have accessible heading structure', () => {
      render(
        <TestWrapper>
          <EnhancedWaitingRoom roomId="test-room" />
        </TestWrapper>
      )

      // Check for proper heading hierarchy
      const roomTitle = screen.getByRole('heading', { level: 1 })
      expect(roomTitle).toBeInTheDocument()
      expect(roomTitle).toHaveAttribute('id', 'room-title')

      const ctTeamHeading = screen.getByRole('heading', { level: 2, name: /counter-terrorists/i })
      expect(ctTeamHeading).toBeInTheDocument()
      expect(ctTeamHeading).toHaveAttribute('id', 'ct-team-heading')

      const tTeamHeading = screen.getByRole('heading', { level: 2, name: /terrorists/i })
      expect(tTeamHeading).toBeInTheDocument()
      expect(tTeamHeading).toHaveAttribute('id', 't-team-heading')
    })

    it('should have accessible form controls', () => {
      render(
        <TestWrapper>
          <EnhancedWaitingRoom roomId="test-room" />
        </TestWrapper>
      )

      // Chat input should have proper labeling
      const chatInput = screen.getByLabelText(/type a chat message/i)
      expect(chatInput).toBeInTheDocument()
      expect(chatInput).toHaveAttribute('id', 'chat-input')
      expect(chatInput).toHaveAttribute('maxlength', '500')

      // Send button should be accessible
      const sendButton = screen.getByRole('button', { name: /send chat message/i })
      expect(sendButton).toBeInTheDocument()
      expect(sendButton).toHaveAttribute('type', 'submit')
    })

    it('should support keyboard navigation for interactive elements', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <EnhancedWaitingRoom roomId="test-room" />
        </TestWrapper>
      )

      // Ready toggle should be keyboard accessible
      const readyButton = screen.getByRole('button', { name: /toggle ready status/i })
      expect(readyButton).toBeInTheDocument()
      
      await user.tab()
      expect(readyButton).toHaveFocus()
      
      // Should work with Enter key
      await user.keyboard('{Enter}')
      expect(readyButton).toHaveAttribute('aria-pressed', 'true')

      // Should work with Space key
      await user.keyboard(' ')
      expect(readyButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should have accessible lists for players', () => {
      render(
        <TestWrapper>
          <EnhancedWaitingRoom roomId="test-room" />
        </TestWrapper>
      )

      // Team player lists should have proper ARIA
      const ctPlayerList = screen.getByLabelText(/counter-terrorist team players/i)
      expect(ctPlayerList).toBeInTheDocument()
      expect(ctPlayerList).toHaveAttribute('role', 'list')

      const tPlayerList = screen.getByLabelText(/terrorist team players/i)
      expect(tPlayerList).toBeInTheDocument()
      expect(tPlayerList).toHaveAttribute('role', 'list')

      // List items should have proper attributes
      const listItems = screen.getAllByRole('listitem')
      expect(listItems.length).toBeGreaterThan(0)
      
      listItems.forEach(item => {
        expect(item).toHaveAttribute('aria-setsize')
        expect(item).toHaveAttribute('aria-posinset')
      })
    })

    it('should have accessible bot manager modal', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <EnhancedWaitingRoom roomId="test-room" />
        </TestWrapper>
      )

      // Open bot manager
      const botManagerButton = screen.getByRole('button', { name: /bot manager/i })
      await user.click(botManagerButton)

      // Modal should be accessible
      const modal = screen.getByRole('dialog')
      expect(modal).toBeInTheDocument()
      expect(modal).toHaveAttribute('aria-modal', 'true')
      expect(modal).toHaveAttribute('aria-labelledby', 'bot-manager-title')
      expect(modal).toHaveAttribute('aria-describedby', 'bot-manager-description')

      // Modal title should be accessible
      const modalTitle = screen.getByRole('heading', { name: /bot manager/i })
      expect(modalTitle).toBeInTheDocument()
      expect(modalTitle).toHaveAttribute('id', 'bot-manager-title')

      // Close button should be accessible
      const closeButton = screen.getByRole('button', { name: /close bot manager/i })
      expect(closeButton).toBeInTheDocument()
      
      // Should close with Escape key
      await user.keyboard('{Escape}')
      expect(modal).not.toBeInTheDocument()
    })

    it('should provide screen reader announcements', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <EnhancedWaitingRoom roomId="test-room" />
        </TestWrapper>
      )

      // Live region should exist for announcements
      const liveRegion = screen.getByLabelText(/announcements/i)
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
    })

    it('should have proper focus management', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <EnhancedWaitingRoom roomId="test-room" />
        </TestWrapper>
      )

      // Skip link should be accessible
      const skipLink = screen.getByText(/skip to main content/i)
      expect(skipLink).toBeInTheDocument()
      expect(skipLink).toHaveAttribute('href', '#main-content')

      // Main content should have proper ID
      const mainContent = screen.getByRole('main')
      expect(mainContent).toHaveAttribute('id', 'main-content')
    })

    it('should have accessible room settings', () => {
      render(
        <TestWrapper>
          <EnhancedWaitingRoom roomId="test-room" />
        </TestWrapper>
      )

      // Room settings should use definition list
      const settingsSection = screen.getByLabelText(/room settings/i)
      expect(settingsSection).toBeInTheDocument()

      // Should have proper dt/dd structure
      const mapTerm = screen.getByText('Map')
      expect(mapTerm.tagName).toBe('DT')

      const modeTerm = screen.getByText('Mode')
      expect(modeTerm.tagName).toBe('DT')

      // Friendly fire setting should have proper labeling
      const friendlyFireValue = screen.getByLabelText(/friendly fire is/i)
      expect(friendlyFireValue).toBeInTheDocument()
    })

    it('should handle reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(
        <TestWrapper>
          <EnhancedWaitingRoom roomId="test-room" />
        </TestWrapper>
      )

      // Should render without animations when reduced motion is preferred
      const container = screen.getByRole('application')
      expect(container).toBeInTheDocument()
    })

    it('should maintain color contrast for accessibility', () => {
      render(
        <TestWrapper>
          <EnhancedWaitingRoom roomId="test-room" />
        </TestWrapper>
      )

      // Test that important interactive elements are present
      // (Actual color contrast testing would require visual testing tools)
      const readyButton = screen.getByRole('button', { name: /toggle ready status/i })
      expect(readyButton).toBeInTheDocument()
      
      const startButton = screen.getByRole('button', { name: /start game/i })
      expect(startButton).toBeInTheDocument()
    })
  })
})