import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle Pending Users
  if (user?.role === UserRole.PENDING_ASSIGNMENT) {
    // If we are not already on the pending page, redirect there
    if (location.pathname !== '/pending') {
      return <Navigate to="/pending" replace />;
    }
    // If we are on the pending page, show content (which will be the Pending page content passed as children)
    return <>{children}</>;
  }

  // If user is ACTIVE but tries to go to /pending, redirect to dashboard
  if (location.pathname === '/pending') {
    return <Navigate to="/" replace />;
  }

  // Check for specific Role requirements
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Determine where to redirect unauthorized users (could be a 403 page, here just home)
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};