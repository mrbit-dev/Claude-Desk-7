import { useEffect, useState, useRef } from 'react';
import { Bot, Layers, Zap, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import clsx from 'clsx';

interface AgentFlowCardProps {
  name: string;
  kind: string;
  status: 'running' | 'completed' | 'error' | 'pending';
  description?: string;
  source?: string;
  progress?: number; // 0-100
  isMain?: boolean;
  children?: React.ReactNode;
  onExpand?: () => void;
}

/**
 * Agent Flow Card — hiển thị agent với hiệu ứng glow, progress, animation
 */
export function AgentFlowCard({
  name, kind, status, description, source, progress = 0, isMain = false, children, onExpand,
}: AgentFlowCardProps) {
  const [glowIntensity, setGlowIntensity] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Glow pulse animation khi đang chạy
  useEffect(() => {
    if (status !== 'running') {
      setGlowIntensity(0);
      return;
    }
    const interval = setInterval(() => {
      setGlowIntensity(prev => (prev + 0.05) % 1);
    }, 100);
    return () => clearInterval(interval);
  }, [status]);

  const glowOpacity = 0.15 + glowIntensity * 0.25;
  const glowColor = status === 'running' ? 'rgba(168, 130, 255, ' :
                    status === 'completed' ? 'rgba(74, 222, 128, ' :
                    status === 'error' ? 'rgba(248, 113, 113, ' : 'rgba(100, 100, 120, ';

  const statusIcon = {
    running: <Loader2 className="h-4 w-4 animate-spin text-accent" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-400" />,
    error: <XCircle className="h-4 w-4 text-red-400" />,
    pending: <div className="h-4 w-4 rounded-full border-2 border-dashed border-gray-600" />,
  }[status];

  return (
    <div className="relative group">
      {/* Glow effect */}
      <div
        className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm pointer-events-none"
        style={{
          background: status === 'running'
            ? 'linear-gradient(135deg, rgba(168,130,255,0.3), rgba(99,102,241,0.3))'
            : 'none',
        }}
      />

      {/* Main card */}
      <div
        ref={cardRef}
        className={clsx(
          'relative rounded-xl border transition-all duration-300',
          'backdrop-blur-sm',
          isMain
            ? 'border-accent/30 bg-claude-900/90 p-5'
            : 'border-claude-700/50 bg-claude-900/70 p-4 ml-6',
          status === 'running' && 'shadow-[0_0_15px_rgba(168,130,255,0.15)]',
          status === 'completed' && 'shadow-[0_0_10px_rgba(74,222,128,0.1)]',
        )}
        style={{
          boxShadow: status === 'running'
            ? `0 0 ${15 + glowIntensity * 10}px ${glowColor}${glowOpacity})`
            : undefined,
        }}
      >
        {/* Inner glow overlay */}
        {status === 'running' && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, ${glowColor}${glowOpacity * 0.5}) 0%, transparent 70%)`,
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon container with glow */}
              <div className={clsx(
                'relative rounded-xl p-2.5 flex-shrink-0 transition-all duration-300',
                isMain ? 'bg-gradient-to-br from-accent/20 to-purple-500/20' : 'bg-claude-800/80',
                status === 'running' && 'ring-1 ring-accent/30',
              )}>
                {isMain
                  ? <Bot className="h-5 w-5 text-accent" />
                  : <Layers className="h-4 w-4 text-accent/80" />
                }
                {/* Pulse dot */}
                {status === 'running' && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5">
                    <span className="animate-ping absolute inset-0 rounded-full bg-accent/60" />
                    <span className="rounded-full bg-accent h-2.5 w-2.5 block" />
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={clsx(
                    'font-semibold truncate',
                    isMain ? 'text-gray-100 text-base' : 'text-gray-200 text-sm',
                  )}>
                    {name}
                  </span>
                  <span className={clsx(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded',
                    isMain ? 'bg-accent/15 text-accent' : 'bg-claude-800 text-gray-500',
                  )}>
                    {isMain ? 'MAIN' : 'SUB'}
                  </span>
                  <span className="text-[10px] text-gray-600 bg-claude-800/50 px-1.5 py-0.5 rounded font-mono">
                    {kind}
                  </span>
                  {source && (
                    <span className="text-[10px] text-gray-600 bg-claude-800/30 px-2 py-0.5 rounded">
                      {source}
                    </span>
                  )}
                </div>

                {/* Current activity with streaming effect */}
                {description && (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <Zap className={clsx(
                      'h-3 w-3 mt-0.5 flex-shrink-0',
                      status === 'running' ? 'text-accent animate-pulse' : 'text-gray-600',
                    )} />
                    <p className={clsx(
                      'text-xs leading-relaxed line-clamp-2',
                      status === 'running' ? 'text-gray-300' : 'text-gray-500',
                    )}>
                      {description}
                      {status === 'running' && <span className="inline-block w-1 h-3 bg-accent ml-0.5 animate-pulse" />}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex-shrink-0">
              {statusIcon}
            </div>
          </div>

          {/* Progress bar */}
          {status === 'running' && (
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-claude-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent via-purple-400 to-accent transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(progress || 50, 100)}%`,
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s linear infinite',
                    }}
                  />
                </div>
                <span className={clsx(
                  'text-[10px] font-mono font-medium',
                  progress >= 100 ? 'text-green-400' : 'text-accent',
                )}>
                  {Math.min(progress || 50, 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Sub agents */}
          {children && (
            <div className="mt-3 space-y-2">
              {children}
            </div>
          )}
        </div>
      </div>

      {/* Connector line for sub-agents */}
      {!isMain && (
        <div className="absolute left-[-1.5rem] top-1/2 w-[1.5rem] h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      )}
    </div>
  );
}

/**
 * Agent Flow Container — bọc toàn bộ agent tree với hiệu ứng
 */
export function AgentFlowContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative space-y-2">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-accent/5 blur-[80px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-1/3 h-24 bg-purple-500/5 blur-[60px] rounded-full" />
      </div>
      {children}
    </div>
  );
}
