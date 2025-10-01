import { useState, useEffect } from 'react';
import { logger } from '../services/base/logger';
import { Carrier, NewCarrierForm, DEFAULT_CARRIERS } from '../types/carrier.types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'commission_tracker_carriers';

export const useCarriers = () => {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load carriers from localStorage on mount
  useEffect(() => {
    const loadCarriers = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setCarriers(parsed.map((c: any) => ({
            ...c,
            created_at: new Date(c.created_at || c.createdAt),
            updated_at: c.updated_at ? new Date(c.updated_at) : c.updatedAt ? new Date(c.updatedAt) : undefined,
          })));
        } else {
          // Initialize with default carriers if none exist
          const defaultCarriers: Carrier[] = DEFAULT_CARRIERS.map(carrier => ({
            ...carrier,
            id: uuidv4(),
            created_at: new Date(),
          }));
          setCarriers(defaultCarriers);
        }
      } catch (error) {
        logger.error('Error loading carriers', error instanceof Error ? error : String(error), 'Migration');
        // Fallback to default carriers on error
        const defaultCarriers: Carrier[] = DEFAULT_CARRIERS.map(carrier => ({
          ...carrier,
          id: uuidv4(),
          created_at: new Date(),
        }));
        setCarriers(defaultCarriers);
      } finally {
        setIsLoading(false);
      }
    };

    loadCarriers();
  }, []);

  // Save carriers to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(carriers));
      } catch (error) {
        logger.error('Error saving carriers', error instanceof Error ? error : String(error), 'Migration');
      }
    }
  }, [carriers, isLoading]);

  // Add a new carrier
  const addCarrier = (form: NewCarrierForm): Carrier | null => {
    try {
      const newCarrier: Carrier = {
        id: uuidv4(),
        name: form.name.trim(),
        short_name: form.short_name,
        is_active: form.is_active ?? true,
        default_commission_rates: form.default_commission_rates || {},
        contact_info: form.contact_info || {},
        notes: form.notes,
        created_at: new Date(),
      };

      setCarriers(prev => [...prev, newCarrier]);
      return newCarrier;
    } catch (error) {
      logger.error('Error adding carrier', error instanceof Error ? error : String(error), 'Migration');
      return null;
    }
  };

  // Update a carrier
  const updateCarrier = (id: string, updates: Partial<Omit<Carrier, 'id' | 'created_at'>>) => {
    setCarriers(prev => prev.map(carrier =>
      carrier.id === id
        ? {
            ...carrier,
            ...updates,
            updated_at: new Date()
          }
        : carrier
    ));
  };

  // Delete a carrier
  const deleteCarrier = (id: string) => {
    setCarriers(prev => prev.filter(carrier => carrier.id !== id));
  };

  // Get carrier by ID
  const getCarrierById = (id: string): Carrier | undefined => {
    return carriers.find(carrier => carrier.id === id);
  };

  // Get active carriers only
  const getActiveCarriers = (): Carrier[] => {
    return carriers.filter(carrier => carrier.is_active);
  };

  return {
    carriers,
    isLoading,
    addCarrier,
    updateCarrier,
    deleteCarrier,
    getCarrierById,
    getActiveCarriers,
  };
};