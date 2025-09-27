// /home/nneessen/projects/commissionTracker/src/components/layout/SettingsLayout.tsx
// Settings page layout with sidebar navigation and lazy loading

import React, { Suspense, useState } from 'react';
import { Settings, Users, Building2, Calculator, Database, FileText } from 'lucide-react';

// Lazy load settings components for better performance
const AgentSettings = React.lazy(() => import('../../features/settings/AgentSettings').then(module => ({ default: module.AgentSettings })));
const CarrierManager = React.lazy(() => import('../../features/settings/CarrierManager').then(module => ({ default: module.CarrierManager })));
const ConstantsManager = React.lazy(() => import('../../features/settings/ConstantsManager').then(module => ({ default: module.ConstantsManager })));
const CompGuideViewer = React.lazy(() => import('../../features/settings/CompGuideViewer').then(module => ({ default: module.CompGuideViewer })));
const ProductManager = React.lazy(() => import('../../features/settings/ProductManager').then(module => ({ default: module.ProductManager })));

// Settings section configuration
export interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
  enabled: boolean;
}

const settingsSections: SettingsSection[] = [
  {
    id: 'agent',
    title: 'Agent Settings',
    description: 'Configure agent information and contract levels',
    icon: Users,
    component: AgentSettings,
    enabled: true,
  },
  {
    id: 'carriers',
    title: 'Carriers',
    description: 'Manage insurance carriers and their details',
    icon: Building2,
    component: CarrierManager,
    enabled: true,
  },
  {
    id: 'comp-guide',
    title: 'Commission Guide',
    description: 'View and manage commission rates by carrier and product',
    icon: Calculator,
    component: CompGuideViewer,
    enabled: true,
  },
  {
    id: 'products',
    title: 'Products',
    description: 'Manage insurance products and types',
    icon: Database,
    component: ProductManager,
    enabled: true,
  },
  {
    id: 'constants',
    title: 'Constants',
    description: 'Configure application constants and default values',
    icon: FileText,
    component: ConstantsManager,
    enabled: true,
  },
];

interface SettingsLayoutProps {
  defaultSection?: string;
}

export function SettingsLayout({ defaultSection = 'agent' }: SettingsLayoutProps) {
  const [activeSection, setActiveSection] = useState(defaultSection);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const activeSectionConfig = settingsSections.find(section => section.id === activeSection);
  const ActiveComponent = activeSectionConfig?.component;

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Settings className="h-6 w-6 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
            </div>
            <button
              onClick={toggleSidebar}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              aria-label="Toggle sidebar"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex">
          {/* Settings Sidebar */}
          <aside className={`${isSidebarCollapsed ? 'hidden' : 'block'} md:block w-full md:w-64 flex-shrink-0`}>
            <div className="py-6">
              <nav className="space-y-1">
                {settingsSections
                  .filter(section => section.enabled)
                  .map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;

                    return (
                      <button
                        key={section.id}
                        onClick={() => handleSectionChange(section.id)}
                        className={`w-full text-left group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                          isActive
                            ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon
                          className={`mr-3 h-5 w-5 flex-shrink-0 ${
                            isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{section.title}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {section.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 md:ml-6">
            <div className="py-6">
              {/* Section Header */}
              {activeSectionConfig && (
                <div className="mb-6">
                  <div className="flex items-center">
                    <activeSectionConfig.icon className="h-6 w-6 text-blue-600 mr-3" />
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {activeSectionConfig.title}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {activeSectionConfig.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Section Content */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-64">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-gray-600">Loading...</span>
                      </div>
                    </div>
                  }
                >
                  {ActiveComponent && <ActiveComponent />}
                </Suspense>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default SettingsLayout;