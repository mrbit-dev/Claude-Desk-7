import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
}

/**
 * Skeleton loading placeholder — hiển thị khung xám nhấp nháy trong lúc chờ dữ liệu
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-md bg-claude-800',
        className
      )}
    />
  );
}

/**
 * Skeleton cho StatCard
 */
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-claude-800 bg-claude-900 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton cho SessionCard
 */
export function SessionCardSkeleton() {
  return (
    <div className="rounded-xl border border-claude-800 bg-claude-900 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-2" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="mt-2 h-4 w-16 rounded" />
    </div>
  );
}

/**
 * Skeleton cho Agent card (Tree View)
 */
export function AgentCardSkeleton() {
  return (
    <div className="rounded-xl border border-claude-800 bg-claude-900 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

/**
 * Skeleton cho MCPServer card
 */
export function MCPServerCardSkeleton() {
  return (
    <div className="rounded-xl border border-claude-800 bg-claude-900 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-3 w-3 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-7 w-24 rounded-lg" />
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton cho Project card
 */
export function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border border-claude-800 bg-claude-900 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-10 rounded" />
        <Skeleton className="h-10 rounded" />
        <Skeleton className="h-10 rounded" />
      </div>
    </div>
  );
}

/**
 * Skeleton cho Skill/Plugin card
 */
export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-claude-800 bg-claude-900 p-4 space-y-2">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </div>
  );
}
