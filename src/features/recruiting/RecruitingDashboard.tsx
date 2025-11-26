// src/features/recruiting/RecruitingDashboard.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserPlus, Mail, Filter, Download } from 'lucide-react';
import { useRecruits, useRecruitingStats } from './hooks/useRecruits';
import { RecruitListTable } from './components/RecruitListTable';
import { RecruitDetailPanel } from './components/RecruitDetailPanel';
import { AddRecruitDialog } from './components/AddRecruitDialog';
import type { UserProfile } from '@/types/hierarchy.types';
import { useAuth } from '@/contexts/AuthContext';

export function RecruitingDashboard() {
  const { user } = useAuth();
  const { data: recruitsData, isLoading: recruitsLoading } = useRecruits();
  const { data: stats } = useRecruitingStats(user?.id);

  const [selectedRecruit, setSelectedRecruit] = useState<UserProfile | null>(null);
  const [addRecruitDialogOpen, setAddRecruitDialogOpen] = useState(false);

  const recruits = recruitsData?.data || [];

  const handleSelectRecruit = (recruit: UserProfile) => {
    setSelectedRecruit(recruit);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Recruiting Pipeline</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button size="sm" variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Bulk Email
          </Button>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => setAddRecruitDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Recruit
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <Card className="p-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Recruiting Overview
        </h3>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Total Recruits</div>
            <div className="text-3xl font-bold font-mono">{stats?.total || 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Active</div>
            <div className="text-3xl font-bold font-mono text-yellow-600">{stats?.active || 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Completed</div>
            <div className="text-3xl font-bold font-mono text-green-600">{stats?.completed || 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Dropped</div>
            <div className="text-3xl font-bold font-mono text-gray-600">{stats?.dropped || 0}</div>
          </div>
        </div>
      </Card>

      {/* Master-Detail Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Panel: Recruit List */}
        <div className="col-span-5">
          <Card className="h-full">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Recruits ({recruits.length})</h3>
            </div>
            <RecruitListTable
              recruits={recruits}
              isLoading={recruitsLoading}
              selectedRecruitId={selectedRecruit?.id}
              onSelectRecruit={handleSelectRecruit}
            />
          </Card>
        </div>

        {/* Right Panel: Recruit Details */}
        <div className="col-span-7">
          <Card className="h-full p-6 overflow-auto">
            {selectedRecruit ? (
              <RecruitDetailPanel
                recruit={selectedRecruit}
                currentUserId={user?.id}
                isUpline={true} // TODO: Determine this based on actual role
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-1">No recruit selected</p>
                  <p className="text-sm">Select a recruit from the list to view details</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Add Recruit Dialog */}
      <AddRecruitDialog
        open={addRecruitDialogOpen}
        onOpenChange={setAddRecruitDialogOpen}
        onSuccess={(recruitId) => {
          const newRecruit = recruits.find((r) => r.id === recruitId);
          if (newRecruit) setSelectedRecruit(newRecruit);
        }}
      />
    </div>
  );
}
