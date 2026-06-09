"use client";

import { useState, useEffect, ReactNode } from "react";
import { ProgrammCardSkeleton } from "@/components/skeletons/ProgrammCardSkeleton";
import { LoadingProgress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";

interface AsyncDataLoaderProps<T> {
  children: (data: T) => ReactNode;
  loadData: () => Promise<T>;
  fallback?: ReactNode;
  loadingText?: string;
  itemName?: string;
  skeletonCount?: number;
  useSkeleton?: boolean;
}

function AsyncDataLoader<T>({
  children,
  loadData,
  fallback,
  loadingText = "Daten werden geladen...",
  itemName = "Einträge",
  skeletonCount = 3,
  useSkeleton = true,
}: AsyncDataLoaderProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Simulate progress
        const progressInterval = setInterval(() => {
          if (isMounted) {
            setProgress((prev) => ({
              loaded: Math.min(prev.loaded + 1, prev.total || skeletonCount),
              total: prev.total || skeletonCount,
            }));
          }
        }, 300);

        const result = await loadData();
        
        clearInterval(progressInterval);
        
        if (isMounted) {
          setData(result);
          setProgress({ loaded: skeletonCount, total: skeletonCount });
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [loadData, skeletonCount]);

  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (useSkeleton) {
      return (
        <div className="space-y-6">
          <ProgrammCardSkeleton count={skeletonCount} />
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <LoadingProgress
          loaded={progress.loaded}
          total={progress.total}
          label={loadingText}
          itemName={itemName}
        />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 text-center space-y-2">
              <div className="h-8 bg-slate-700/50 rounded animate-pulse mx-auto w-16" />
              <div className="h-3 bg-slate-700/50 rounded animate-pulse mx-auto w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-300 mb-2">
          Fehler beim Laden
        </h3>
        <p className="text-slate-500 mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Erneut versuchen
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <LoadingSpinner size="lg" variant="orange" centered />
        <p className="text-slate-400 mt-4">Keine Daten verfügbar</p>
      </div>
    );
  }

  return <>{children(data)}</>;
}

export { AsyncDataLoader };
export type { AsyncDataLoaderProps };
