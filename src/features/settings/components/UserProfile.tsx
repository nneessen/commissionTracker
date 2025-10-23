// src/features/settings/components/UserProfile.tsx
import React, { useState } from 'react';
import { User, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../../contexts/AuthContext';
import { useUpdateUserProfile } from '../../../hooks/settings/useUpdateUserProfile';
import { SettingsCard } from './SettingsComponents';

export function UserProfile() {
  const { user } = useAuth();
  const updateProfile = useUpdateUserProfile();

  const [contractLevel, setContractLevel] = useState<string>(
    user?.contractCompLevel?.toString() || '100'
  );
  const [validationError, setValidationError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  const validateContractLevel = (value: string): boolean => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      setValidationError('Contract level must be a number');
      return false;
    }
    if (num < 80 || num > 145) {
      setValidationError('Contract level must be between 80 and 145');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleContractLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContractLevel(value);
    setShowSuccess(false);
    validateContractLevel(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccess(false);

    if (!validateContractLevel(contractLevel)) {
      return;
    }

    try {
      await updateProfile.mutateAsync({
        contractCompLevel: parseInt(contractLevel, 10),
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update contract level:', error);
    }
  };

  if (!user) {
    return (
      <SettingsCard title="User Profile" icon={<User size={20} />}>
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading user information...
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard title="User Profile" icon={<User size={20} />}>
      <div className="space-y-6">
        {/* User Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Email
            </label>
            <div className="px-3 py-2 bg-gradient-to-r from-muted/30 to-card rounded-md text-foreground shadow-sm">
              {user.email}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Name
            </label>
            <div className="px-3 py-2 bg-gradient-to-r from-muted/30 to-card rounded-md text-foreground shadow-sm">
              {user.name || 'Not set'}
            </div>
          </div>
        </div>

        {/* Contract Level Editor */}
        <form onSubmit={handleSubmit} className="pt-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Commission Settings</h3>
            <p className="text-sm text-muted-foreground">
              Your contract level determines your commission rates. This setting only affects
              new commissions and does not change existing policies or commission calculations.
            </p>
          </div>

          <div className="max-w-xs">
            <label htmlFor="contractLevel" className="block text-sm font-medium text-muted-foreground mb-2">
              Contract Level (80-145)
            </label>
            <input
              id="contractLevel"
              type="number"
              min="80"
              max="145"
              value={contractLevel}
              onChange={handleContractLevelChange}
              className={`block w-full px-3 py-2 rounded-md shadow-sm bg-card text-foreground focus:ring-2 focus:ring-primary ${
                validationError ? 'ring-2 ring-destructive' : ''
              }`}
            />
            {validationError && (
              <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {validationError}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex items-center gap-4">
            <Button
              type="submit"
              disabled={updateProfile.isPending || !!validationError}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>

            {showSuccess && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-5 w-5" />
                Contract level updated successfully!
              </div>
            )}

            {updateProfile.isError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-5 w-5" />
                Failed to update contract level
              </div>
            )}
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-gradient-to-r from-info/15 via-status-earned/10 to-card rounded-md shadow-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-info mt-0.5 flex-shrink-0" />
            <div className="text-sm text-foreground">
              <p className="font-medium mb-1">About Contract Levels</p>
              <p className="text-muted-foreground">
                Your contract level represents your commission tier with insurance carriers.
                Higher levels typically earn higher commission percentages. When you create new
                policies or commissions, your current contract level will be used to calculate
                your earnings from the comp guide.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
