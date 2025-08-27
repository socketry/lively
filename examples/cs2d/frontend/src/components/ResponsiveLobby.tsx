import React from 'react';
import { useIsMobile } from '@/hooks/useResponsive';
import { EnhancedModernLobby } from './EnhancedModernLobby';
import { MobileLobby } from './mobile/MobileLobby';

export const ResponsiveLobby: React.FC = () => {
  const isMobile = useIsMobile();

  return isMobile ? (
    <MobileLobby />
  ) : (
    <EnhancedModernLobby />
  );
};