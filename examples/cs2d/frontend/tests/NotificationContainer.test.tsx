import { render } from './test-utils';
import NotificationContainer from '@/components/common/NotificationContainer';
import { useApp } from '@/contexts/AppContext';
import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock the useApp hook while still using real context providers in test-utils
vi.mock('@/contexts/AppContext', async () => {
  const actual = await vi.importActual('@/contexts/AppContext');
  return {
    ...actual,
    useApp: vi.fn()
  };
});

const mockUseApp = vi.mocked(useApp);

describe('NotificationContainer Tailwind Styling', () => {
  beforeEach(() => {
    mockUseApp.mockReset();
  });

  it('handles empty state correctly (returns null when no notifications)', () => {
    // Mock empty notifications state
    mockUseApp.mockReturnValue({
      state: {
        notifications: []
      },
      actions: {
        removeNotification: vi.fn()
      }
    } as any);

    const { container } = render(<NotificationContainer />);
    
    // When there are no notifications, component should return null
    expect(container.firstChild).toBeNull();
    
    // Verify no notification-container element exists
    const notificationContainer = container.querySelector('.notification-container');
    expect(notificationContainer).toBeNull();
  });

  it('renders with proper Tailwind classes when notifications exist', () => {
    // Mock the useApp hook to return notifications
    mockUseApp.mockReturnValue({
      state: {
        notifications: [
          {
            id: '1',
            type: 'info' as const,
            title: 'Test Notification',
            message: 'Test message'
          }
        ]
      },
      actions: {
        removeNotification: vi.fn()
      }
    } as any);

    const { container } = render(<NotificationContainer />);
    
    // Check for Tailwind classes when notifications exist
    const element = container.firstChild as HTMLElement;
    expect(element).toBeTruthy();
    expect(element).toHaveClass('notification-container');
    
    // Verify no CSS modules
    expect(element.className).not.toContain('module');
  });
  
  it('applies notification item classes correctly', () => {
    // Mock the useApp hook to return notifications  
    mockUseApp.mockReturnValue({
      state: {
        notifications: [
          {
            id: '1',
            type: 'info' as const,
            title: 'Test Notification',
            message: 'Test message'
          }
        ]
      },
      actions: {
        removeNotification: vi.fn()
      }
    } as any);

    const { container } = render(<NotificationContainer />);
    
    // Check for notification item classes
    const notificationItem = container.querySelector('.notification');
    expect(notificationItem).toBeInTheDocument();
    expect(notificationItem).toHaveClass('notification', 'info');
    
    // Check for notification content and close button
    const notificationContent = container.querySelector('.notification-content');
    const notificationClose = container.querySelector('.notification-close');
    expect(notificationContent).toBeInTheDocument();
    expect(notificationClose).toBeInTheDocument();
  });
});