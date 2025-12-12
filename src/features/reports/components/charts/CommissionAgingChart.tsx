// src/features/reports/components/charts/CommissionAgingChart.tsx

import {ResponsiveBar} from '@nivo/bar';

interface AgingData {
  bucket: string;
  atRisk: number;
  earned: number;
  riskLevel: string;
}

interface CommissionAgingChartProps {
  data: AgingData[];
  height?: number;
  onBarClick?: (bucket: string) => void;
}

const _riskColors: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#22c55e',
  Unknown: '#6b7280',
};

export function CommissionAgingChart({ data, height = 200, onBarClick }: CommissionAgingChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">
        No aging data available
      </div>
    );
  }

  const chartData = data.map(d => ({
    bucket: d.bucket,
    'At Risk': d.atRisk,
    'Earned': d.earned,
    riskLevel: d.riskLevel,
  }));

  return (
    <div style={{ height }}>
      <ResponsiveBar
        data={chartData}
        keys={['At Risk', 'Earned']}
        indexBy="bucket"
        margin={{ top: 10, right: 80, bottom: 40, left: 60 }}
        padding={0.3}
        groupMode="grouped"
        colors={({ id }) => id === 'At Risk' ? '#ef4444' : '#22c55e'}
        borderRadius={2}
        axisBottom={{
          tickSize: 0,
          tickPadding: 5,
          tickRotation: 0,
          legend: '',
          legendPosition: 'middle',
          legendOffset: 32,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 5,
          tickRotation: 0,
          legend: '',
          legendPosition: 'middle',
          legendOffset: -40,
          format: (v) => `$${(Number(v) / 1000).toFixed(0)}k`,
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor="#ffffff"
        label={(d) => `$${(Number(d.value) / 1000).toFixed(1)}k`}
        legends={[
          {
            dataFrom: 'keys',
            anchor: 'bottom-right',
            direction: 'column',
            translateX: 80,
            translateY: 0,
            itemsSpacing: 2,
            itemWidth: 70,
            itemHeight: 20,
            symbolSize: 10,
            symbolShape: 'circle',
          }
        ]}
        theme={{
          text: { fontSize: 10, fill: '#6b7280' },
          axis: {
            ticks: { text: { fontSize: 9, fill: '#6b7280' } },
          },
          grid: { line: { stroke: '#e5e7eb', strokeWidth: 1 } },
          legends: { text: { fontSize: 9, fill: '#6b7280' } },
        }}
        animate={false}
        onClick={(datum) => {
          if (onBarClick && datum.indexValue) {
            onBarClick(String(datum.indexValue));
          }
        }}
        onMouseEnter={(_datum, event) => {
          if (onBarClick) {
            (event.target as SVGElement).style.cursor = 'pointer';
          }
        }}
      />
    </div>
  );
}
