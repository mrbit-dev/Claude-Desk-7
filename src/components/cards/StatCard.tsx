import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}

export function StatCard({ icon: Icon, label, value, subtext, trend, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'card-hover flex items-start gap-4 rounded-xl border border-claude-800 bg-claude-900 p-5 text-left',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="rounded-lg bg-accent/10 p-2.5">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-100">{value}</p>
        {subtext && (
          <p className="mt-0.5 text-xs text-gray-500">{subtext}</p>
        )}
      </div>
      {trend && (
        <span
          className={clsx(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            trend === 'up' && 'bg-green-500/10 text-green-400',
            trend === 'down' && 'bg-red-500/10 text-red-400',
            trend === 'neutral' && 'bg-gray-500/10 text-gray-400'
          )}
        >
          {trend === 'up' && '↑'}
          {trend === 'down' && '↓'}
          {trend === 'neutral' && '→'}
        </span>
      )}
    </button>
  );
}
