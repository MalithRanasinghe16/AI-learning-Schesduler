import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Edit3,
  Check,
  X,
  Filter,
  Search,
  Play,
  Pause,
  RotateCcw,
  Brain,
  Star,
  Target,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Schedule, ScheduleBlock, Subject } from "../types";
import { toast } from "react-toastify";

const SchedulePage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: "",
    subjectIds: [] as string[],
    start_date: "",
    end_date: "",
    daily_hours: 4,
  });

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

        setSchedules(schedulesData);
        setSubjects(subjectsData);

        if (schedulesData.length > 0) {
          setSelectedSchedule(schedulesData[0]);
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

  const updateSessionStatus = async (
    blockId: string,
    newStatus: "scheduled" | "in-progress" | "completed" | "missed"
  ) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/schedule-blocks/${blockId}/status`,
        {
          method: "PUT",
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
          blocks: schedule.blocks.map((block) =>
            block._id === blockId ? { ...block, status: newStatus } : block
          ),
        }))
      );

      if (selectedSchedule) {
        setSelectedSchedule((prev) =>
          prev
            ? {
                ...prev,
                blocks: prev.blocks.map((block) =>
                  block._id === blockId
                    ? { ...block, status: newStatus }
                    : block
                ),
              }
            : null
        );
      }

      toast.success(`Session marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating session status:", error);
      toast.error("Failed to update session status");
    }
  };

  const createManualSchedule = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/schedules", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...manualForm,
          created_by: "manual",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create schedule");
      }

      const newSchedule = await response.json();
      setSchedules((prev) => [newSchedule, ...prev]);
      setShowManualForm(false);
      setManualForm({
        name: "",
        subjectIds: [],
        start_date: "",
        end_date: "",
        daily_hours: 4,
      });
      toast.success("Manual schedule created successfully!");
    } catch (error) {
      console.error("Error creating schedule:", error);
      toast.error("Failed to create schedule");
    }
  };

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
    selectedSchedule?.blocks.filter((block) => {
      const matchesStatus =
        filterStatus === "all" || block.status === filterStatus;
      const matchesSearch =
        !searchTerm ||
        block.subjectName.toLowerCase().includes(searchTerm.toLowerCase());
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

        {/* Chatbot Notice and Manual Creation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border border-indigo-400/30 rounded-lg p-4">
            <div className="flex items-center">
              <Brain className="h-5 w-5 text-cyan-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-white">
                  Need an optimized schedule?
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Use the AI chatbot to generate schedules with priority-based
                  optimization.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setShowManualForm(true)}
              className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-cyan-600 transition-all duration-300 flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Manual Schedule
            </button>
          </div>
        </div>

        {/* Schedule Selector */}
        {schedules.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedules.map((schedule) => (
                <button
                  key={schedule._id}
                  onClick={() => setSelectedSchedule(schedule)}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                    selectedSchedule?._id === schedule._id
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50"
                      : "border-gray-300 dark:border-gray-600 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {schedule.name}
                    </h4>
                    {schedule.created_by === "chatbot" && (
                      <Star className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(schedule.start_date).toLocaleDateString()} -{" "}
                    {new Date(schedule.end_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {schedule.blocks.length} sessions • {schedule.daily_hours}
                    h/day
                  </p>
                </button>
              ))}
            </div>
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
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">All Sessions</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Schedule Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredBlocks.map((block) => (
                <div
                  key={block._id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
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
                        {block.startTime} - {block.endTime} ({block.duration}{" "}
                        min)
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      {block.status === "scheduled" && (
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
                      )}
                      {block.status === "in-progress" && (
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
                      )}
                      {(block.status === "completed" ||
                        block.status === "missed") && (
                        <button
                          onClick={() =>
                            updateSessionStatus(block._id, "scheduled")
                          }
                          className="col-span-2 flex items-center justify-center px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reschedule
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredBlocks.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No sessions found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm || filterStatus !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "No sessions scheduled for this period."}
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

        {/* Manual Schedule Creation Modal */}
        {showManualForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Create Manual Schedule
                </h3>
                <button
                  onClick={() => setShowManualForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Schedule Name
                  </label>
                  <input
                    type="text"
                    value={manualForm.name}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Weekly Study Plan"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={manualForm.start_date}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          start_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={manualForm.end_date}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          end_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Daily Study Hours
                  </label>
                  <input
                    type="number"
                    value={manualForm.daily_hours}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        daily_hours: parseInt(e.target.value) || 4,
                      })
                    }
                    min="1"
                    max="12"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Subjects
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                    {subjects.map((subject) => (
                      <label
                        key={subject._id}
                        className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={manualForm.subjectIds.includes(subject._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setManualForm((prev) => ({
                                ...prev,
                                subjectIds: [...prev.subjectIds, subject._id],
                              }));
                            } else {
                              setManualForm((prev) => ({
                                ...prev,
                                subjectIds: prev.subjectIds.filter(
                                  (id) => id !== subject._id
                                ),
                              }));
                            }
                          }}
                          className="mr-3 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-gray-900 dark:text-white">
                          {subject.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowManualForm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createManualSchedule}
                  disabled={
                    !manualForm.name ||
                    !manualForm.start_date ||
                    !manualForm.end_date ||
                    manualForm.subjectIds.length === 0
                  }
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-lg hover:from-indigo-600 hover:to-cyan-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Schedule
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;
