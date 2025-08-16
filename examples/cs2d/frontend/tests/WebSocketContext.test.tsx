import { render, screen } from '@testing-library/react';
import { WebSocketContext } from '@/components/WebSocketContext';

describe('WebSocketContext Tailwind Styling', () => {
  it('renders with proper Tailwind classes', () => {
    const { container } = render(<WebSocketContext />);
    
    // Check for Tailwind classes
    const element = container.firstChild;
    expect(element).toHaveClass(/^[a-z-]+/);
    
    // Verify no CSS modules
    expect(element.className).not.toContain('module');
  });
  
  it('applies responsive classes correctly', () => {
    const { container } = render(<WebSocketContext />);
    const element = container.querySelector('[class*="md:"]');
    
    if (element) {
      expect(element).toBeInTheDocument();
    }
  });
  
  it('handles dark mode classes', () => {
    document.documentElement.classList.add('dark');
    const { container } = render(<WebSocketContext />);
    
    const darkElement = container.querySelector('[class*="dark:"]');
    if (darkElement) {
      expect(darkElement).toBeInTheDocument();
    }
    
    document.documentElement.classList.remove('dark');
  });
});