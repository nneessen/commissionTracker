import { useState, useEffect } from 'react';
import { carrierService } from '../services';
import { Carrier, DEFAULT_CARRIERS, NewCarrierForm } from '../types';

export function useCarriers() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load carriers from database
  useEffect(() => {
    const loadCarriers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await carrierService.getAll();

        // Initialize with default carriers if empty
        if (data.length === 0) {
          const defaultCarriers = [];
          for (const defaultCarrier of DEFAULT_CARRIERS) {
            const created = await carrierService.create(defaultCarrier);
            defaultCarriers.push(created);
          }
          setCarriers(defaultCarriers);
        } else {
          setCarriers(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load carriers');
        console.error('Error loading carriers:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCarriers();
  }, []);

  const addCarrier = async (newCarrier: NewCarrierForm): Promise<Carrier | null> => {
    try {
      const carrier = await carrierService.create({
        ...newCarrier,
        isActive: true,
      });
      setCarriers((prev) => [...prev, carrier]);
      return carrier;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create carrier');
      return null;
    }
  };

  const updateCarrier = async (id: string, updates: Partial<Omit<Carrier, 'id' | 'createdAt'>>): Promise<boolean> => {
    try {
      const updatedCarrier = await carrierService.update(id, updates);
      setCarriers((prev) =>
        prev.map((carrier) =>
          carrier.id === id ? updatedCarrier : carrier
        )
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update carrier');
      return false;
    }
  };

  const deleteCarrier = async (id: string): Promise<boolean> => {
    try {
      await carrierService.delete(id);
      setCarriers((prev) => prev.filter((carrier) => carrier.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete carrier');
      return false;
    }
  };

  const toggleCarrierActive = async (id: string): Promise<boolean> => {
    const carrier = carriers.find(c => c.id === id);
    if (!carrier) return false;

    try {
      const updatedCarrier = await carrierService.setActive(id, !carrier.isActive);
      setCarriers((prev) =>
        prev.map((c) => c.id === id ? updatedCarrier : c)
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle carrier status');
      return false;
    }
  };

  const getCarrierById = (id: string): Carrier | undefined => {
    return carriers.find((carrier) => carrier.id === id);
  };

  const activeCarriers = carriers.filter((carrier) => carrier.isActive);

  const clearError = () => setError(null);

  return {
    carriers,
    activeCarriers,
    isLoading,
    error,
    addCarrier,
    updateCarrier,
    deleteCarrier,
    toggleCarrierActive,
    getCarrierById,
    clearError,
  };
}