import { describe, it, expect } from 'vitest'
import { ARIA_LABELS, colorContrast, focusUtils, isActionKey, KEYBOARD_KEYS } from '../src/utils/accessibility'

describe('Accessibility Utils', () => {
  it('should have proper ARIA labels defined', () => {
    expect(ARIA_LABELS.navigation).toBe('Main navigation')
    expect(ARIA_LABELS.connectionStatus).toBe('WebSocket connection status')
    expect(ARIA_LABELS.botManager).toBe('Bot management panel')
    expect(ARIA_LABELS.readyToggle).toBe('Toggle ready status')
    expect(ARIA_LABELS.startGame).toBe('Start the game')
  })

  it('should properly identify action keys', () => {
    const enterEvent = { key: KEYBOARD_KEYS.ENTER } as React.KeyboardEvent
    const spaceEvent = { key: KEYBOARD_KEYS.SPACE } as React.KeyboardEvent
    const tabEvent = { key: KEYBOARD_KEYS.TAB } as React.KeyboardEvent
    
    expect(isActionKey(enterEvent)).toBe(true)
    expect(isActionKey(spaceEvent)).toBe(true)
    expect(isActionKey(tabEvent)).toBe(false)
  })

  it('should calculate color contrast ratios correctly', () => {
    // Test with known contrast ratios
    const blackWhite = colorContrast.getContrastRatio('#000000', '#ffffff')
    expect(blackWhite).toBe(21) // Perfect contrast ratio
    
    const sameColor = colorContrast.getContrastRatio('#ff0000', '#ff0000')
    expect(sameColor).toBe(1) // No contrast
  })

  it('should validate WCAG compliance', () => {
    // High contrast combinations should pass AA and AAA
    expect(colorContrast.meetsWCAGAA('#000000', '#ffffff')).toBe(true)
    expect(colorContrast.meetsWCAGAAA('#000000', '#ffffff')).toBe(true)
    
    // Low contrast should fail
    expect(colorContrast.meetsWCAGAA('#ffffff', '#fefefe')).toBe(false)
    expect(colorContrast.meetsWCAGAAA('#ffffff', '#fefefe')).toBe(false)
  })

  it('should have proper keyboard navigation constants', () => {
    expect(KEYBOARD_KEYS.ENTER).toBe('Enter')
    expect(KEYBOARD_KEYS.ESCAPE).toBe('Escape')
    expect(KEYBOARD_KEYS.SPACE).toBe(' ')
    expect(KEYBOARD_KEYS.ARROW_UP).toBe('ArrowUp')
    expect(KEYBOARD_KEYS.ARROW_DOWN).toBe('ArrowDown')
  })

  it('should provide focus utility functions', () => {
    expect(typeof focusUtils.focusFirst).toBe('function')
    expect(typeof focusUtils.focusLast).toBe('function')
    expect(typeof focusUtils.trapFocus).toBe('function')
  })
})