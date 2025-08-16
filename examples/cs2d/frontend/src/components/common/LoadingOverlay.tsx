import { cn } from '@/utils/tailwind';
import React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';


interface LoadingOverlayProps {
  // TODO: Define props from Vue component
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = (props) => {
  const navigate = useNavigate();
  
  

interface Props {
  show?: boolean
  title?: string
  message?: string
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
  title: 'Loading...',
  message: ''
})

const show = useMemo(() => props.show, [])
const title = useMemo(() => props.title, [])
const message = useMemo(() => props.message, [])

  return (
    <div className="container mx-auto px-4">
      <div className="loading-overlay" className={{ active: show }}>
    <div className="loading-content">
      <div className="loading-spinner">
        <div className="spinner"></div>)}
      </div>
      <div className="loading-text">
        <h3>{title }</h3>)}
        <p {message && (>{message }</p>)}
      </div>
    </div>)}
  </div>
    </div>
  );
};

export default LoadingOverlay;