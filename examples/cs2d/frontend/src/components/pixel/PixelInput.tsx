import React from 'react';

interface PixelInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'number';
  disabled?: boolean;
  className?: string;
  testId?: string;
  maxLength?: number;
  id?: string;
  ariaLabel?: string;
}

export const PixelInput: React.FC<PixelInputProps> = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  className = '',
  testId,
  maxLength,
  id,
  ariaLabel
}) => {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      disabled={disabled}
      maxLength={maxLength}
      className={`
        font-pixel w-full bg-black text-green-400 p-2 outline-none
        border-3 border-solid border-gray-800 border-b-gray-400 border-r-gray-400
        placeholder-gray-600
        focus:border-green-500 focus:shadow-lg focus:shadow-green-500/25
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      style={{
        imageRendering: 'pixelated',
        borderWidth: '3px',
        borderStyle: 'solid',
        caretColor: '#00ff00'
      }}
      data-testid={testId}
    />
  );
};
