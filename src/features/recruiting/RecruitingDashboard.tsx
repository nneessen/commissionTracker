// src/features/recruiting/RecruitingDashboard.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserPlus, Mail, Download, Settings2 } from 'lucide-react';
import { useRecruits, useRecruitingStats } from './hooks/useRecruits';
import { RecruitListTable } from './components/RecruitListTable';
import { RecruitDetailPanel } from './components/RecruitDetailPanel';
import { AddRecruitDialog } from './components/AddRecruitDialog';
import type { UserProfile } from '@/types/hierarchy.types';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/utils/toast';
import { Link } from '@tanstack/react-router';

// Extended type for recruits with joined data
type RecruitWithRelations = UserProfile & {
  recruiter?: { id: string; first_name?: string; last_name?: string; email: string } | null;
  upline?: { id: string; first_name?: string; last_name?: string; email: string } | null;
};

export function RecruitingDashboard() {
  const { user } = useAuth();
  const { data: recruitsData, isLoading: recruitsLoading } = useRecruits();
  const { data: stats } = useRecruitingStats(user?.id);

  const [selectedRecruit, setSelectedRecruit] = useState<UserProfile | null>(null);
  const [addRecruitDialogOpen, setAddRecruitDialogOpen] = useState(false);

  // Filter out the current user (upline) from the recruits list
  const recruits = ((recruitsData?.data || []) as RecruitWithRelations[]).filter(
    (recruit) => recruit.id !== user?.id
  );

  const handleSelectRecruit = (recruit: UserProfile) => {
    setSelectedRecruit(recruit);
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Recruiter', 'Upline', 'Created'];
    const rows = recruits.map((r) => [
      r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : '',
      r.email,
      r.phone || '',
      r.onboarding_status || '',
      r.recruiter?.first_name && r.recruiter?.last_name
        ? `${r.recruiter.first_name} ${r.recruiter.last_name}`
        : r.recruiter?.email || '',
      r.upline?.first_name && r.upline?.last_name
        ? `${r.upline.first_name} ${r.upline.last_name}`
        : r.upline?.email || '',
      r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `recruits-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast.success(`Exported ${recruits.length} recruits to CSV`);
  };

  const handleBulkEmail = () => {
    showToast.success('Bulk email feature coming soon!');
  };

  return (
    <div className="h-full flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recruiting Pipeline</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleBulkEmail}>
            <Mail className="h-4 w-4 mr-1" />
            Email
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button size="sm" onClick={() => setAddRecruitDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Add
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/recruiting/admin/pipelines">
              <Settings2 className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <Card className="p-2 bg-muted/30">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Total</div>
            <div className="text-lg font-bold font-mono">{stats?.total || 0}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Active</div>
            <div className="text-lg font-bold font-mono">{stats?.active || 0}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Complete</div>
            <div className="text-lg font-bold font-mono">{stats?.completed || 0}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Dropped</div>
            <div className="text-lg font-bold font-mono">{stats?.dropped || 0}</div>
          </div>
        </div>
      </Card>

      {/* Master-Detail Layout */}
      <div className="flex-1 flex gap-2 min-h-0 overflow-hidden">
        {/* Left Panel: Recruit List */}
        <div className="flex-[5] min-w-0 max-w-[700px]">
          <Card className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <RecruitListTable
                recruits={recruits}
                isLoading={recruitsLoading}
                selectedRecruitId={selectedRecruit?.id}
                onSelectRecruit={handleSelectRecruit}
              />
            </div>
          </Card>
        </div>

        {/* Right Panel: Recruit Details */}
        <div className="flex-[5] min-w-[380px]">
          <Card className="h-full overflow-hidden">
            {selectedRecruit ? (
              <div className="h-full overflow-auto">
                <RecruitDetailPanel
                  recruit={selectedRecruit}
                  currentUserId={user?.id}
                  isUpline={true}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground p-4">
                <div className="text-center">
                  <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium mb-1">No recruit selected</p>
                  <p className="text-xs">Select a recruit from the list</p>
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
