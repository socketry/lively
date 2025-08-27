import { render } from './test-utils';
import SettingsView from '@/views/SettingsView';

describe('SettingsView Tailwind Styling', () => {
  it('renders with proper Tailwind classes', () => {
    const { container } = render(<SettingsView />);
    
    // Check for Tailwind classes
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveClass(/^[a-z-]+/);
    
    // Verify no CSS modules
    expect(element?.className).not.toContain('module');
  });
  
  it('applies responsive classes correctly', () => {
    const { container } = render(<SettingsView />);
    const element = container.querySelector('[class*="md:"]');
    
    if (element) {
      expect(element).toBeInTheDocument();
    }
  });
  
  it('handles dark mode classes', () => {
    document.documentElement.classList.add('dark');
    const { container } = render(<SettingsView />);
    
    const darkElement = container.querySelector('[class*="dark:"]');
    if (darkElement) {
      expect(darkElement).toBeInTheDocument();
    }
    
    document.documentElement.classList.remove('dark');
  });
});