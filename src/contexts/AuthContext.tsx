// /home/nneessen/projects/commissionTracker/src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/base/supabase';
import { User as SupabaseUser, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { User } from '../types';
import { userService } from '../services/settings/userService';
import { logger } from '../services/base/logger';

/**
 * Result of sign up operation
 */
export interface SignUpResult {
  /** Whether email verification is required before login */
  requiresVerification: boolean;
  /** User's email address */
  email: string;
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  updateUserMetadata: (metadata: any) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check for existing session
    checkSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        logger.auth('state changed', { event, email: session?.user?.email });

        setSession(session);
        setSupabaseUser(session?.user ?? null);

        // Get full user data with metadata
        // ✅ OPTIMIZED: Map directly from session user (no database query!)
        if (session?.user) {
          const fullUser = userService.mapAuthUserToUser(session.user);
          setUser(fullUser);
        } else {
          setUser(null);
        }

        // Handle specific auth events
        switch (event) {
          case 'SIGNED_IN':
            logger.auth('User signed in');
            break;
          case 'SIGNED_OUT':
            logger.auth('User signed out');
            // Clear any local data if needed
            break;
          case 'TOKEN_REFRESHED':
            logger.auth('Token refreshed');
            break;
          case 'USER_UPDATED':
            logger.auth('User updated');
            break;
          case 'PASSWORD_RECOVERY':
            logger.auth('Password recovery initiated');
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);

      // Get the current session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) throw error;

      setSession(session);
      setSupabaseUser(session?.user ?? null);

      // Get full user data with metadata
      // ✅ OPTIMIZED: Map directly from session user (no database query!)
      if (session?.user) {
        const fullUser = userService.mapAuthUserToUser(session.user);
        setUser(fullUser);
      } else {
        setUser(null);
      }

      // If we have a session, set up auto-refresh
      if (session) {
        logger.auth('Existing session found', { email: session.user.email });
        // Refresh the session to ensure it's valid
        await refreshSession();
      }
    } catch (err) {
      logger.error('Error checking session', err instanceof Error ? err : String(err), 'Auth');
      setError(err instanceof Error ? err : new Error('Failed to check session'));
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();

      if (error) throw error;

      setSession(session);
      setSupabaseUser(session?.user ?? null);

      // Get full user data with metadata
      // ✅ OPTIMIZED: Map directly from session user (no database query!)
      if (session?.user) {
        const fullUser = userService.mapAuthUserToUser(session.user);
        setUser(fullUser);
      }

      logger.auth('Session refreshed');
    } catch (err) {
      logger.error('Error refreshing session', err instanceof Error ? err : String(err), 'Auth');
      // If refresh fails, user needs to sign in again
      await signOut();
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setSession(data.session);
      setSupabaseUser(data.user);

      // Get full user data with metadata
      // ✅ OPTIMIZED: Map directly from auth user (no database query!)
      if (data.user) {
        const fullUser = userService.mapAuthUserToUser(data.user);
        setUser(fullUser);
      }

      logger.auth('Sign in successful', { email: data.user?.email });
    } catch (err) {
      logger.error('Sign in error', err instanceof Error ? err : String(err), 'Auth');
      setError(err instanceof Error ? err : new Error('Failed to sign in'));
      // Re-throw the original error so Login.tsx can handle it with proper message
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string): Promise<SignUpResult> => {
    try {
      setError(null);
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: email.split('@')[0],
          }
        }
      });

      if (error) throw error;

      // Check if email confirmation is required
      const requiresVerification = data.user && !data.session;

      if (requiresVerification) {
        logger.auth('Email confirmation required', { email });
        // Don't throw error - this is expected behavior
        return { requiresVerification: true, email };
      }

      // Auto-confirm is enabled - set session immediately
      if (data.session && data.user) {
        setSession(data.session);
        setSupabaseUser(data.user);

        // Get full user data with metadata
        // ✅ OPTIMIZED: Map directly from auth user (no database query!)
        const fullUser = userService.mapAuthUserToUser(data.user);
        setUser(fullUser);

        logger.auth('Sign up successful (auto-confirmed)', { email: data.user.email });
      }

      return { requiresVerification: false, email };
    } catch (err) {
      logger.error('Sign up error', err instanceof Error ? err : String(err), 'Auth');
      setError(err instanceof Error ? err : new Error('Failed to sign up'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      setLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setSession(null);
      setSupabaseUser(null);
      setUser(null);

      logger.auth('Sign out successful');
    } catch (err) {
      logger.error('Sign out error', err instanceof Error ? err : String(err), 'Auth');
      setError(err instanceof Error ? err : new Error('Failed to sign out'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      logger.auth('Password reset email sent');
    } catch (err) {
      logger.error('Password reset error', err instanceof Error ? err : String(err), 'Auth');
      setError(err instanceof Error ? err : new Error('Failed to reset password'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      setError(null);
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      logger.auth('Password updated successfully');
    } catch (err) {
      logger.error('Password update error', err instanceof Error ? err : String(err), 'Auth');
      setError(err instanceof Error ? err : new Error('Failed to update password'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUserMetadata = async (metadata: any) => {
    try {
      if (!user) {
        throw new Error('No authenticated user');
      }

      setError(null);
      setLoading(true);

      const updatedUser = await userService.updateUser(user.id, metadata);
      if (updatedUser) {
        setUser(updatedUser);
      }

      logger.auth('User metadata updated successfully');
    } catch (err) {
      logger.error('Error updating user metadata', err instanceof Error ? err : String(err), 'Auth');
      setError(err instanceof Error ? err : new Error('Failed to update user metadata'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      setError(null);

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) throw error;

      logger.auth('Verification email resent', { email });
    } catch (err) {
      logger.error('Resend verification email error', err instanceof Error ? err : String(err), 'Auth');
      setError(err instanceof Error ? err : new Error('Failed to resend verification email'));
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    supabaseUser,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
    updateUserMetadata,
    resendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};