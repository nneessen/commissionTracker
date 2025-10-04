// /home/nneessen/projects/commissionTracker/src/services/clients/clientService.ts
import { supabase } from '../base/supabase';

export interface ClientData {
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  date_of_birth?: string;
  ssn_last_four?: string;
}

export interface Client extends ClientData {
  id: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

class ClientService {
  /**
   * Create or find a client by name for a specific user
   * If a client with the same name exists for this user, return it
   * Otherwise create a new client
   *
   * @param clientData - Client information
   * @param userId - User ID from auth.users (required for RLS policy compliance)
   */
  async createOrFind(clientData: ClientData, userId: string): Promise<Client> {
    if (!userId) {
      throw new Error('User ID is required to create or find client');
    }

    // First, try to find existing client by name AND user_id
    const { data: existingClients, error: searchError } = await supabase
      .from('clients')
      .select('*')
      .eq('name', clientData.name)
      .eq('user_id', userId)
      .limit(1);

    if (searchError) {
      throw new Error(`Failed to search for client: ${searchError.message}`);
    }

    if (existingClients && existingClients.length > 0) {
      return existingClients[0];
    }

    // Client doesn't exist, create new one with user_id for RLS
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert([{ ...clientData, user_id: userId }])
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create client: ${createError.message}`);
    }

    return newClient;
  }

  /**
   * Get all clients
   */
  async getAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch clients: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get client by ID
   */
  async getById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch client: ${error.message}`);
    }

    return data;
  }
}

export const clientService = new ClientService();