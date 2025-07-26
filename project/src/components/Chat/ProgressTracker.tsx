import React from "react";
import { CheckCircle, Circle } from "lucide-react";

interface ProgressTrackerProps {
  current: number;
  total: number;
  stepName?: string;
  flow?: "subject" | "schedule" | "feedback" | "optimal_subject" | null;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  current,
  total,
  stepName,
  flow,
}) => {
  if (!flow || total <= 1) return null;

  const progress = (current / total) * 100;

  // Flow-specific step names
  const flowSteps: Record<string, string[]> = {
    subject: [
      "Subject Name",
      "Description",
      "Difficulty",
      "Category",
      "Estimated Hours",
      "Priority",
      "Deadline",
      "Tags",
    ],
    schedule: [
      "Schedule Name",
      "Select Subjects",
      "Date Range",
      "Daily Hours",
      "Session Duration",
      "Preferred Times",
    ],
    feedback: ["Focus Score", "Stress Level", "Completion"],
    optimal_subject: ["Preferences", "Recommendation"],
  };

  const steps = flowSteps[flow] || [];
  const currentStepName = stepName || steps[current - 1] || `Step ${current}`;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
          {flow} Creation Progress
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {current} of {total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
        <div
          className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current step */}
      <div className="text-center">
        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
          {currentStepName}
        </p>
      </div>

      {/* Step indicators for smaller flows */}
      {total <= 8 && (
        <div className="flex justify-center mt-3 space-x-2">
          {Array.from({ length: total }, (_, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < current;
            const isCurrent = stepNumber === current;

            return (
              <div
                key={stepNumber}
                className={`
                  flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                  transition-all duration-200
                  ${
                    isCompleted
                      ? "bg-indigo-500 text-white"
                      : isCurrent
                      ? "bg-purple-500 text-white ring-2 ring-purple-300"
                      : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                  }
                `}
                title={steps[index] || `Step ${stepNumber}`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <span>{stepNumber}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Step list for larger flows */}
      {total > 8 && (
        <div className="mt-3 space-y-1">
          {steps
            .slice(Math.max(0, current - 3), current + 2)
            .map((step, index) => {
              const actualStepNumber = Math.max(0, current - 3) + index + 1;
              const isCompleted = actualStepNumber < current;
              const isCurrent = actualStepNumber === current;

              return (
                <div
                  key={actualStepNumber}
                  className={`
                  flex items-center gap-2 text-xs
                  ${
                    isCompleted
                      ? "text-indigo-600 dark:text-indigo-400"
                      : isCurrent
                      ? "text-purple-600 dark:text-purple-400 font-medium"
                      : "text-gray-500 dark:text-gray-400"
                  }
                `}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <Circle className="w-3 h-3" />
                  )}
                  <span>
                    {actualStepNumber}. {step}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;
