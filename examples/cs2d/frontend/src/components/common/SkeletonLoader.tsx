import { cn } from '@/utils/tailwind';
import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  animate?: boolean;
  rounded?: boolean | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className,
  animate = true,
  rounded = false
}) => {
  const roundedClass = rounded === true ? 'rounded' :
    rounded === 'sm' ? 'rounded-sm' :
    rounded === 'md' ? 'rounded-md' :
    rounded === 'lg' ? 'rounded-lg' :
    rounded === 'xl' ? 'rounded-xl' :
    rounded === 'full' ? 'rounded-full' : '';

  return (
    <div
      className={cn(
        'bg-gradient-to-r from-white/10 via-white/20 to-white/10 bg-[length:200%_100%]',
        animate && 'animate-shimmer',
        roundedClass,
        className
      )}
      role="status"
      aria-label="Loading..."
    />
  );
};

// Specific skeleton components for common use cases
export const RoomCardSkeleton: React.FC = () => (
  <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <SkeletonLoader className="h-6 w-3/4 mb-2" rounded="md" />
        <div className="flex items-center space-x-2">
          <SkeletonLoader className="h-4 w-16" rounded="full" />
          <SkeletonLoader className="h-4 w-12" rounded="full" />
        </div>
      </div>
      <div className="text-right">
        <SkeletonLoader className="h-3 w-8 mb-1" rounded="sm" />
        <SkeletonLoader className="h-4 w-12" rounded="sm" />
      </div>
    </div>

    <div className="space-y-3 mb-4">
      <div className="flex justify-between items-center">
        <SkeletonLoader className="h-3 w-8" />
        <SkeletonLoader className="h-3 w-16" />
      </div>
      <div className="flex justify-between items-center">
        <SkeletonLoader className="h-3 w-8" />
        <SkeletonLoader className="h-3 w-20" />
      </div>
      <div className="flex justify-between items-center">
        <SkeletonLoader className="h-3 w-10" />
        <SkeletonLoader className="h-3 w-14" />
      </div>
    </div>

    <SkeletonLoader className="w-full h-3 mb-4" rounded="full" />
    <SkeletonLoader className="w-full h-8" rounded="lg" />
  </div>
);

export const PlayerCardSkeleton: React.FC = () => (
  <div className="flex items-center justify-between p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10 animate-pulse">
    <div className="flex items-center space-x-3">
      <SkeletonLoader className="w-8 h-8" rounded="full" />
      <div>
        <SkeletonLoader className="h-4 w-24 mb-1" rounded="sm" />
        <SkeletonLoader className="h-3 w-16" rounded="sm" />
      </div>
    </div>
    <SkeletonLoader className="h-4 w-12" rounded="sm" />
  </div>
);

export const TeamSectionSkeleton: React.FC = () => (
  <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <SkeletonLoader className="w-8 h-8" rounded="lg" />
        <SkeletonLoader className="h-6 w-32" rounded="md" />
      </div>
      <SkeletonLoader className="h-4 w-16" rounded="sm" />
    </div>
    
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <PlayerCardSkeleton key={i} />
      ))}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={`empty-${i}`} className="p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10 border-dashed animate-pulse">
          <SkeletonLoader className="h-4 w-20 mx-auto" rounded="sm" />
        </div>
      ))}
    </div>
  </div>
);

export const ChatSkeleton: React.FC = () => (
  <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6 animate-pulse">
    <div className="flex items-center space-x-2 mb-4">
      <SkeletonLoader className="w-6 h-6" rounded="full" />
      <SkeletonLoader className="h-5 w-16" rounded="md" />
    </div>
    
    <div className="h-64 mb-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-2 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <SkeletonLoader className="h-3 w-16" rounded="sm" />
            <SkeletonLoader className="h-3 w-12" rounded="sm" />
          </div>
          <SkeletonLoader className="h-3 w-full" rounded="sm" />
        </div>
      ))}
    </div>
    
    <div className="flex space-x-2">
      <SkeletonLoader className="flex-1 h-9" rounded="lg" />
      <SkeletonLoader className="w-16 h-9" rounded="lg" />
    </div>
  </div>
);

export const RoomSettingsSkeleton: React.FC = () => (
  <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6 animate-pulse">
    <div className="flex items-center space-x-2 mb-4">
      <SkeletonLoader className="w-6 h-6" rounded="full" />
      <SkeletonLoader className="h-5 w-24" rounded="md" />
    </div>
    
    <div className="space-y-3 text-sm">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex justify-between">
          <SkeletonLoader className="h-3 w-16" />
          <SkeletonLoader className="h-3 w-20" />
        </div>
      ))}
    </div>
  </div>
);

export const LobbySkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <RoomCardSkeleton key={i} />
    ))}
  </div>
);

export default SkeletonLoader;