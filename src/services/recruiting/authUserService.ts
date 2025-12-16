// src/services/recruiting/authUserService.ts

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Use anon key - service role key is not available client-side
// This service will create Edge Function calls instead
const supabaseClient = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface CreateAuthUserParams {
  email: string;
  fullName: string;
  roles: string[];
  isAdmin?: boolean;
  skipPipeline?: boolean;
}

export interface CreateAuthUserResult {
  user: {
    id: string;
    email: string;
    [key: string]: any;
  };
  emailSent: boolean;
  message: string;
}

/**
 * Creates an auth user with corresponding user profile
 * This ensures both auth.users and user_profiles entries are created
 * Returns the user info and whether the password reset email was sent
 */
export async function createAuthUserWithProfile({
  email,
  fullName,
  roles,
  isAdmin = false,
  skipPipeline = false
}: CreateAuthUserParams): Promise<CreateAuthUserResult> {
  try {
    // Call Edge Function to create user with proper password reset email
    const { data, error } = await supabaseClient.functions.invoke('create-auth-user', {
      body: {
        email,
        fullName,
        roles,
        isAdmin,
        skipPipeline
      }
    });

    if (error) {
      console.error('Auth user creation error:', error);
      throw new Error(`Failed to create auth user: ${error.message || error}`);
    }

    if (!data?.user) {
      throw new Error('No user returned from auth creation');
    }

    return {
      user: data.user,
      emailSent: data.emailSent ?? false,
      message: data.message ?? 'User created'
    };
  } catch (error) {
    console.error('Create auth user with profile error:', error);
    throw error;
  }
}

/**
 * Checks if a user with the given email already exists
 */
export async function checkUserExists(email: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('user_profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking user existence:', error);
    return false;
  }

  return !!data;
}