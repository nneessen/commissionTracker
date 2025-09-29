import React, { useState } from 'react';
import { SettingsLayout } from '../../components/layout';
import {
  Building2,
  Package,
  User,
  Settings
} from 'lucide-react';
import { SettingsCard, SettingsHeader } from './components/SettingsComponents';
import { CarrierManager } from './carriers/CarrierManager';
import { ProductManager } from './products/ProductManager';

export function SettingsDashboard() {
  const [activeTab, setActiveTab] = useState('carriers');

  const settingsTabs = [
    {
      id: 'carriers',
      label: 'Carriers',
      icon: Building2,
      description: 'Manage insurance carriers and their information'
    },
    {
      id: 'products',
      label: 'Products & Commission Guide',
      icon: Package,
      description: 'Manage products and commission rates by contract level'
    },
    {
      id: 'constants',
      label: 'Constants',
      icon: Settings,
      description: 'Configure application constants and default values'
    },
    {
      id: 'agents',
      label: 'Agent Settings',
      icon: User,
      description: 'Manage agent-specific settings and configurations'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'carriers':
        return <CarrierManager />;
      case 'products':
        return <ProductManager />;
      case 'constants':
        return (
          <SettingsCard title="Constants Management" icon={<Settings size={20} />}>
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              <Settings size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>Constants management features coming soon.</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                Configure default values, commission rates, and application settings.
              </p>
            </div>
          </SettingsCard>
        );
      case 'agents':
        return (
          <SettingsCard title="Agent Settings" icon={<User size={20} />}>
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              <User size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>Agent settings management coming soon.</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                Configure agent-specific settings, permissions, and preferences.
              </p>
            </div>
          </SettingsCard>
        );
      default:
        return <CarrierManager />;
    }
  };

  return (
    <SettingsLayout
      title="Settings"
      description="Configure and manage your commission tracker"
      backLink="/dashboard"
    >
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <SettingsHeader
          title="Settings"
          description="Configure carriers, products, and system settings"
        />

        {/* Modern Tab Navigation */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '20px',
                  border: isActive ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  backgroundColor: isActive ? '#f0f9ff' : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 2px 6px rgba(26, 26, 26, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? '#3b82f6' : '#f8f9fa',
                    color: isActive ? 'white' : '#6b7280'
                  }}>
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      margin: '0 0 4px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: isActive ? '#1e40af' : '#1f2937'
                    }}>
                      {tab.label}
                    </h3>
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      color: '#6b7280',
                      lineHeight: '1.4'
                    }}>
                      {tab.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div style={{ marginBottom: '24px' }}>
          {renderTabContent()}
        </div>
      </div>
    </SettingsLayout>
  );
}