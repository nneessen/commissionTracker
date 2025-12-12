// src/features/recruiting/RecruitingDashboard.tsx

import React, { useState } from 'react';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {UserPlus, Mail, Download, Settings2} from 'lucide-react';
import {useRecruits} from './hooks/useRecruits';
import {RecruitListTable} from './components/RecruitListTable';
import {RecruitDetailPanel} from './components/RecruitDetailPanel';
import {AddRecruitDialog} from './components/AddRecruitDialog';
import {StatusLegend} from './components/StatusLegend';
import {RecruitingErrorBoundary} from './components/RecruitingErrorBoundary';
import type {UserProfile} from '@/types/hierarchy.types';
import {useAuth} from '@/contexts/AuthContext';
import {showToast} from '@/utils/toast';
import {Link} from '@tanstack/react-router';
import {downloadCSV} from '@/utils/exportHelpers';

// Extended type for recruits with joined data
type RecruitWithRelations = UserProfile & {
  recruiter?: { id: string; first_name?: string; last_name?: string; email: string } | null;
  upline?: { id: string; first_name?: string; last_name?: string; email: string } | null;
};

function RecruitingDashboardContent() {
  const { user } = useAuth();
  const { data: recruitsData, isLoading: recruitsLoading } = useRecruits();

  const [selectedRecruit, setSelectedRecruit] = useState<UserProfile | null>(null);
  const [addRecruitDialogOpen, setAddRecruitDialogOpen] = useState(false);

  // Filter out the current user (upline) from the recruits list
  const recruits = ((recruitsData?.data || []) as RecruitWithRelations[]).filter(
    (recruit) => recruit.id !== user?.id
  );

  // Calculate stats from recruits data directly
  const activePhases = ['interview_1', 'zoom_interview', 'pre_licensing', 'exam', 'npn_received', 'contracting', 'bootcamp'];
  const stats = {
    total: recruits.length,
    active: recruits.filter((r) => r.onboarding_status && activePhases.includes(r.onboarding_status)).length,
    completed: recruits.filter((r) => r.onboarding_status === 'completed').length,
    dropped: recruits.filter((r) => r.onboarding_status === 'dropped').length,
  };

  const handleSelectRecruit = (recruit: UserProfile) => {
    setSelectedRecruit(recruit);
  };

  const handleExportCSV = () => {
    const exportData = recruits.map((r) => ({
      Name: r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : '',
      Email: r.email,
      Phone: r.phone || '',
      Status: r.onboarding_status || '',
      Recruiter: r.recruiter?.first_name && r.recruiter?.last_name
        ? `${r.recruiter.first_name} ${r.recruiter.last_name}`
        : r.recruiter?.email || '',
      Upline: r.upline?.first_name && r.upline?.last_name
        ? `${r.upline.first_name} ${r.upline.last_name}`
        : r.upline?.email || '',
      Created: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
    }));

    downloadCSV(exportData, 'recruits');
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
      <div className="p-2 bg-muted/30 rounded-lg">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Total</div>
            <div className="text-lg font-bold">{stats.total}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Active</div>
            <div className="text-lg font-bold">{stats.active}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Complete</div>
            <div className="text-lg font-bold">{stats.completed}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Dropped</div>
            <div className="text-lg font-bold">{stats.dropped}</div>
          </div>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="flex-1 flex gap-2 min-h-0 overflow-hidden">
        {/* Left Panel: Recruit List */}
        <div className="flex-[5] min-w-0 max-w-[700px]">
          <Card className="h-full flex flex-col overflow-hidden">
            <StatusLegend />
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
                  onRecruitDeleted={() => setSelectedRecruit(null)}
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

export function RecruitingDashboard() {
  return (
    <RecruitingErrorBoundary>
      <RecruitingDashboardContent />
    </RecruitingErrorBoundary>
  );
}
