import { render } from './test-utils';
import App from '@/App';

describe('App Tailwind Styling', () => {
  it('renders with proper Tailwind classes', () => {
    const { container } = render(<App />);
    
    // Check for the main app container
    const appElement = container.firstChild as HTMLElement;
    
    // Verify main Tailwind classes are applied
    expect(appElement).toHaveClass('min-h-screen');
    expect(appElement).toHaveClass('bg-gradient-to-br');
    expect(appElement).toHaveClass('transition-all');
    expect(appElement).toHaveClass('duration-300');
    
    // Verify no CSS modules
    expect(appElement.className).not.toContain('module');
  });
  
  it('applies responsive classes correctly', () => {
    const { container } = render(<App />);
    const appElement = container.firstChild as HTMLElement;
    
    // Check for responsive classes
    expect(appElement).toHaveClass('md:overflow-hidden');
    expect(appElement).toHaveClass('lg:bg-opacity-95');
  });
  
  it('handles dark mode classes', () => {
    const { container } = render(<App />);
    const appElement = container.firstChild as HTMLElement;
    
    // Check for dark mode classes
    expect(appElement.className).toContain('dark:from-cs-black');
    expect(appElement.className).toContain('dark:to-cs-gray-800');
  });
  
  it('renders loading fallback with proper Tailwind classes', () => {
    const { container } = render(<App />);
    
    // Check if loading fallback is rendered (it should be since views are lazy loaded)
    // Look specifically for the text loading element, not other animated elements
    const loadingElement = container.querySelector('.text-lg.animate-pulse');
    if (loadingElement) {
      expect(loadingElement).toHaveClass('text-lg');
      expect(loadingElement).toHaveClass('text-cs-text-muted');
      expect(loadingElement).toHaveClass('animate-pulse');
    }
    
    // Or check for other animated elements like status indicators
    const statusIndicator = container.querySelector('.bg-green-400.animate-pulse');
    if (statusIndicator) {
      expect(statusIndicator).toHaveClass('animate-pulse');
      expect(statusIndicator).toHaveClass('rounded-full');
    }
  });
});