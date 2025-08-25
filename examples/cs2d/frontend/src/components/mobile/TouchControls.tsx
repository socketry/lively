import React from 'react';
import { useIsTouchDevice } from '@/hooks/useResponsive';

interface TouchButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  ariaLabel?: string;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  size = 'medium',
  disabled = false,
  ariaLabel,
}) => {
  const isTouch = useIsTouchDevice();

  const variants = {
    primary: 'bg-gradient-to-r from-orange-500 to-pink-600 text-white',
    secondary: 'backdrop-blur-md bg-white/10 border border-white/20 text-white',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white',
    success: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
  };

  const sizes = {
    small: isTouch ? 'py-2 px-3 text-sm min-h-[40px]' : 'py-1 px-2 text-xs',
    medium: isTouch ? 'py-3 px-4 text-base min-h-[48px]' : 'py-2 px-3 text-sm',
    large: isTouch ? 'py-4 px-6 text-lg min-h-[56px]' : 'py-3 px-4 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-lg font-semibold transition-all duration-200
        hover:shadow-lg active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${isTouch ? 'select-none touch-manipulation' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

interface TouchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: 'text' | 'password' | 'number';
  onKeyPress?: (e: React.KeyboardEvent) => void;
}

export const TouchInput: React.FC<TouchInputProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  type = 'text',
  onKeyPress,
}) => {
  const isTouch = useIsTouchDevice();

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyPress={onKeyPress}
      placeholder={placeholder}
      className={`
        backdrop-blur-md bg-white/10 border border-white/20 rounded-lg 
        text-white placeholder-white/50 
        focus:outline-none focus:border-white/40
        ${isTouch ? 'py-3 px-4 text-base' : 'py-2 px-3 text-sm'}
        ${className}
      `}
    />
  );
};

interface TouchSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export const TouchSelect: React.FC<TouchSelectProps> = ({
  value,
  onChange,
  options,
  className = '',
}) => {
  const isTouch = useIsTouchDevice();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`
        backdrop-blur-md bg-white/10 border border-white/20 rounded-lg 
        text-white focus:outline-none focus:border-white/40
        ${isTouch ? 'py-3 px-4 text-base' : 'py-2 px-3 text-sm'}
        ${className}
      `}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-slate-800 text-white">
          {option.label}
        </option>
      ))}
    </select>
  );
};

interface TouchCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}

export const TouchCheckbox: React.FC<TouchCheckboxProps> = ({
  checked,
  onChange,
  label,
  className = '',
}) => {
  const isTouch = useIsTouchDevice();

  return (
    <label className={`flex items-center space-x-3 text-white cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`rounded ${isTouch ? 'w-5 h-5' : 'w-4 h-4'}`}
      />
      <span className={isTouch ? 'text-base' : 'text-sm'}>{label}</span>
    </label>
  );
};

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  className = '',
}) => {
  const [startX, setStartX] = React.useState<number | null>(null);
  const [currentX, setCurrentX] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startX) return;
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!startX || !currentX) return;

    const diff = startX - currentX;
    const threshold = 100;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (diff < 0 && onSwipeRight) {
        onSwipeRight();
      }
    }

    setStartX(null);
    setCurrentX(null);
    setIsDragging(false);
  };

  const translateX = isDragging && startX && currentX ? currentX - startX : 0;

  return (
    <div
      className={`touch-pan-y ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${translateX}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {children}
    </div>
  );
};