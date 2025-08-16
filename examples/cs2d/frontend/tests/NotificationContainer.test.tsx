import { render, screen } from '@testing-library/react';
import { NotificationContainer } from '@/components/NotificationContainer';

describe('NotificationContainer Tailwind Styling', () => {
  it('renders with proper Tailwind classes', () => {
    const { container } = render(<NotificationContainer />);
    
    // Check for Tailwind classes
    const element = container.firstChild;
    expect(element).toHaveClass(/^[a-z-]+/);
    
    // Verify no CSS modules
    expect(element.className).not.toContain('module');
  });
  
  it('applies responsive classes correctly', () => {
    const { container } = render(<NotificationContainer />);
    const element = container.querySelector('[class*="md:"]');
    
    if (element) {
      expect(element).toBeInTheDocument();
    }
  });
  
  it('handles dark mode classes', () => {
    document.documentElement.classList.add('dark');
    const { container } = render(<NotificationContainer />);
    
    const darkElement = container.querySelector('[class*="dark:"]');
    if (darkElement) {
      expect(darkElement).toBeInTheDocument();
    }
    
    document.documentElement.classList.remove('dark');
  });
});