// /home/nneessen/projects/commissionTracker/src/services/settings/userService.ts
import { logger } from '../base/logger';

import { supabase } from '../base/supabase';
import { User, UpdateUserData } from '../../types';

export class UserService {
  /**
   * Get the current authenticated user with metadata
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Map Supabase user to our User type
    return this.mapSupabaseUserToUser(user);
  }

  /**
   * Get a user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      logger.error('Error fetching user', error instanceof Error ? error : String(error), 'Migration');
      return null;
    }

    return this.mapDatabaseUserToUser(data);
  }

  /**
   * Get all users (for admin views)
   */
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name');

    if (error) {
      logger.error('Error fetching users', error instanceof Error ? error : String(error), 'Migration');
      return [];
    }

    return (data || []).map(user => this.mapDatabaseUserToUser(user));
  }

  /**
   * Update user metadata
   */
  async updateUser(userId: string, updates: UpdateUserData): Promise<User | null> {
    // Build metadata object
    const metadata: any = {};

    if (updates.name !== undefined) metadata.full_name = updates.name;
    if (updates.phone !== undefined) metadata.phone = updates.phone;
    if (updates.contractCompLevel !== undefined) metadata.contract_comp_level = updates.contractCompLevel;
    if (updates.isActive !== undefined) metadata.is_active = updates.isActive;
    if (updates.licenseNumber !== undefined) metadata.license_number = updates.licenseNumber;
    if (updates.licenseStates !== undefined) metadata.license_states = updates.licenseStates;

    // Update user metadata using the function
    const { error } = await supabase.rpc('update_user_metadata', {
      user_id: userId,
      metadata: metadata
    });

    if (error) {
      logger.error('Error updating user', error instanceof Error ? error : String(error), 'Migration');
      throw error;
    }

    // Fetch and return updated user
    return this.getUserById(userId);
  }

  /**
   * Update current user's profile
   */
  async updateCurrentUserProfile(updates: Partial<UpdateUserData>): Promise<User | null> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    return this.updateUser(currentUser.id, { ...updates, id: currentUser.id });
  }

  /**
   * Get user's contract compensation level
   */
  async getUserContractLevel(userId: string): Promise<number> {
    // ✅ OPTIMIZED: Only fetch the field we need (not entire user object)
    const { data, error } = await supabase
      .from('users')
      .select('contract_comp_level')
      .eq('id', userId)
      .single();

    if (error || !data) {
      logger.error('Error fetching contract level', error instanceof Error ? error : String(error), 'UserService');
      return 100; // Default to 100 if not set
    }

    return data.contract_comp_level || 100;
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  /**
   * Map Supabase auth user to our User type (public for AuthContext)
   * This allows AuthContext to map users without a database query
   */
  public mapAuthUserToUser(supabaseUser: any): User {
    return this.mapSupabaseUserToUser(supabaseUser);
  }

  /**
   * Map Supabase auth user to our User type
   */
  private mapSupabaseUserToUser(supabaseUser: any): User {
    const metadata = supabaseUser.user_metadata || {};

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: metadata.full_name || supabaseUser.email?.split('@')[0] || 'User',
      phone: metadata.phone,
      contractCompLevel: metadata.contract_comp_level || 100,
      isActive: metadata.is_active !== false,
      agentCode: metadata.agent_code,
      licenseNumber: metadata.license_number,
      licenseState: metadata.license_state,
      licenseStates: metadata.license_states,
      notes: metadata.notes,
      hireDate: metadata.hire_date ? new Date(metadata.hire_date) : undefined,
      ytdCommission: metadata.ytd_commission,
      ytdPremium: metadata.ytd_premium,
      createdAt: new Date(supabaseUser.created_at),
      updatedAt: supabaseUser.updated_at ? new Date(supabaseUser.updated_at) : undefined,
    };
  }

  /**
   * Map database user view to our User type
   */
  private mapDatabaseUserToUser(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email || '',
      name: dbUser.name || dbUser.email?.split('@')[0] || 'User',
      phone: dbUser.phone,
      contractCompLevel: dbUser.contract_comp_level || 100,
      isActive: dbUser.is_active !== false,
      agentCode: dbUser.agent_code,
      licenseNumber: dbUser.license_number,
      licenseState: dbUser.license_state,
      licenseStates: dbUser.license_states ? dbUser.license_states.split(',') : undefined,
      notes: dbUser.notes,
      createdAt: dbUser.created_at ? new Date(dbUser.created_at) : undefined,
      updatedAt: dbUser.updated_at ? new Date(dbUser.updated_at) : undefined,
    };
  }
}

// Export singleton instance
export const userService = new UserService();

// Export for backward compatibility
export const agentService = userService;