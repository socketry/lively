// Remove unused import
// import { cn } from '@/utils/tailwind';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFoundView: React.FC = () => {
  const navigate = useNavigate();

  const goHome = () => {
    navigate('/');
  };

  return (
    <div className="not-found-view">
      <div className="not-found-container">
        <h1 className="error-code">404</h1>
        <h2 className="error-message">Page Not Found</h2>
        <p className="error-description">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <button 
          onClick={goHome} 
          className="btn btn-primary hover:scale-105 active:scale-95 transition-transform"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default NotFoundView;