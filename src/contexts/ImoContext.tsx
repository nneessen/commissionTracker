// src/contexts/ImoContext.tsx
// Context for managing IMO and Agency state

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';
import { imoService } from '../services/imo';
import { agencyService } from '../services/agency';
import { supabase } from '../services/base/supabase';
import { logger } from '../services/base/logger';
import type { Imo, Agency, ImoContextType } from '../types/imo.types';
import { hasImoAdminRole, hasImoOwnerRole } from '../types/imo.types';

// User role info from database
interface UserRoleInfo {
  roles: string[];
  is_super_admin: boolean | null;
}

// Create the context
const ImoContext = createContext<ImoContextType | undefined>(undefined);

/**
 * Hook to access IMO context
 * Must be used within an ImoProvider
 */
export const useImo = (): ImoContextType => {
  const context = useContext(ImoContext);
  if (!context) {
    throw new Error('useImo must be used within an ImoProvider');
  }
  return context;
};

interface ImoProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for IMO context
 * Loads IMO and Agency data for the current user
 */
export const ImoProvider: React.FC<ImoProviderProps> = ({ children }) => {
  const { user } = useAuth();

  // Use ref to track current user for race condition prevention
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // State
  const [imo, setImo] = useState<Imo | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [userRoles, setUserRoles] = useState<UserRoleInfo>({ roles: [], is_super_admin: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch IMO and Agency data
  const fetchImoData = useCallback(async () => {
    if (!user) {
      setImo(null);
      setAgency(null);
      setUserRoles({ roles: [], is_super_admin: false });
      setLoading(false);
      setError(null);
      return;
    }

    // Capture user ID to detect stale responses
    const currentUserId = user.id;

    try {
      setLoading(true);
      setError(null);

      // Fetch IMO, Agency, and user roles in parallel using allSettled
      // This ensures partial failures don't break the entire context
      const results = await Promise.allSettled([
        imoService.getMyImo(),
        agencyService.getMyAgency(),
        supabase
          .from('user_profiles')
          .select('roles, is_super_admin')
          .eq('id', user.id)
          .single()
          .then(({ data }) => data as UserRoleInfo | null),
      ]);

      // Guard against stale responses using ref (not closure)
      if (userRef.current?.id !== currentUserId) {
        return;
      }

      // Extract results, handling partial failures
      const imoData = results[0].status === 'fulfilled' ? results[0].value : null;
      const agencyData = results[1].status === 'fulfilled' ? results[1].value : null;
      const roleData = results[2].status === 'fulfilled' ? results[2].value : null;

      // Log any failures but don't throw
      if (results[0].status === 'rejected') {
        logger.warn('Failed to fetch IMO data', { error: results[0].reason }, 'ImoContext');
      }
      if (results[1].status === 'rejected') {
        logger.warn('Failed to fetch agency data', { error: results[1].reason }, 'ImoContext');
      }
      if (results[2].status === 'rejected') {
        logger.warn('Failed to fetch user roles', { error: results[2].reason }, 'ImoContext');
      }

      setImo(imoData);
      setAgency(agencyData);
      setUserRoles(roleData ?? { roles: [], is_super_admin: false });

      if (imoData) {
        logger.info(
          'IMO context loaded',
          { imoId: imoData.id, imoCode: imoData.code },
          'ImoContext'
        );
      }

      if (agencyData) {
        logger.info(
          'Agency context loaded',
          { agencyId: agencyData.id, agencyCode: agencyData.code },
          'ImoContext'
        );
      }
    } catch (err) {
      // Guard against stale error using ref
      if (userRef.current?.id !== currentUserId) {
        return;
      }
      const error = err instanceof Error ? err : new Error('Failed to fetch IMO data');
      logger.error('Failed to fetch IMO data', error, 'ImoContext');
      setError(error);
    } finally {
      // Only update loading if this is still the current user's request
      if (userRef.current?.id === currentUserId) {
        setLoading(false);
      }
    }
  }, [user]);

  // Fetch data when user changes
  useEffect(() => {
    fetchImoData();
  }, [fetchImoData]);

  // Derive role flags from fetched user roles (MEDIUM-1: using centralized role helpers)
  const roles = userRoles.roles ?? [];
  const isImoOwner = hasImoOwnerRole(roles);
  const isImoAdmin = hasImoAdminRole(roles);
  const isAgencyOwner = agency?.owner_id === user?.id;
  const isSuperAdmin = userRoles.is_super_admin === true;

  // Context value
  const value: ImoContextType = {
    imo,
    agency,
    isImoOwner,
    isImoAdmin,
    isAgencyOwner,
    isSuperAdmin,
    loading,
    error,
    refetch: fetchImoData,
  };

  return <ImoContext.Provider value={value}>{children}</ImoContext.Provider>;
};

/**
 * Higher-order component to inject IMO context
 */
export function withImo<P extends object>(
  Component: React.ComponentType<P & ImoContextType>
): React.FC<P> {
  return function WithImoComponent(props: P) {
    const imoContext = useImo();
    return <Component {...props} {...imoContext} />;
  };
}
