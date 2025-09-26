import { useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Carrier, DEFAULT_CARRIERS, NewCarrierForm } from '../types';

export function useCarriers() {
  const [carriers, setCarriers] = useLocalStorage<Carrier[]>('carriers', []);

  // Initialize with default carriers if empty
  const initializedCarriers = useMemo(() => {
    if (carriers.length === 0) {
      const defaultCarriers: Carrier[] = DEFAULT_CARRIERS.map((carrier, index) => ({
        ...carrier,
        id: `carrier-${index + 1}`,
        createdAt: new Date(),
      }));
      setCarriers(defaultCarriers);
      return defaultCarriers;
    }
    return carriers;
  }, [carriers, setCarriers]);

  const addCarrier = (newCarrier: NewCarrierForm) => {
    const carrier: Carrier = {
      id: `carrier-${Date.now()}`,
      ...newCarrier,
      isActive: true,
      createdAt: new Date(),
    };
    setCarriers((prev) => [...prev, carrier]);
    return carrier;
  };

  const updateCarrier = (id: string, updates: Partial<Omit<Carrier, 'id' | 'createdAt'>>) => {
    setCarriers((prev) =>
      prev.map((carrier) =>
        carrier.id === id
          ? { ...carrier, ...updates, updatedAt: new Date() }
          : carrier
      )
    );
  };

  const deleteCarrier = (id: string) => {
    setCarriers((prev) => prev.filter((carrier) => carrier.id !== id));
  };

  const toggleCarrierActive = (id: string) => {
    updateCarrier(id, { isActive: !initializedCarriers.find(c => c.id === id)?.isActive });
  };

  const getCarrierById = (id: string): Carrier | undefined => {
    return initializedCarriers.find((carrier) => carrier.id === id);
  };

  const activeCarriers = initializedCarriers.filter((carrier) => carrier.isActive);

  return {
    carriers: initializedCarriers,
    activeCarriers,
    addCarrier,
    updateCarrier,
    deleteCarrier,
    toggleCarrierActive,
    getCarrierById,
  };
}