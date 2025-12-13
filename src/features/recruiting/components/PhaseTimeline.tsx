// src/features/recruiting/components/PhaseTimeline.tsx

import React from 'react';
// import {PHASE_PROGRESS_ICONS} from '@/types/recruiting';
import {Progress} from '@/components/ui/progress';
import {Badge} from '@/components/ui/badge';
// import {Card} from '@/components/ui/card';
import {CheckCircle2, Clock, AlertCircle, Circle, SkipForward} from 'lucide-react';
import type { RecruitPhaseProgress, PipelinePhase } from '@/types/recruiting.types';

interface PhaseTimelineProps {
  phaseProgress: RecruitPhaseProgress[];
  phases: PipelinePhase[];
  onPhaseClick?: (phaseId: string) => void;
}

export function PhaseTimeline({ phaseProgress, phases, onPhaseClick }: PhaseTimelineProps) {
  // Sort phases by phase_order
  const sortedPhases = [...phases].sort((a, b) => a.phase_order - b.phase_order);

  // Create a map of phaseId -> progress
  const progressMap = new Map(phaseProgress.map((p) => [p.phase_id, p]));

  // Calculate overall progress percentage
  const completedPhases = phaseProgress.filter((p) => p.status === 'completed').length;
  const totalPhases = phases.length;
  const progressPercentage = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-3 w-3 text-yellow-600" />;
      case 'blocked':
        return <AlertCircle className="h-3 w-3 text-red-600" />;
      case 'skipped':
        return <SkipForward className="h-3 w-3 text-gray-600" />;
      default:
        return <Circle className="h-3 w-3 text-gray-400" />;
    }
  };

  const getPhaseColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50/30 dark:bg-green-950/30';
      case 'in_progress':
        return 'bg-amber-50/30 dark:bg-amber-950/30';
      case 'blocked':
        return 'bg-red-50/30 dark:bg-red-950/30';
      case 'skipped':
        return 'bg-muted/20';
      default:
        return 'bg-muted/10';
    }
  };

  return (
    <div className="space-y-1">
      {/* Progress summary */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Overall Progress</span>
          <span className="text-muted-foreground">
            {completedPhases}/{totalPhases} ({progressPercentage}%)
          </span>
        </div>
        <Progress value={progressPercentage} className="h-1.5" />
      </div>

      {/* Phase timeline */}
      <div className="space-y-0.5">
        {sortedPhases.map((phase, index) => {
          const progress = progressMap.get(phase.id);
          const status = progress?.status || 'not_started';
          const isClickable = !!onPhaseClick;

          return (
            <div
              key={phase.id}
              className={`p-1 rounded-sm transition-all ${getPhaseColor(status)} ${
                isClickable ? 'cursor-pointer hover:bg-muted/50' : ''
              }`}
              onClick={isClickable ? () => onPhaseClick(phase.id) : undefined}
            >
              <div className="flex items-start gap-1">
                <div className="flex-shrink-0 mt-0.5">{getPhaseIcon(status)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-xs">{phase.phase_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {index + 1}/{totalPhases}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-3.5">
                      {status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {phase.phase_description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{phase.phase_description}</p>
                  )}

                  {progress?.blocked_reason && (
                    <div className="mt-1 p-1 bg-red-100/50 dark:bg-red-950/50 rounded-sm text-[11px]">
                      <span className="font-medium text-red-900 dark:text-red-100">Blocked: </span>
                      <span className="text-red-800 dark:text-red-200">{progress.blocked_reason}</span>
                    </div>
                  )}

                  {progress?.notes && !progress.blocked_reason && (
                    <p className="mt-1 text-[11px] text-muted-foreground italic">{progress.notes}</p>
                  )}

                  {progress?.started_at && (
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>
                        Started: {new Date(progress.started_at).toLocaleDateString()}
                      </span>
                      {progress.completed_at && (
                        <span>
                          Completed: {new Date(progress.completed_at).toLocaleDateString()}
                        </span>
                      )}
                      {phase.estimated_days && status === 'in_progress' && (
                        <span className="font-medium">
                          Estimated: {phase.estimated_days} days
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
