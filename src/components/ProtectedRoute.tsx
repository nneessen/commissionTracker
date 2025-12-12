// /home/nneessen/projects/commissionTracker/src/components/ProtectedRoute.tsx

import React from 'react';
import {Navigate} from '@tanstack/react-router';
import {useAuth} from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Render protected content
  return <>{children}</>;
};

export default ProtectedRoute;