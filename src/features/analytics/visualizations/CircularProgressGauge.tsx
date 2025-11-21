import { cn } from '@/lib/utils';

interface CircularProgressGaugeProps {
  percentage: number; // 0-100
  size?: number; // Diameter in pixels
  strokeWidth?: number;
  showLabel?: boolean;
  label?: string;
  className?: string;
  color?: 'green' | 'yellow' | 'red' | 'blue';
}

export function CircularProgressGauge({
  percentage,
  size = 200,
  strokeWidth = 12,
  showLabel = true,
  label,
  className,
  color = 'blue',
}: CircularProgressGaugeProps) {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedPercentage / 100) * circumference;

  // Color mapping
  const colorClasses = {
    green: 'stroke-green-600 dark:stroke-green-400',
    yellow: 'stroke-yellow-600 dark:stroke-yellow-400',
    red: 'stroke-red-600 dark:stroke-red-400',
    blue: 'stroke-blue-600 dark:stroke-blue-400',
  };

  const fillColorClasses = {
    green: 'fill-green-600 dark:fill-green-400',
    yellow: 'fill-yellow-600 dark:fill-yellow-400',
    red: 'fill-red-600 dark:fill-red-400',
    blue: 'fill-blue-600 dark:fill-blue-400',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/20"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-1000 ease-out', colorClasses[color])}
        />
      </svg>

      {/* Center label */}
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-4xl font-bold tabular-nums', fillColorClasses[color])}>
            {Math.round(clampedPercentage)}%
          </span>
          {label && (
            <span className="text-xs text-muted-foreground mt-1 text-center max-w-[80%]">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
