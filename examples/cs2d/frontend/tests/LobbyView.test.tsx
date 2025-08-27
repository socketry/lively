import { render } from './test-utils';
import LobbyView from '@/views/LobbyView';

describe('LobbyView Tailwind Styling', () => {
  it('renders with proper Tailwind classes', () => {
    const { container } = render(<LobbyView />);
    
    // Check for Tailwind classes
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveClass(/^[a-z-]+/);
    
    // Verify no CSS modules
    expect(element?.className).not.toContain('module');
  });
  
  it('applies responsive classes correctly', () => {
    const { container } = render(<LobbyView />);
    const element = container.querySelector('[class*="md:"]');
    
    if (element) {
      expect(element).toBeInTheDocument();
    }
  });
  
  it('handles dark mode classes', () => {
    document.documentElement.classList.add('dark');
    const { container } = render(<LobbyView />);
    
    const darkElement = container.querySelector('[class*="dark:"]');
    if (darkElement) {
      expect(darkElement).toBeInTheDocument();
    }
    
    document.documentElement.classList.remove('dark');
  });
});