import React from 'react';
import { useIsMobile } from '@/hooks/useResponsive';
import { EnhancedWaitingRoom } from './EnhancedWaitingRoom';
import { MobileWaitingRoom } from './mobile/MobileWaitingRoom';

interface ResponsiveWaitingRoomProps {
  roomId: string;
}

export const ResponsiveWaitingRoom: React.FC<ResponsiveWaitingRoomProps> = ({ roomId }) => {
  const isMobile = useIsMobile();

  return isMobile ? (
    <MobileWaitingRoom roomId={roomId} />
  ) : (
    <EnhancedWaitingRoom roomId={roomId} />
  );
};