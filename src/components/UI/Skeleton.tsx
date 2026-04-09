import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

function SkeletonBox({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ className = '' }: SkeletonProps) {
  return <SkeletonBox className={`h-4 ${className}`} />;
}

export function SkeletonHeading({ className = '' }: SkeletonProps) {
  return <SkeletonBox className={`h-6 ${className}`} />;
}

export function SkeletonAvatar({ className = '' }: SkeletonProps) {
  return <SkeletonBox className={`rounded-full ${className}`} />;
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-lg bg-white p-4 ${className}`}>
      <SkeletonBox className="mb-4 h-40 w-full rounded-md" />
      <SkeletonHeading className="mb-2 w-3/4" />
      <SkeletonText className="mb-2 w-1/2" />
      <SkeletonText className="w-2/3" />
    </div>
  );
}

export function SkeletonButton({ className = '' }: SkeletonProps) {
  return <SkeletonBox className={`h-10 w-24 rounded-md ${className}`} />;
}

export function SkeletonInput({ className = '' }: SkeletonProps) {
  return <SkeletonBox className={`h-10 w-full rounded-md ${className}`} />;
}

export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <SkeletonBox className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <table className="w-full">
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} columns={columns} />
        ))}
      </tbody>
    </table>
  );
}

export function SkeletonList({ count = 3, type = 'card' }: { count?: number; type?: 'card' | 'text' | 'avatar' }) {
  const renderSkeleton = (index: number) => {
    switch (type) {
      case 'card':
        return <SkeletonCard key={index} />;
      case 'text':
        return <SkeletonText key={index} className="mb-2" />;
      case 'avatar':
        return <SkeletonAvatar key={index} className="h-12 w-12" />;
      default:
        return <SkeletonBox key={index} className="h-10 w-full" />;
    }
  };

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => renderSkeleton(i))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg bg-white p-6 shadow">
          <SkeletonBox className="mx-auto h-8 w-8 rounded-full" />
          <SkeletonHeading className="mt-4 w-3/4 mx-auto" />
          <SkeletonText className="mt-2 w-1/2 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonInlineList({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`flex gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBox key={i} className="h-12 w-12 flex-shrink-0 rounded-full" />
      ))}
    </div>
  );
}

interface DataLoaderProps {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function DataLoader({
  loading,
  error,
  onRetry,
  children,
  fallback = <SkeletonCard />,
}: DataLoaderProps) {
  if (loading) {
    return <div aria-label="Carregando...">{fallback}</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 text-red-600">
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <p className="mb-4 text-gray-700">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
