import React from "react";
import {
  Calendar,
  Clock,
  Target,
  Play,
  Pause,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { ScheduleBlock } from "../../types";

interface ScheduleBlockComponentProps {
  block: ScheduleBlock;
  onStatusUpdate: (
    blockId: string,
    status: "scheduled" | "in-progress" | "completed" | "missed"
  ) => void;
}

const ScheduleBlockComponent: React.FC<ScheduleBlockComponentProps> =
  React.memo(({ block, onStatusUpdate }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case "completed":
          return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
        case "in-progress":
          return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
        case "missed":
          return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
        case "scheduled":
          return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
        default:
          return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      }
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="p-6">
          {/* Session Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {block.subjectName}
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    block.status
                  )}`}
                >
                  {block.status}
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  <Target className="h-3 w-3 inline mr-1" />
                  Score: {block.priority_score}
                </span>
              </div>
            </div>
          </div>

          {/* Session Details */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4 mr-2" />
              {new Date(block.date).toLocaleDateString()}
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4 mr-2" />
              {block.startTime} - {block.endTime} ({block.duration} min)
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {block.status === "scheduled" && (
              <>
                <button
                  onClick={() => onStatusUpdate(block._id, "in-progress")}
                  className="flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </button>
                <button
                  onClick={() => onStatusUpdate(block._id, "missed")}
                  className="flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Miss
                </button>
              </>
            )}
            {block.status === "in-progress" && (
              <>
                <button
                  onClick={() => onStatusUpdate(block._id, "completed")}
                  className="flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Complete
                </button>
                <button
                  onClick={() => onStatusUpdate(block._id, "scheduled")}
                  className="flex items-center justify-center px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </button>
              </>
            )}
            {(block.status === "completed" || block.status === "missed") && (
              <button
                onClick={() => onStatusUpdate(block._id, "scheduled")}
                className="col-span-2 flex items-center justify-center px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reschedule
              </button>
            )}
          </div>
        </div>
      </div>
    );
  });

ScheduleBlockComponent.displayName = "ScheduleBlockComponent";

export default ScheduleBlockComponent;
