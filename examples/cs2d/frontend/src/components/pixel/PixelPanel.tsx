import React from 'react';

interface PixelPanelProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  variant?: 'default' | 'dark' | 'bright';
  glow?: boolean;
}

export const PixelPanel: React.FC<PixelPanelProps> = ({
  children,
  title,
  className = '',
  variant = 'default',
  glow = false
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'dark':
        return 'bg-gradient-to-br from-gray-800 to-black';
      case 'bright':
        return 'bg-gradient-to-br from-gray-400 to-gray-600';
      default:
        return 'bg-gradient-to-br from-gray-600 to-gray-800';
    }
  };

  return (
    <div 
      className={`
        p-4 border-3 border-solid border-gray-400 border-b-gray-900 border-r-gray-900 relative
        ${getVariantClasses()}
        ${glow ? 'shadow-lg shadow-green-500/25' : ''}
        ${className}
      `}
      style={{
        imageRendering: 'pixelated',
        borderWidth: '3px',
        borderStyle: 'solid'
      }}
    >
      {title && (
        <div 
          className="font-pixel text-white text-base mb-4 pb-2 border-b-2 border-gray-700"
          style={{
            textShadow: '2px 2px 0px #000',
            letterSpacing: '2px'
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
};