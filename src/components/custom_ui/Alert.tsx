// src/components/custom_ui/Alert.tsx

import React from 'react';

type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertProps {
  type: AlertType;
  message: string;
  className?: string;
}

/**
 * Reusable Alert component for displaying messages
 */
export const Alert: React.FC<AlertProps> = ({ type, message, className = '' }) => {
  const styles = {
    success: {
      container: 'bg-green-50 border-green-200',
      icon: 'text-green-600',
      text: 'text-green-800',
      liveType: 'polite' as const,
    },
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-600',
      text: 'text-red-800',
      liveType: 'assertive' as const,
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-600',
      text: 'text-blue-800',
      liveType: 'polite' as const,
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-600',
      text: 'text-yellow-800',
      liveType: 'polite' as const,
    },
  };

  const style = styles[type];

  const renderIcon = () => {
    if (type === 'success') {
      return (
        <svg className={`h-5 w-5 ${style.icon}`} fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    if (type === 'error') {
      return (
        <svg className={`h-5 w-5 ${style.icon}`} fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    // Default info/warning icon
    return (
      <svg className={`h-5 w-5 ${style.icon}`} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  return (
    <div
      className={`rounded-xl border p-4 animate-fadeIn ${style.container} ${className}`}
      role="alert"
      aria-live={style.liveType}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{renderIcon()}</div>
        <p className={`ml-3 text-sm font-medium ${style.text}`}>{message}</p>
      </div>
    </div>
  );
};
