import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/services/base/supabase';

interface PipelinePhase {
  id: string;
  phase_name: string;
  phase_order: number;
  template_id: string;
  is_active: boolean;
}

interface PipelineTemplate {
  id: string;
  name: string;
  phases: PipelinePhase[];
}

export function usePipelinePhases() {
  return useQuery({
    queryKey: ['pipeline-phases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_templates')
        .select(`
          id,
          name,
          pipeline_phases (
            id,
            phase_name,
            phase_order,
            template_id,
            is_active
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return (data || []).map(template => ({
        id: template.id,
        name: template.name,
        phases: (template.pipeline_phases || [])
          .filter((p: PipelinePhase) => p.is_active)
          .sort((a: PipelinePhase, b: PipelinePhase) => a.phase_order - b.phase_order)
      })) as PipelineTemplate[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export interface PipelinePhaseOption {
  value: string;
  label: string;
  templateId: string;
  templateName: string;
  phaseName: string;
  order: number;
}

export function usePipelinePhaseOptions() {
  const { data: templates = [], isLoading, error } = usePipelinePhases();

  // Flatten to simple options for multi-select
  const options: PipelinePhaseOption[] = templates.flatMap(template =>
    template.phases.map(phase => ({
      value: phase.id,
      label: `${template.name} > ${phase.phase_name}`,
      templateId: template.id,
      templateName: template.name,
      phaseName: phase.phase_name,
      order: phase.phase_order
    }))
  );

  return { options, isLoading, error };
}
