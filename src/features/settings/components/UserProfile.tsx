// src/features/settings/components/UserProfile.tsx
// Redesigned with zinc palette and compact design patterns

import React, { useState, useEffect } from 'react';
import { User, Save, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../../../contexts/AuthContext';
import { useUpdateUserProfile } from '../../../hooks/settings/useUpdateUserProfile';
import { useUpdateAgentHierarchy } from '../../../hooks/hierarchy/useUpdateAgentHierarchy';
import { supabase } from '@/services/base/supabase';

export function UserProfile() {
  const { user } = useAuth();
  const updateProfile = useUpdateUserProfile();
  const updateHierarchy = useUpdateAgentHierarchy();

  const [contractLevel, setContractLevel] = useState<string>(
    user?.contractCompLevel?.toString() || '100'
  );
  const [uplineEmail, setUplineEmail] = useState<string>('');
  const [currentUplineEmail, setCurrentUplineEmail] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [uplineError, setUplineError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showUplineSuccess, setShowUplineSuccess] = useState(false);

  // Load current upline email on mount
  useEffect(() => {
    const loadUplineInfo = async () => {
      if (!user?.id) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('upline_id')
        .eq('id', user.id)
        .single();

      if (profile?.upline_id) {
        const { data: upline } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('id', profile.upline_id)
          .single();

        if (upline?.email) {
          setCurrentUplineEmail(upline.email);
          setUplineEmail(upline.email);
        }
      }
    };

    loadUplineInfo();
  }, [user?.id]);

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

  const handleUplineEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUplineEmail(e.target.value);
    setUplineError('');
    setShowUplineSuccess(false);
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

  const handleUplineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowUplineSuccess(false);
    setUplineError('');

    if (!user?.id) return;

    // Allow clearing upline by submitting empty email
    if (!uplineEmail.trim()) {
      try {
        await updateHierarchy.mutateAsync({
          agent_id: user.id,
          new_upline_id: null,
        });
        setCurrentUplineEmail('');
        setShowUplineSuccess(true);
        setTimeout(() => setShowUplineSuccess(false), 3000);
        return;
      } catch (error: any) {
        setUplineError(error.message || 'Failed to remove upline');
        return;
      }
    }

    // Validate upline email exists
    try {
      const { data: upline, error } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('email', uplineEmail.trim())
        .single();

      if (error || !upline) {
        setUplineError('No user found with that email address');
        return;
      }

      if (upline.id === user.id) {
        setUplineError('You cannot set yourself as your own upline');
        return;
      }

      // Update hierarchy
      await updateHierarchy.mutateAsync({
        agent_id: user.id,
        new_upline_id: upline.id,
      });

      setCurrentUplineEmail(upline.email);
      setShowUplineSuccess(true);
      setTimeout(() => setShowUplineSuccess(false), 3000);
    } catch (error: any) {
      setUplineError(error.message || 'Failed to update upline');
    }
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-center text-[11px] text-zinc-500 dark:text-zinc-400">
          Loading user information...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* User Information Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <User className="h-3.5 w-3.5 text-zinc-400" />
          <h3 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
            User Profile
          </h3>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                Email
              </label>
              <div className="px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 rounded text-[11px] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {user.email}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                Name
              </label>
              <div className="px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 rounded text-[11px] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {user.name || 'Not set'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Hierarchy Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <Users className="h-3.5 w-3.5 text-zinc-400" />
          <h3 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
            Team Hierarchy
          </h3>
        </div>
        <div className="p-3">
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-2">
            Specify who your upline is. This determines who earns override commissions on your policies.
            {currentUplineEmail && (
              <span className="block mt-1 text-zinc-700 dark:text-zinc-300 font-medium">
                Current upline: {currentUplineEmail}
              </span>
            )}
          </p>

          <form onSubmit={handleUplineSubmit}>
            <div className="max-w-md">
              <label
                htmlFor="uplineEmail"
                className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1"
              >
                Upline Email (leave blank to remove)
              </label>
              <div className="flex gap-2">
                <Input
                  id="uplineEmail"
                  type="email"
                  value={uplineEmail}
                  onChange={handleUplineEmailChange}
                  placeholder="upline@example.com"
                  className={`h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 ${
                    uplineError ? 'border-red-500' : ''
                  }`}
                />
                <Button
                  type="submit"
                  disabled={updateHierarchy.isPending}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[10px] border-zinc-200 dark:border-zinc-700"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {updateHierarchy.isPending ? 'Updating...' : 'Update'}
                </Button>
              </div>
              {uplineError && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {uplineError}
                </div>
              )}
              {showUplineSuccess && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Upline updated successfully!
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Commission Settings Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
            Commission Settings
          </h3>
        </div>
        <div className="p-3">
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-2">
            Your contract level determines your commission rates. This setting only affects
            new commissions and does not change existing policies or commission calculations.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="max-w-xs">
              <label
                htmlFor="contractLevel"
                className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1"
              >
                Contract Level (80-145)
              </label>
              <div className="flex gap-2">
                <Input
                  id="contractLevel"
                  type="number"
                  min="80"
                  max="145"
                  value={contractLevel}
                  onChange={handleContractLevelChange}
                  className={`h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 w-24 ${
                    validationError ? 'border-red-500' : ''
                  }`}
                />
                <Button
                  type="submit"
                  disabled={updateProfile.isPending || !!validationError}
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {updateProfile.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
              {validationError && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {validationError}
                </div>
              )}
              {showSuccess && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Contract level updated successfully!
                </div>
              )}
              {updateProfile.isError && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  Failed to update contract level
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-[10px]">
            <p className="font-medium text-blue-700 dark:text-blue-300 mb-0.5">About Contract Levels</p>
            <p className="text-blue-600 dark:text-blue-400">
              Your contract level represents your commission tier with insurance carriers.
              Higher levels typically earn higher commission percentages. When you create new
              policies or commissions, your current contract level will be used to calculate
              your earnings from the comp guide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
