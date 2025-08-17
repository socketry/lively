import React from 'react';

interface PixelButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  testId?: string;
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  testId
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-gradient-to-br from-gray-500 to-gray-700 hover:from-gray-400 hover:to-gray-600 active:from-gray-600 active:to-gray-700';
      case 'success':
        return 'bg-gradient-to-br from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 active:from-green-600 active:to-green-700';
      case 'danger':
        return 'bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 active:from-red-600 active:to-red-700';
      case 'warning':
        return 'bg-gradient-to-br from-yellow-500 to-yellow-700 hover:from-yellow-400 hover:to-yellow-600 active:from-yellow-600 active:to-yellow-700';
      default:
        return 'bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 active:from-blue-600 active:to-blue-700';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs min-h-6';
      case 'lg':
        return 'px-6 py-3 text-base min-h-12';
      default:
        return 'px-4 py-2 text-sm min-h-8';
    }
  };

  return (
    <button
      className={`
        font-pixel text-white cursor-pointer transition-none
        border-3 border-solid border-gray-300 border-b-gray-800 border-r-gray-800
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      style={{
        imageRendering: 'pixelated',
        textShadow: '1px 1px 0px #000',
        borderWidth: '3px',
        borderStyle: 'solid'
      }}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
    >
      {children}
    </button>
  );
};