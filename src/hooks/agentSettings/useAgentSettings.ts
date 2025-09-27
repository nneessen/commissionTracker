// src/hooks/agentSettings/useAgentSettings.ts

import { useState, useEffect } from 'react';
import { agentSettingsService } from '../../services';
import { AgentSettings, CreateAgentSettingsData } from '../../types/agent.types';

export const useAgentSettings = (agentId?: string) => {
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      let data: AgentSettings | null;
      if (agentId) {
        data = await agentSettingsService.getByAgentId(agentId);
      } else {
        data = await agentSettingsService.getCurrentAgentSettings();
      }

      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent settings');
      console.error('Failed to fetch agent settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const createSettings = async (settingsData: CreateAgentSettingsData) => {
    try {
      setError(null);
      const newSettings = await agentSettingsService.create(settingsData);
      setSettings(newSettings);
      return newSettings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateSettings = async (id: string, updates: Partial<CreateAgentSettingsData>) => {
    try {
      setError(null);
      const updatedSettings = await agentSettingsService.update(id, updates);
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update agent settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateSettingsByAgentId = async (agentId: string, updates: Partial<CreateAgentSettingsData>) => {
    try {
      setError(null);
      const updatedSettings = await agentSettingsService.updateByAgentId(agentId, updates);
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update agent settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateContractLevel = async (targetAgentId: string, contractLevel: number) => {
    try {
      setError(null);
      const updatedSettings = await agentSettingsService.updateContractLevel(targetAgentId, contractLevel);
      if (!agentId || agentId === targetAgentId) {
        setSettings(updatedSettings);
      }
      return updatedSettings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update contract level';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteSettings = async (id: string) => {
    try {
      setError(null);
      await agentSettingsService.delete(id);
      setSettings(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete agent settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [agentId, fetchSettings]);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    createSettings,
    updateSettings,
    updateSettingsByAgentId,
    updateContractLevel,
    deleteSettings,
  };
};

export const useContractLevel = (agentId?: string) => {
  const [contractLevel, setContractLevel] = useState<number>(100); // Default level
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContractLevel = async () => {
    try {
      setLoading(true);
      setError(null);
      const level = await agentSettingsService.getContractLevel(agentId);
      setContractLevel(level);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contract level');
      console.error('Failed to fetch contract level:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateContractLevel = async (targetAgentId: string, newLevel: number) => {
    try {
      setError(null);
      await agentSettingsService.updateContractLevel(targetAgentId, newLevel);
      if (!agentId || agentId === targetAgentId) {
        setContractLevel(newLevel);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update contract level';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    fetchContractLevel();
  }, [agentId, fetchContractLevel]);

  return {
    contractLevel,
    loading,
    error,
    fetchContractLevel,
    updateContractLevel,
  };
};

export const useAllAgentSettings = () => {
  const [allSettings, setAllSettings] = useState<AgentSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agentSettingsService.getAll();
      setAllSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch all agent settings');
      console.error('Failed to fetch all agent settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  return {
    allSettings,
    loading,
    error,
    fetchAllSettings,
  };
};