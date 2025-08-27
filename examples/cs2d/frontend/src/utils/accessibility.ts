/**
 * Accessibility utilities for CS2D game interface
 * Provides ARIA labels, keyboard navigation helpers, and focus management
 */

/**
 * Standard ARIA labels for common game interface elements
 */
export const ARIA_LABELS = {
  // Navigation
  navigation: 'Main navigation',
  lobbyNavigation: 'Lobby navigation menu',
  
  // Game states
  connectionStatus: 'WebSocket connection status',
  connectionConnected: 'Connected to game server',
  connectionDisconnected: 'Disconnected from game server',
  connectionConnecting: 'Connecting to game server',
  connectionError: 'Connection error - unable to reach server',
  
  // Room interface
  roomHeader: 'Room information and controls',
  roomSettings: 'Room configuration settings',
  roomSettingsModal: 'Room settings dialog',
  playerList: 'List of players in the room',
  teamCounterTerrorists: 'Counter-Terrorists team players',
  teamTerrorists: 'Terrorists team players',
  spectatorList: 'Spectator players',
  emptySlot: 'Empty player slot',
  
  // Player actions
  readyToggle: 'Toggle ready status',
  readyStatus: 'Player ready status',
  playerReady: 'Player is ready to start',
  playerNotReady: 'Player is not ready',
  kickPlayer: 'Remove player from room',
  
  // Bot management
  botManager: 'Bot management panel',
  botManagerModal: 'Bot manager dialog',
  addBot: 'Add bot to game',
  removeBot: 'Remove bot from game',
  botDifficulty: 'Bot difficulty level',
  botConfiguration: 'Bot settings and configuration',
  
  // Game controls
  startGame: 'Start the game',
  leaveRoom: 'Leave current room',
  joinRoom: 'Join this room',
  createRoom: 'Create new room',
  quickJoin: 'Quickly join a game with bots',
  
  // Chat
  chatPanel: 'Game chat messages',
  chatInput: 'Type chat message',
  chatSend: 'Send chat message',
  chatMessage: 'Chat message',
  
  // Search and filters
  searchRooms: 'Search for rooms',
  filterRooms: 'Filter rooms by criteria',
  roomFilters: 'Room filtering options',
  
  // Modals
  modal: 'Dialog window',
  closeModal: 'Close dialog',
  modalOverlay: 'Modal background overlay',
  
  // Forms
  formField: 'Form input field',
  formSubmit: 'Submit form',
  formCancel: 'Cancel form',
  
  // Status indicators
  gameStatus: 'Game status indicator',
  playerCount: 'Number of players',
  ping: 'Network latency',
  
  // Loading states
  loading: 'Loading content',
  loadingIndicator: 'Loading indicator'
} as const;

/**
 * Keyboard navigation key codes and helpers
 */
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End'
} as const;

/**
 * Check if a keyboard event should trigger an action
 */
export const isActionKey = (event: React.KeyboardEvent): boolean => {
  return event.key === KEYBOARD_KEYS.ENTER || event.key === KEYBOARD_KEYS.SPACE;
};

/**
 * Check if event is an arrow navigation key
 */
export const isNavigationKey = (event: React.KeyboardEvent): boolean => {
  return [
    KEYBOARD_KEYS.ARROW_UP,
    KEYBOARD_KEYS.ARROW_DOWN,
    KEYBOARD_KEYS.ARROW_LEFT,
    KEYBOARD_KEYS.ARROW_RIGHT,
    KEYBOARD_KEYS.HOME,
    KEYBOARD_KEYS.END
  ].includes(event.key);
};

/**
 * Handle escape key to close modals
 */
export const handleEscapeKey = (event: React.KeyboardEvent, onClose: () => void): void => {
  if (event.key === KEYBOARD_KEYS.ESCAPE) {
    event.preventDefault();
    onClose();
  }
};

/**
 * Create accessible button props
 */
export const createButtonProps = (
  label: string,
  onClick: () => void,
  disabled = false
) => ({
  'aria-label': label,
  role: 'button',
  tabIndex: disabled ? -1 : 0,
  onClick: disabled ? undefined : onClick,
  onKeyDown: (event: React.KeyboardEvent) => {
    if (isActionKey(event)) {
      event.preventDefault();
      if (!disabled) onClick();
    }
  }
});

/**
 * Create accessible list props for navigable lists
 */
export const createListProps = (label: string) => ({
  role: 'list',
  'aria-label': label
});

/**
 * Create accessible list item props
 */
export const createListItemProps = (index: number, total: number) => ({
  role: 'listitem',
  'aria-setsize': total,
  'aria-posinset': index + 1
});

/**
 * Focus management utilities
 */
export const focusUtils = {
  /**
   * Focus the first focusable element within a container
   */
  focusFirst: (container: HTMLElement | null): void => {
    if (!container) return;
    
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    if (firstElement) {
      firstElement.focus();
    }
  },

  /**
   * Focus the last focusable element within a container
   */
  focusLast: (container: HTMLElement | null): void => {
    if (!container) return;
    
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    if (lastElement) {
      lastElement.focus();
    }
  },

  /**
   * Trap focus within a modal or dialog
   */
  trapFocus: (event: React.KeyboardEvent, container: HTMLElement | null): void => {
    if (!container || event.key !== KEYBOARD_KEYS.TAB) return;

    const focusableElements = Array.from(
      container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab: moving backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: moving forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }
};

/**
 * Screen reader announcement utilities
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  
  document.body.appendChild(announcement);
  announcement.textContent = message;
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Color contrast utilities for WCAG compliance
 */
export const colorContrast = {
  /**
   * Calculate relative luminance of a color
   */
  getLuminance: (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;

    const toLinear = (c: number) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  },

  /**
   * Calculate contrast ratio between two colors
   */
  getContrastRatio: (hex1: string, hex2: string): number => {
    const lum1 = colorContrast.getLuminance(hex1);
    const lum2 = colorContrast.getLuminance(hex2);
    const lightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (lightest + 0.05) / (darkest + 0.05);
  },

  /**
   * Check if color combination meets WCAG AA standard (4.5:1)
   */
  meetsWCAGAA: (foreground: string, background: string): boolean => {
    return colorContrast.getContrastRatio(foreground, background) >= 4.5;
  },

  /**
   * Check if color combination meets WCAG AAA standard (7:1)
   */
  meetsWCAGAAA: (foreground: string, background: string): boolean => {
    return colorContrast.getContrastRatio(foreground, background) >= 7;
  }
};