import React from 'react';
import { useResponsive } from '@/hooks/useResponsive';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  breakpoint?: 'mobile' | 'tablet' | 'desktop' | 'large';
  fallback?: React.ReactNode;
}

export const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({ 
  children, 
  breakpoint = 'mobile',
  fallback = null 
}) => {
  const { isMobile, isTablet, isDesktop, isLarge } = useResponsive();

  const shouldShow = () => {
    switch (breakpoint) {
      case 'mobile':
        return isMobile;
      case 'tablet':
        return isTablet;
      case 'desktop':
        return isDesktop;
      case 'large':
        return isLarge;
      default:
        return true;
    }
  };

  if (shouldShow()) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export const MobileOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => (
  <ResponsiveWrapper breakpoint="mobile" fallback={fallback}>
    {children}
  </ResponsiveWrapper>
);

export const DesktopOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => (
  <ResponsiveWrapper breakpoint="desktop" fallback={fallback}>
    {children}
  </ResponsiveWrapper>
);

export const TabletAndUp: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => {
  const { isMobile } = useResponsive();
  return isMobile ? <>{fallback}</> : <>{children}</>;
};