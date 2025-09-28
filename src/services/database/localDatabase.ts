// Local PostgreSQL adapter for development
import { createClient } from '@supabase/supabase-js';

const isDevelopment = import.meta.env.NODE_ENV === 'development';
const isLocalMode = import.meta.env.DATABASE_MODE === 'local';

// Local PostgreSQL configuration
const LOCAL_CONFIG = {
  url: 'http://localhost:5432',
  anonKey: 'local-dev-key',
  db: {
    host: 'localhost',
    port: 5432,
    database: 'commission_tracker',
    user: 'postgres',
    password: 'password'
  }
};

// Create a mock Supabase client for local development
function createLocalClient() {
  if (isLocalMode && isDevelopment) {
    // For now, we'll use a simple fetch-based approach
    // This can be expanded to use a proper PostgreSQL client later
    return createClient(LOCAL_CONFIG.url, LOCAL_CONFIG.anonKey, {
      db: { schema: 'public' },
      auth: { persistSession: false }
    });
  }
  
  // Fallback to regular Supabase
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
}

export const localDatabase = createLocalClient();
export const isLocal = isLocalMode && isDevelopment;