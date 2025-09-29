import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface SettingsLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  backLink?: string;
}

export default function SettingsLayout({
  title,
  description,
  children,
  backLink = '/dashboard'
}: SettingsLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to={backLink}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            {description && (
              <p className="text-gray-600 text-lg">{description}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
}