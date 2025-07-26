import React from "react";

const LoadingSkeleton: React.FC = () => {
  return (
    <div className="flex justify-start mb-4 animate-pulse">
      <div className="flex max-w-[80%]">
        {/* Avatar skeleton */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 mr-3" />

        {/* Message content skeleton */}
        <div className="flex flex-col space-y-2">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg rounded-bl-none px-4 py-2">
            <div className="space-y-2">
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-32" />
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24" />
            </div>
          </div>

          {/* Timestamp skeleton */}
          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-16" />
        </div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;
