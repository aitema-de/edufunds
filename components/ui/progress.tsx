import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "orange" | "cyan" | "purple" | "green";
  animated?: boolean;
}

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const variantClasses = {
  default: "bg-orange-500",
  orange: "bg-orange-500",
  cyan: "bg-cyan-400",
  purple: "bg-purple-400",
  green: "bg-green-400",
};

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ 
    className, 
    value, 
    max = 100, 
    showLabel = false,
    size = "md", 
    variant = "default",
    animated = true,
    ...props 
  }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    
    return (
      <div
        ref={ref}
        className={cn("w-full space-y-2", className)}
        {...props}
      >
        <div
          className={cn(
            "w-full bg-slate-700/50 rounded-full overflow-hidden",
            sizeClasses[size]
          )}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              variantClasses[variant],
              animated && percentage < 100 && "animate-pulse"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <div className="flex justify-between text-xs text-slate-400">
            <span>{Math.round(percentage)}%</span>
            <span>{value} von {max}</span>
          </div>
        )}
      </div>
    );
  }
);
ProgressBar.displayName = "ProgressBar";

interface StepProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  variant?: "default" | "orange" | "cyan" | "purple" | "green";
}

const StepProgress = React.forwardRef<HTMLDivElement, StepProgressProps>(
  ({ 
    className, 
    currentStep, 
    totalSteps, 
    stepLabels,
    variant = "default",
    ...props 
  }, ref) => {
    const variants = {
      default: {
        active: "bg-orange-500 text-white",
        completed: "bg-green-500 text-white",
        pending: "bg-slate-700 text-slate-400",
        connector: "bg-slate-700",
        connectorActive: "bg-orange-500",
      },
      orange: {
        active: "bg-orange-500 text-white",
        completed: "bg-orange-400 text-white",
        pending: "bg-slate-700 text-slate-400",
        connector: "bg-slate-700",
        connectorActive: "bg-orange-500",
      },
      cyan: {
        active: "bg-cyan-500 text-white",
        completed: "bg-cyan-400 text-white",
        pending: "bg-slate-700 text-slate-400",
        connector: "bg-slate-700",
        connectorActive: "bg-cyan-500",
      },
      purple: {
        active: "bg-purple-500 text-white",
        completed: "bg-purple-400 text-white",
        pending: "bg-slate-700 text-slate-400",
        connector: "bg-slate-700",
        connectorActive: "bg-purple-500",
      },
      green: {
        active: "bg-green-500 text-white",
        completed: "bg-green-400 text-white",
        pending: "bg-slate-700 text-slate-400",
        connector: "bg-slate-700",
        connectorActive: "bg-green-500",
      },
    };

    const styles = variants[variant];
    
    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        {...props}
      >
        <div className="flex items-center justify-between">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const step = index + 1;
            const isActive = step === currentStep;
            const isCompleted = step < currentStep;
            const isPending = step > currentStep;
            
            return (
              <React.Fragment key={step}>
                {/* Step Circle */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                      isActive && styles.active,
                      isCompleted && styles.completed,
                      isPending && styles.pending
                    )}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step
                    )}
                  </div>
                  {stepLabels && stepLabels[index] && (
                    <span className={cn(
                      "text-xs hidden md:block",
                      isActive && "text-slate-200",
                      isCompleted && "text-slate-400",
                      isPending && "text-slate-500"
                    )}>
                      {stepLabels[index]}
                    </span>
                  )}
                </div>
                
                {/* Connector */}
                {step < totalSteps && (
                  <div className="flex-1 h-0.5 mx-2">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isCompleted ? styles.connectorActive : styles.connector
                      )}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }
);
StepProgress.displayName = "StepProgress";

interface LoadingProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  loaded: number;
  total: number;
  label?: string;
  itemName?: string;
}

const LoadingProgress = React.forwardRef<HTMLDivElement, LoadingProgressProps>(
  ({ 
    className, 
    loaded, 
    total, 
    label = "Wird geladen...",
    itemName = "Programme",
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "glass rounded-2xl p-8 text-center space-y-6",
          className
        )}
        {...props}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse" />
            <div className="relative w-16 h-16 rounded-full border-4 border-slate-700 border-t-orange-500 animate-spin" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-200 mb-1">
              {label}
            </h3>
            <p className="text-sm text-slate-400">
              {loaded} von {total} {itemName} geladen
            </p>
          </div>
        </div>
        <ProgressBar 
          value={loaded} 
          max={total} 
          showLabel 
          variant="orange"
        />
      </div>
    );
  }
);
LoadingProgress.displayName = "LoadingProgress";

export { ProgressBar, StepProgress, LoadingProgress, ProgressBar as Progress };
export type { ProgressBarProps, StepProgressProps, LoadingProgressProps };
