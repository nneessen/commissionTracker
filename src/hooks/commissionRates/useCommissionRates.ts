// src/hooks/commissionRates/useCommissionRates.ts

import { useState, useEffect } from 'react';
import { commissionRateService, CreateCommissionRateData } from '../../services';
import { CommissionRate } from '../../types/product.types';

export const useCommissionRates = () => {
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await commissionRateService.getAll();
      setRates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch commission rates');
      console.error('Failed to fetch commission rates:', err);
    } finally {
      setLoading(false);
    }
  };

  const addRate = async (rateData: CreateCommissionRateData) => {
    try {
      setError(null);
      const newRate = await commissionRateService.create(rateData);
      setRates(prev => [...prev, newRate]);
      return newRate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create commission rate';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const addRatesBulk = async (ratesData: CreateCommissionRateData[]) => {
    try {
      setError(null);
      const newRates = await commissionRateService.createBulk(ratesData);
      setRates(prev => [...prev, ...newRates]);
      return newRates;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create commission rates';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateRate = async (id: string, updates: Partial<CreateCommissionRateData>) => {
    try {
      setError(null);
      const updatedRate = await commissionRateService.update(id, updates);
      setRates(prev => prev.map(r => r.id === id ? updatedRate : r));
      return updatedRate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update commission rate';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteRate = async (id: string) => {
    try {
      setError(null);
      await commissionRateService.delete(id);
      setRates(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete commission rate';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  return {
    rates,
    loading,
    error,
    fetchRates,
    addRate,
    addRatesBulk,
    updateRate,
    deleteRate,
  };
};

export const useCommissionRatesByProduct = (productId?: string) => {
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async () => {
    if (!productId) {
      setRates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await commissionRateService.getByProduct(productId);
      setRates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch commission rates');
      console.error('Failed to fetch commission rates by product:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [productId]);

  return {
    rates,
    loading,
    error,
    fetchRates,
  };
};

export const useCommissionRatesByCarrier = (carrierId?: string) => {
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async () => {
    if (!carrierId) {
      setRates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await commissionRateService.getByCarrier(carrierId);
      setRates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch commission rates');
      console.error('Failed to fetch commission rates by carrier:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [carrierId]);

  return {
    rates,
    loading,
    error,
    fetchRates,
  };
};

export const useCommissionRatesByContractLevel = (contractLevel?: number) => {
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async () => {
    if (!contractLevel) {
      setRates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await commissionRateService.getByContractLevel(contractLevel);
      setRates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch commission rates');
      console.error('Failed to fetch commission rates by contract level:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [contractLevel]);

  return {
    rates,
    loading,
    error,
    fetchRates,
  };
};

export const useCommissionRate = (carrierId?: string, productId?: string, contractLevel?: number) => {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRate = async () => {
    if (!carrierId || !productId || !contractLevel) {
      setRate(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await commissionRateService.getRate(carrierId, productId, contractLevel);
      setRate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch commission rate');
      console.error('Failed to fetch commission rate:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
  }, [carrierId, productId, contractLevel]);

  return {
    rate,
    loading,
    error,
    fetchRate,
  };
};