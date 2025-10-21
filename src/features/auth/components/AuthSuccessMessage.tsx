// src/features/auth/components/AuthSuccessMessage.tsx

import React from 'react';

interface AuthSuccessMessageProps {
  message: string;
}

export const AuthSuccessMessage: React.FC<AuthSuccessMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="rounded-xl bg-green-50 border border-green-200 p-4 animate-fadeIn">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p className="ml-3 text-sm font-medium text-green-800">
          {message}
        </p>
      </div>
    </div>
  );
};
