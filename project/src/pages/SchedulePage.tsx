import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Edit3,
  Check,
  X,
  Filter,
  Search,
  Play,
  Pause,
  RotateCcw,
  Star,
  Target,
  Trash2,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Schedule, ScheduleBlock, Subject } from "../types";
import { toast } from "react-toastify";
import { apiService } from "../services/api";

const SchedulePage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [filterCompletion, setFilterCompletion] = useState<string>("active"); // New filter for completed schedules
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch schedules and subjects
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch schedules
        const schedulesResponse = await fetch(
          "http://localhost:5000/api/schedules",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Fetch subjects for manual schedule creation
        const subjectsResponse = await fetch(
          "http://localhost:5000/api/subjects",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!schedulesResponse.ok || !subjectsResponse.ok) {
          throw new Error("Failed to fetch data");
        }

        const schedulesData = await schedulesResponse.json();
        const subjectsData = await subjectsResponse.json();

        console.log("📅 Schedules response:", schedulesData);
        console.log("📚 Subjects response:", subjectsData);

        // Handle the response format from backend
        const schedules = schedulesData.schedules || schedulesData;
        const subjects = subjectsData.subjects || subjectsData;

        // Fetch real-time schedule sessions for each schedule
        const schedulesWithSessions = await Promise.all(
          schedules.map(async (schedule: Schedule) => {
            try {
              const sessionsResponse = await fetch(
                `http://localhost:5000/api/schedule-sessions?scheduleId=${schedule._id}`,
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              if (sessionsResponse.ok) {
                const sessionsData = await sessionsResponse.json();
                console.log(
                  `📊 Sessions for ${schedule.name}:`,
                  sessionsData.sessions?.length || 0
                );

                // Replace blocks with real-time sessions
                return {
                  ...schedule,
                  blocks: sessionsData.sessions || schedule.blocks || [],
                };
              } else {
                console.warn(
                  `Failed to fetch sessions for schedule ${schedule._id}, using existing blocks`
                );
                return schedule;
              }
            } catch (error) {
              console.warn(
                `Error fetching sessions for schedule ${schedule._id}:`,
                error
              );
              return schedule;
            }
          })
        );

        setSchedules(schedulesWithSessions);
        setSubjects(subjects);

        if (schedulesWithSessions.length > 0) {
          setSelectedSchedule(schedulesWithSessions[0]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load schedule data");

        // Mock data for development
        const mockSchedules: Schedule[] = [
          {
            _id: "1",
            id: "1",
            userId: user?._id || "",
            name: "AI-Generated Weekly Study Plan",
            start_date: "2025-07-26",
            end_date: "2025-08-02",
            daily_hours: 6,
            created_by: "chatbot",
            created_date: "2025-07-26",
            blocks: [
              {
                _id: "1",
                id: "1",
                subjectId: "1",
                subjectName: "Advanced Mathematics",
                time: "09:00",
                duration: 120,
                priority_score: 8.5,
                status: "completed",
                date: "2025-07-26",
                startTime: "09:00",
                endTime: "11:00",
                sessionType: "study",
              },
              {
                _id: "2",
                id: "2",
                subjectId: "2",
                subjectName: "Physics Mechanics",
                time: "14:00",
                duration: 90,
                priority_score: 7.2,
                status: "scheduled",
                date: "2025-07-26",
                startTime: "14:00",
                endTime: "15:30",
                sessionType: "study",
              },
            ],
          },
        ];

        const mockSubjects: Subject[] = [
          {
            _id: "1",
            id: "1",
            name: "Advanced Mathematics",
            description: "Calculus and algebra",
            difficulty: "hard",
            priority: "high",
            estimated_hours: 120,
            progress: 65,
            category: "Science",
            tags: ["calculus"],
            created_date: "2025-01-15",
            created_by: "chatbot",
            userId: user?._id || "",
            isCompleted: false,
            estimatedHours: 120,
          },
        ];

        setSchedules(mockSchedules);
        setSubjects(mockSubjects);
        setSelectedSchedule(mockSchedules[0]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?._id]);

  // Function to refresh schedule sessions for real-time updates
  const refreshScheduleSessions = async (scheduleId?: string) => {
    try {
      if (scheduleId) {
        // Refresh sessions for a specific schedule
        const sessionsResponse = await fetch(
          `http://localhost:5000/api/schedule-sessions?scheduleId=${scheduleId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();

          // Update the specific schedule with new sessions
          setSchedules((prev) =>
            prev.map((schedule) =>
              schedule._id === scheduleId
                ? {
                    ...schedule,
                    blocks: sessionsData.sessions || schedule.blocks || [],
                  }
                : schedule
            )
          );

          // Update selected schedule if it's the one being refreshed
          if (selectedSchedule?._id === scheduleId) {
            setSelectedSchedule((prev) =>
              prev
                ? {
                    ...prev,
                    blocks: sessionsData.sessions || prev.blocks || [],
                  }
                : null
            );
          }

          console.log(`🔄 Refreshed sessions for schedule ${scheduleId}`);
        }
      } else {
        // Refresh all schedules
        const schedulesWithSessions = await Promise.all(
          schedules.map(async (schedule: Schedule) => {
            try {
              const sessionsResponse = await fetch(
                `http://localhost:5000/api/schedule-sessions?scheduleId=${schedule._id}`,
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              if (sessionsResponse.ok) {
                const sessionsData = await sessionsResponse.json();
                return {
                  ...schedule,
                  blocks: sessionsData.sessions || schedule.blocks || [],
                };
              }
              return schedule;
            } catch (error) {
              console.warn(
                `Error refreshing sessions for schedule ${schedule._id}:`,
                error
              );
              return schedule;
            }
          })
        );

        setSchedules(schedulesWithSessions);

        // Update selected schedule if needed
        if (selectedSchedule) {
          const updatedSelected = schedulesWithSessions.find(
            (s) => s._id === selectedSchedule._id
          );
          if (updatedSelected) {
            setSelectedSchedule(updatedSelected);
          }
        }

        console.log("🔄 Refreshed all schedule sessions");
      }
    } catch (error) {
      console.error("Error refreshing schedule sessions:", error);
    }
  };

  // Listen for subject completion events to refresh sessions
  useEffect(() => {
    const handleSubjectCompletion = () => {
      console.log(
        "📡 Subject completion event received, refreshing sessions..."
      );
      refreshScheduleSessions();
    };

    // Add event listener for subject completion
    window.addEventListener("subject-completed", handleSubjectCompletion);

    return () => {
      window.removeEventListener("subject-completed", handleSubjectCompletion);
    };
  }, [schedules, selectedSchedule]);

  // Helper function to check if a subject is completed
  const isSubjectCompleted = (
    subjectId: string | { _id: string; name: string }
  ) => {
    const id = typeof subjectId === "string" ? subjectId : subjectId._id;
    const subject = subjects.find((s) => s._id === id);
    return subject?.isCompleted || (subject?.progress || 0) >= 100;
  };

  // Helper function to get subject completion styling
  const getCompletionCardClasses = (block: ScheduleBlock) => {
    const subjectId =
      typeof block.subjectId === "string"
        ? block.subjectId
        : block.subjectId._id;
    const isCompleted = isSubjectCompleted(subjectId);

    if (isCompleted) {
      return "bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-600 rounded-lg shadow-md mb-4 opacity-75 transition-all duration-300";
    }

    return "bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4 transition-all duration-300";
  };

  const updateSessionStatus = async (
    blockId: string,
    newStatus: "scheduled" | "in-progress" | "completed" | "missed"
  ) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/schedule-sessions/${blockId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update session status");
      }

      // Update local state
      setSchedules((prev) =>
        prev.map((schedule) => ({
          ...schedule,
          blocks:
            schedule.blocks?.map((block) =>
              block._id === blockId ? { ...block, status: newStatus } : block
            ) || [],
        }))
      );

      if (selectedSchedule) {
        setSelectedSchedule((prev) =>
          prev
            ? {
                ...prev,
                blocks:
                  prev.blocks?.map((block) =>
                    block._id === blockId
                      ? { ...block, status: newStatus }
                      : block
                  ) || [],
              }
            : null
        );
      }

      toast.success(`Session marked as ${newStatus}`);

      // Trigger analytics refresh when session is completed
      if (newStatus === "completed") {
        window.dispatchEvent(new CustomEvent("analytics-refresh"));
      }
    } catch (error) {
      console.error("Error updating session status:", error);
      toast.error("Failed to update session status");
    }
  };

  const handleDeleteSchedule = async (
    scheduleId: string,
    scheduleName: string
  ) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${scheduleName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await apiService.deleteSchedule(scheduleId);

      // Remove from local state
      setSchedules((prev) =>
        prev.filter((schedule) => schedule._id !== scheduleId)
      );

      // If this was the selected schedule, clear selection
      if (selectedSchedule?._id === scheduleId) {
        setSelectedSchedule(null);
      }

      toast.success(`Schedule "${scheduleName}" deleted successfully!`);
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Failed to delete schedule");
    }
  };

  // Helper function to determine if schedule is completed
  const isScheduleCompleted = (schedule: Schedule): boolean => {
    if (!schedule.blocks || schedule.blocks.length === 0) return false;
    return schedule.blocks.every((block) => block.status === "completed");
  };

  // Filter schedules based on completion status
  const filteredSchedules = schedules.filter((schedule) => {
    if (filterCompletion === "active") {
      return !isScheduleCompleted(schedule);
    } else if (filterCompletion === "completed") {
      return isScheduleCompleted(schedule);
    }
    return true; // "all" shows both
  });

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

  const filteredBlocks =
    selectedSchedule?.blocks?.filter((block) => {
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && block.status !== "completed") ||
        block.status === filterStatus;
      const matchesSearch =
        !searchTerm ||
        (block.subjectName &&
          block.subjectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (typeof block.subjectId === "object" &&
          block.subjectId.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()));
      return matchesStatus && matchesSearch;
    }) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Calendar className="h-8 w-8 mr-3 text-cyan-400" />
            Study Schedules
          </h1>
          <p className="text-gray-300">
            Manage your AI-generated and manual study schedules. Track your
            session progress.
          </p>
        </div>

        {/* Schedule Filters */}
        {schedules.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Filter Schedules:
              </h3>
              <div className="relative">
                <Eye className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={filterCompletion}
                  onChange={(e) => setFilterCompletion(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="active">Active Schedules</option>
                  <option value="completed">Completed Schedules</option>
                  <option value="all">All Schedules</option>
                </select>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredSchedules.length} of {schedules.length}{" "}
                schedules
                {filterCompletion === "active" && " (active only)"}
                {filterCompletion === "completed" && " (completed only)"}
              </span>
            </div>
          </div>
        )}

        {/* Schedule Selector */}
        {filteredSchedules.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchedules.map((schedule) => (
                <div
                  key={schedule._id}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                    selectedSchedule?._id === schedule._id
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50"
                      : "border-gray-300 dark:border-gray-600 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <button
                      onClick={() => setSelectedSchedule(schedule)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {schedule.name}
                        </h4>
                        {schedule.created_by === "chatbot" && (
                          <Star className="h-4 w-4 text-yellow-500" />
                        )}
                        {isScheduleCompleted(schedule) && (
                          <div className="flex items-center space-x-1">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              Completed
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(schedule.start_date).toLocaleDateString()} -{" "}
                        {new Date(schedule.end_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {schedule.blocks?.length || 0} sessions •{" "}
                        {schedule.daily_hours}h/day
                      </p>
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteSchedule(schedule._id, schedule.name)
                      }
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors ml-2"
                      title="Delete schedule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for Filtered Results */}
        {schedules.length > 0 && filteredSchedules.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No{" "}
              {filterCompletion === "active"
                ? "active"
                : filterCompletion === "completed"
                ? "completed"
                : ""}{" "}
              schedules found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {filterCompletion === "active" &&
                "All your schedules are completed."}
              {filterCompletion === "completed" &&
                "You don't have any completed schedules yet."}
            </p>
            <button
              onClick={() => setFilterCompletion("all")}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Show All Schedules
            </button>
          </div>
        )}

        {selectedSchedule && (
          <>
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sessions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="active">Active Sessions</option>
                      <option value="all">All Sessions</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="missed">Missed</option>
                    </select>
                  </div>
                  <button
                    onClick={() =>
                      refreshScheduleSessions(selectedSchedule?._id)
                    }
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    title="Refresh sessions"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Schedule Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredBlocks.map((block) => {
                const isCompleted = isSubjectCompleted(block.subjectId);
                return (
                  <div
                    key={block._id}
                    className={getCompletionCardClasses(block)}
                  >
                    <div className="p-6">
                      {/* Session Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {block.subjectName ||
                                (block.subjectId &&
                                typeof block.subjectId === "object"
                                  ? block.subjectId.name
                                  : "Unknown Subject")}
                            </h3>
                            {isCompleted && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs font-medium rounded-full flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current" />
                                Subject Completed
                              </span>
                            )}
                          </div>
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
                          {block.startTime
                            ? new Date(block.startTime).toLocaleDateString()
                            : block.date
                            ? new Date(block.date).toLocaleDateString()
                            : "Invalid Date"}
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4 mr-2" />
                          {block.startTime && block.endTime
                            ? `${new Date(block.startTime).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                }
                              )} - ${new Date(block.endTime).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                }
                              )}`
                            : `${block.time || "Unknown"} - ${
                                block.endTime || "Unknown"
                              }`}{" "}
                          ({block.duration} min)
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        {isCompleted ? (
                          // Completed Subject - Show disabled completion message
                          <div className="col-span-2 flex items-center justify-center px-3 py-2 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-lg text-sm font-medium">
                            <Star className="h-4 w-4 mr-2 fill-current" />
                            Subject Complete
                          </div>
                        ) : block.status === "scheduled" ? (
                          // Active Subject - Show normal buttons
                          <>
                            <button
                              onClick={() =>
                                updateSessionStatus(block._id, "in-progress")
                              }
                              className="flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </button>
                            <button
                              onClick={() =>
                                updateSessionStatus(block._id, "missed")
                              }
                              className="flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Miss
                            </button>
                          </>
                        ) : block.status === "in-progress" ? (
                          <>
                            <button
                              onClick={() =>
                                updateSessionStatus(block._id, "completed")
                              }
                              className="flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Complete
                            </button>
                            <button
                              onClick={() =>
                                updateSessionStatus(block._id, "scheduled")
                              }
                              className="flex items-center justify-center px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                            >
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </button>
                          </>
                        ) : block.status === "completed" ||
                          block.status === "missed" ? (
                          <button
                            onClick={() =>
                              updateSessionStatus(block._id, "scheduled")
                            }
                            className="col-span-2 flex items-center justify-center px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reschedule
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredBlocks.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No sessions found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm ||
                  (filterStatus !== "active" && filterStatus !== "all")
                    ? "Try adjusting your search or filter criteria."
                    : "No active sessions scheduled for this period."}
                </p>
              </div>
            )}
          </>
        )}

        {schedules.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No schedules found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first schedule using the AI chatbot for optimal
              results.
            </p>
            <button
              onClick={() => {
                const event = new CustomEvent("open-chatbot", {
                  detail: { message: "I want to create a study schedule" },
                });
                window.dispatchEvent(event);
              }}
              className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white px-6 py-3 rounded-lg hover:from-indigo-600 hover:to-cyan-600 transition-all duration-300"
            >
              Generate Schedule with AI
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;
