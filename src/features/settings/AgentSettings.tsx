// src/features/settings/AgentSettings.tsx

import React, { useState, useEffect } from 'react';
import { useAgentSettings, useContractLevel } from '../../hooks/agentSettings';
import { CONTRACT_LEVELS, validateContractLevel } from '../../types/product.types';
import { US_STATES } from '../../types/agent.types';

export const AgentSettings: React.FC = () => {
  const { settings, loading, error, createSettings, updateSettings } = useAgentSettings();
  const { contractLevel } = useContractLevel();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    contractLevel: 100,
    firstName: '',
    lastName: '',
    agentCode: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseState: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        contractLevel: settings.contractLevel || 100,
        firstName: settings.firstName || '',
        lastName: settings.lastName || '',
        agentCode: settings.agentCode || '',
        email: settings.email || '',
        phone: settings.phone || '',
        licenseNumber: settings.licenseNumber || '',
        licenseState: settings.licenseState || '',
      });
    } else {
      setFormData(prev => ({
        ...prev,
        contractLevel: contractLevel,
      }));
    }
  }, [settings, contractLevel]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'contractLevel' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateContractLevel(formData.contractLevel)) {
      alert('Contract level must be between 80 and 145 in increments of 5');
      return;
    }

    try {
      const agentId = 'default-agent'; // For single-agent system

      if (settings) {
        await updateSettings(settings.id, formData);
      } else {
        await createSettings({
          agentId,
          ...formData,
        });
      }

      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save agent settings:', err);
    }
  };

  const handleCancel = () => {
    if (settings) {
      setFormData({
        contractLevel: settings.contractLevel || 100,
        firstName: settings.firstName || '',
        lastName: settings.lastName || '',
        agentCode: settings.agentCode || '',
        email: settings.email || '',
        phone: settings.phone || '',
        licenseNumber: settings.licenseNumber || '',
        licenseState: settings.licenseState || '',
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading agent settings...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Agent Settings</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Edit Settings
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contract Level - Most Important */}
          <div className="md:col-span-2">
            <label htmlFor="contractLevel" className="block text-sm font-medium text-gray-700 mb-2">
              Contract Level *
              <span className="text-xs text-gray-500 ml-2">
                (This affects all commission calculations)
              </span>
            </label>
            <select
              id="contractLevel"
              name="contractLevel"
              value={formData.contractLevel}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                !isEditing ? 'bg-gray-50 text-gray-600' : ''
              }`}
              required
            >
              {CONTRACT_LEVELS.map(level => (
                <option key={level} value={level}>
                  {level}%
                </option>
              ))}
            </select>
          </div>

          {/* Personal Information */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                !isEditing ? 'bg-gray-50 text-gray-600' : ''
              }`}
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                !isEditing ? 'bg-gray-50 text-gray-600' : ''
              }`}
            />
          </div>

          <div>
            <label htmlFor="agentCode" className="block text-sm font-medium text-gray-700 mb-2">
              Agent Code
            </label>
            <input
              type="text"
              id="agentCode"
              name="agentCode"
              value={formData.agentCode}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                !isEditing ? 'bg-gray-50 text-gray-600' : ''
              }`}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                !isEditing ? 'bg-gray-50 text-gray-600' : ''
              }`}
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                !isEditing ? 'bg-gray-50 text-gray-600' : ''
              }`}
            />
          </div>

          <div>
            <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-2">
              License Number
            </label>
            <input
              type="text"
              id="licenseNumber"
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                !isEditing ? 'bg-gray-50 text-gray-600' : ''
              }`}
            />
          </div>

          <div>
            <label htmlFor="licenseState" className="block text-sm font-medium text-gray-700 mb-2">
              License State
            </label>
            <select
              id="licenseState"
              name="licenseState"
              value={formData.licenseState}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                !isEditing ? 'bg-gray-50 text-gray-600' : ''
              }`}
            >
              <option value="">Select State</option>
              {US_STATES.map(state => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Settings
            </button>
          </div>
        )}
      </form>

      {!isEditing && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Current Contract Level Impact</h4>
            <p className="text-sm text-blue-700">
              Your current contract level of <strong>{contractLevel}%</strong> affects all commission calculations.
              Higher contract levels generally provide better commission rates.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};