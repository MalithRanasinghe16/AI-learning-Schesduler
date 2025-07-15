import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'border-cyan-400',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 ${color} ${sizeClasses[size]} ${className}`} />
  );
};

interface LoadingStateProps {
  message?: string;
  fullscreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...', 
  fullscreen = true 
}) => {
  const containerClass = fullscreen 
    ? 'flex items-center justify-center h-screen bg-gradient-to-b from-gray-900 to-indigo-900'
    : 'flex items-center justify-center h-64';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-white text-lg">{message}</p>
      </div>
    </div>
  );
};

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  fullscreen?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  message, 
  onRetry, 
  fullscreen = true 
}) => {
  const containerClass = fullscreen 
    ? 'flex items-center justify-center h-screen bg-gradient-to-b from-gray-900 to-indigo-900'
    : 'flex items-center justify-center h-64';

  return (
    <div className={containerClass}>
      <div className="bg-red-900 bg-opacity-50 border border-red-700 text-red-200 px-6 py-4 rounded-lg max-w-md text-center">
        <h3 className="text-lg font-semibold mb-2">Error</h3>
        <p className="mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
