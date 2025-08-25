import React from 'react';

// Gaming Button Component
interface GamingButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
}

export const GamingButton: React.FC<GamingButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  onMouseEnter,
  disabled = false,
  loading = false,
  icon,
  fullWidth = false
}) => {
  const baseClasses = 'neon-button font-semibold rounded-lg transition-all duration-300 relative overflow-hidden gpu-accelerated flex items-center justify-center space-x-2';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-blue-500/25 hover:from-blue-500 hover:to-purple-500',
    secondary: 'glass-button text-white hover:bg-white/10',
    danger: 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:shadow-red-500/25 hover:from-red-500 hover:to-pink-500',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-green-500/25 hover:from-green-500 hover:to-emerald-500',
    warning: 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:shadow-yellow-500/25 hover:from-yellow-500 hover:to-orange-500'
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl'
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      disabled={disabled || loading}
      className={`
        ${baseClasses} 
        ${variantClasses[variant]} 
        ${sizeClasses[size]} 
        ${fullWidth ? 'w-full' : ''} 
        ${className}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:-translate-y-1'}
      `}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      <span className={loading ? 'opacity-0' : 'flex items-center space-x-2'}>
        {icon && <span>{icon}</span>}
        <span>{children}</span>
      </span>
    </button>
  );
};

// Gaming Card Component
interface GamingCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  scanLine?: boolean;
}

export const GamingCard: React.FC<GamingCardProps> = ({
  children,
  className = '',
  hover = true,
  glow = false,
  scanLine = false
}) => (
  <div className={`
    gaming-card p-6 gpu-accelerated
    ${hover ? 'hover:scale-105 hover:-translate-y-2' : ''}
    ${glow ? 'glow-effect' : ''}
    ${scanLine ? 'scan-line' : ''}
    ${className}
  `}>
    {children}
  </div>
);

// Status Indicator Component
interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'away' | 'busy';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showLabel?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  label,
  showLabel = false
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const statusClasses = {
    online: 'status-online',
    offline: 'status-offline',
    away: 'status-away',
    busy: 'bg-red-500 animate-pulse'
  };

  const statusLabels = {
    online: 'Online',
    offline: 'Offline',
    away: 'Away',
    busy: 'Busy'
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`${sizeClasses[size]} ${statusClasses[status]} rounded-full`} />
      {showLabel && (
        <span className="text-white/70 text-sm">
          {label || statusLabels[status]}
        </span>
      )}
    </div>
  );
};

// Progress Bar Component
interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  color?: string;
  height?: string;
  showPercentage?: boolean;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  color = 'var(--neon-blue)',
  height = '8px',
  showPercentage = false,
  animated = true
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm text-white/70 mb-2">
          {label && <span>{label}</span>}
          {showPercentage && <span>{percentage.toFixed(0)}%</span>}
        </div>
      )}
      <div 
        className="stat-bar bg-black/50 rounded-full overflow-hidden" 
        style={{ height }}
      >
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            animated ? 'skill-bar-fill' : ''
          }`}
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color}, var(--neon-purple))`,
            boxShadow: `0 0 10px ${color}`,
            '--target-width': `${percentage}%`
          } as any}
        />
      </div>
    </div>
  );
};

// Loading Skeleton Component
interface LoadingSkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = '20px',
  className = '',
  variant = 'rectangular',
  animation = 'wave'
}) => {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };

  const animationClasses = {
    pulse: 'skeleton-pulse',
    wave: 'skeleton'
  };

  return (
    <div
      className={`${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  );
};

// Notification Component
interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  icon?: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export const Notification: React.FC<NotificationProps> = ({
  type,
  title,
  message,
  icon,
  onClose,
  autoClose = true,
  duration = 4000
}) => {
  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose, duration]);

  const typeClasses = {
    success: 'border-green-500/50 bg-green-500/10 text-green-400',
    error: 'border-red-500/50 bg-red-500/10 text-red-400',
    warning: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
    info: 'border-blue-500/50 bg-blue-500/10 text-blue-400'
  };

  const defaultIcons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className={`
      notification-slide glass-panel border-l-4 p-4 
      ${typeClasses[type]} 
      max-w-sm
    `}>
      <div className="flex items-start space-x-3">
        <span className="text-lg">{icon || defaultIcons[type]}</span>
        <div className="flex-1">
          <h4 className="font-semibold">{title}</h4>
          {message && <p className="text-sm opacity-80 mt-1">{message}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 text-lg"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

// Input Component
interface GamingInputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  icon?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export const GamingInput: React.FC<GamingInputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
  icon,
  label,
  error,
  disabled = false
}) => (
  <div className="w-full">
    {label && (
      <label className="block text-white/80 mb-2 font-semibold">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">
          {icon}
        </span>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-full px-4 py-3 glass-button rounded-lg text-white placeholder-white/50 
          focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20
          ${icon ? 'pl-10' : ''}
          ${error ? 'border-red-500 focus:border-red-400' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      />
    </div>
    {error && (
      <p className="text-red-400 text-sm mt-1">{error}</p>
    )}
  </div>
);

// Select Component
interface GamingSelectProps {
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  label?: string;
  placeholder?: string;
}

export const GamingSelect: React.FC<GamingSelectProps> = ({
  options,
  value,
  onChange,
  className = '',
  label,
  placeholder
}) => (
  <div className="w-full">
    {label && (
      <label className="block text-white/80 mb-2 font-semibold">
        {label}
      </label>
    )}
    <select
      value={value}
      onChange={onChange}
      className={`
        w-full px-4 py-3 glass-button rounded-lg text-white 
        focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20
        ${className}
      `}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

// Badge Component
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = ''
}) => {
  const variantClasses = {
    primary: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    secondary: 'bg-white/10 text-white/80 border-white/20',
    success: 'bg-green-500/20 text-green-400 border-green-500/50',
    danger: 'bg-red-500/20 text-red-400 border-red-500/50',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span className={`
      inline-flex items-center border rounded-full font-medium
      ${variantClasses[variant]}
      ${sizeClasses[size]}
      ${className}
    `}>
      {children}
    </span>
  );
};

// Avatar Component
interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
  children?: React.ReactNode;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  status,
  className = '',
  children
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const statusSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
    xl: 'w-6 h-6'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full rounded-full object-cover border-2 border-white/20"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center border-2 border-white/20">
          {children || <span className="text-white font-bold">👤</span>}
        </div>
      )}
      
      {status && (
        <div className="absolute -bottom-1 -right-1">
          <StatusIndicator status={status} size={size === 'xl' ? 'lg' : 'sm'} />
        </div>
      )}
    </div>
  );
};