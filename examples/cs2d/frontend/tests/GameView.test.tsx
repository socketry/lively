import { render, screen } from './test-utils';
import GameView from '@/views/GameView';

describe('GameView Tailwind Styling', () => {
  it('renders with proper Tailwind classes', () => {
    const { container } = render(<GameView />);
    
    // Check for main container with Tailwind classes
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass('min-h-screen');
    expect(mainContainer).toHaveClass('bg-gradient-to-br');
    expect(mainContainer).toHaveClass('from-gray-900');
    
    // Verify no CSS modules are used
    expect(mainContainer.className).not.toContain('module');
    expect(mainContainer.className).not.toContain('game-view');
  });
  
  it('applies responsive classes correctly', () => {
    const { container } = render(<GameView />);
    
    // Check for responsive classes
    const responsiveElement = container.querySelector('[class*="md:"]');
    expect(responsiveElement).toBeInTheDocument();
    
    // Check for grid responsive classes
    const gridElement = container.querySelector('[class*="lg:col-span-3"]');
    expect(gridElement).toBeInTheDocument();
  });
  
  it('handles Tailwind utility classes', () => {
    const { container } = render(<GameView />);
    
    // Check for button with proper Tailwind styles
    const button = screen.getByRole('button', { name: /back to lobby/i });
    expect(button).toHaveClass('bg-blue-600');
    expect(button).toHaveClass('hover:bg-blue-700');
    expect(button).toHaveClass('transition-all');
    
    // Check for canvas with Tailwind styles
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveClass('w-full');
    expect(canvas).toHaveClass('h-full');
  });
  
  it('applies proper semantic Tailwind classes', () => {
    const { container } = render(<GameView />);
    
    // Check header styling
    const header = container.querySelector('header');
    expect(header).toHaveClass('flex');
    expect(header).toHaveClass('items-center');
    expect(header).toHaveClass('justify-between');
    
    // Check for proper spacing and layout classes
    const gameContainer = container.querySelector('[class*="container"]');
    expect(gameContainer).toHaveClass('mx-auto');
    expect(gameContainer).toHaveClass('h-screen');
  });
});