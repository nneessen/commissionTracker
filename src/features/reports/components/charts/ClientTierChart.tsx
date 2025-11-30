// src/features/reports/components/charts/ClientTierChart.tsx

import { ResponsivePie } from '@nivo/pie';

interface TierData {
  tier: string;
  count: number;
}

interface ClientTierChartProps {
  data: TierData[];
  height?: number;
}

const tierColors: Record<string, string> = {
  'A': '#22c55e',
  'B': '#3b82f6',
  'C': '#eab308',
  'D': '#6b7280',
};

export function ClientTierChart({ data, height = 180 }: ClientTierChartProps) {
  if (!data || data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <div className="h-[180px] flex items-center justify-center text-muted-foreground text-xs">
        No client tier data available
      </div>
    );
  }

  const chartData = data
    .filter(d => d.count > 0)
    .map(d => ({
      id: `Tier ${d.tier}`,
      label: `Tier ${d.tier}`,
      value: d.count,
      color: tierColors[d.tier] || '#6b7280',
    }));

  return (
    <div style={{ height }}>
      <ResponsivePie
        data={chartData}
        margin={{ top: 10, right: 80, bottom: 10, left: 10 }}
        innerRadius={0.5}
        padAngle={1}
        cornerRadius={3}
        colors={{ datum: 'data.color' }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        enableArcLinkLabels={false}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor="#ffffff"
        arcLabel={(d) => `${d.value}`}
        legends={[
          {
            anchor: 'right',
            direction: 'column',
            translateX: 70,
            translateY: 0,
            itemsSpacing: 4,
            itemWidth: 60,
            itemHeight: 18,
            symbolSize: 10,
            symbolShape: 'circle',
          }
        ]}
        theme={{
          text: { fontSize: 10, fill: '#6b7280' },
          legends: { text: { fontSize: 9, fill: '#6b7280' } },
        }}
        animate={false}
      />
    </div>
  );
}
