// src/features/recruiting/components/PhaseTimeline.tsx

import React from 'react';
import { RecruitPhaseProgress, PipelinePhase, PHASE_PROGRESS_ICONS } from '@/types/recruiting';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Clock, AlertCircle, Circle, SkipForward } from 'lucide-react';

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
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-6 w-6 text-yellow-600" />;
      case 'blocked':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      case 'skipped':
        return <SkipForward className="h-6 w-6 text-gray-600" />;
      default:
        return <Circle className="h-6 w-6 text-gray-400" />;
    }
  };

  const getPhaseColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-500 dark:bg-green-950 dark:border-green-700';
      case 'in_progress':
        return 'bg-yellow-100 border-yellow-500 dark:bg-yellow-950 dark:border-yellow-700';
      case 'blocked':
        return 'bg-red-100 border-red-500 dark:bg-red-950 dark:border-red-700';
      case 'skipped':
        return 'bg-gray-100 border-gray-500 dark:bg-gray-950 dark:border-gray-700';
      default:
        return 'bg-muted border-muted-foreground/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Overall Progress</span>
          <span className="text-muted-foreground">
            {completedPhases} of {totalPhases} phases complete ({progressPercentage}%)
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Phase timeline */}
      <div className="space-y-3">
        {sortedPhases.map((phase, index) => {
          const progress = progressMap.get(phase.id);
          const status = progress?.status || 'not_started';
          const isClickable = !!onPhaseClick;

          return (
            <Card
              key={phase.id}
              className={`p-4 border-2 transition-all ${getPhaseColor(status)} ${
                isClickable ? 'cursor-pointer hover:shadow-md' : ''
              }`}
              onClick={isClickable ? () => onPhaseClick(phase.id) : undefined}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">{getPhaseIcon(status)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-muted-foreground">
                      Phase {index + 1} of {totalPhases}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {PHASE_PROGRESS_ICONS[status]} {status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <h4 className="font-semibold text-base mb-1">{phase.phase_name}</h4>

                  {phase.phase_description && (
                    <p className="text-sm text-muted-foreground mb-2">{phase.phase_description}</p>
                  )}

                  {progress?.blocked_reason && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded text-sm">
                      <span className="font-medium text-red-900 dark:text-red-100">Blocked: </span>
                      <span className="text-red-800 dark:text-red-200">{progress.blocked_reason}</span>
                    </div>
                  )}

                  {progress?.notes && !progress.blocked_reason && (
                    <p className="mt-2 text-sm text-muted-foreground italic">{progress.notes}</p>
                  )}

                  {progress?.started_at && (
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
