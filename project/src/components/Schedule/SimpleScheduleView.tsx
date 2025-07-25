import React, { useState } from "react";
import { Schedule, Subject, ScheduleSession } from "../../types";
import { format } from "date-fns";
import { Edit, Clock, BookOpen, BarChart3, Calendar } from "lucide-react";

interface SimpleScheduleViewProps {
  schedule: Schedule;
  subjects: Subject[];
  onSessionUpdate?: (session: ScheduleSession) => void;
}

const SimpleScheduleView: React.FC<SimpleScheduleViewProps> = ({
  schedule,
  subjects,
  onSessionUpdate,
}) => {
  const [editingSession, setEditingSession] = useState<ScheduleSession | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Debug logging
  console.log("=== SimpleScheduleView Debug ===");
  console.log("Schedule:", schedule);
  console.log("Schedule sessions:", schedule.sessions);
  console.log("Sessions length:", schedule.sessions?.length || 0);
  console.log("View mode:", viewMode);
  console.log("Subjects:", subjects);
  console.log("=== End Debug ===");

  // Group sessions by date
  const sessionsByDate = (schedule.sessions || []).reduce((acc, session) => {
    const date = format(new Date(session.startTime), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(session);
    return acc;
  }, {} as Record<string, ScheduleSession[]>);

  const getSubjectName = (subjectId: string | Subject) => {
    if (typeof subjectId === "object") return subjectId.name;
    const subject = subjects.find((s) => s._id === subjectId);
    return subject?.name || "Unknown Subject";
  };

  const getStatusColor = (status: ScheduleSession["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in-progress":
        return "bg-blue-500";
      case "missed":
        return "bg-red-500";
      case "rescheduled":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleStatusChange = (
    session: ScheduleSession,
    newStatus: ScheduleSession["status"]
  ) => {
    const updatedSession = { ...session, status: newStatus };
    onSessionUpdate?.(updatedSession);
  };

  const handleEditSession = (session: ScheduleSession) => {
    setEditingSession(session);
  };

  // Calculate schedule statistics
  const sessions = schedule.sessions || [];
  const stats = {
    total: sessions.length,
    completed: sessions.filter((s) => s.status === "completed").length,
    inProgress: sessions.filter((s) => s.status === "in-progress").length,
    scheduled: sessions.filter((s) => s.status === "scheduled").length,
    missed: sessions.filter((s) => s.status === "missed").length,
    totalHours:
      Math.round((sessions.reduce((acc, s) => acc + s.duration, 0) / 60) * 10) /
      10,
    completedHours:
      Math.round(
        (sessions
          .filter((s) => s.status === "completed")
          .reduce((acc, s) => acc + s.duration, 0) /
          60) *
          10
      ) / 10,
  };

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {schedule.name}
            </h2>
            <p className="text-gray-300">
              {sessions.length} sessions from{" "}
              {format(new Date(schedule.startDate), "MMM dd")} to{" "}
              {format(new Date(schedule.endDate), "MMM dd")}
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-2 mt-4 lg:mt-0">
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center px-3 py-2 rounded text-sm transition-colors ${
                  viewMode === "list"
                    ? "bg-cyan-500 text-white"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <BookOpen className="h-4 w-4 mr-1" />
                List
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex items-center px-3 py-2 rounded text-sm transition-colors ${
                  viewMode === "calendar"
                    ? "bg-cyan-500 text-white"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Calendar
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 text-cyan-400 mr-2" />
                <div>
                  <p className="text-gray-300 text-sm">Completion</p>
                  <p className="text-white text-lg font-semibold">
                    {completionRate}%
                  </p>
                </div>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
              <div>
                <p className="text-gray-300 text-sm">Completed</p>
                <p className="text-white text-lg font-semibold">
                  {stats.completed}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
              <div>
                <p className="text-gray-300 text-sm">In Progress</p>
                <p className="text-white text-lg font-semibold">
                  {stats.inProgress}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-gray-500 mr-2" />
              <div>
                <p className="text-gray-300 text-sm">Scheduled</p>
                <p className="text-white text-lg font-semibold">
                  {stats.scheduled}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-cyan-400 mr-2" />
              <div>
                <p className="text-gray-300 text-sm">Total Hours</p>
                <p className="text-white text-lg font-semibold">
                  {stats.totalHours}h
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Toggle between List and Calendar */}
      {viewMode === "list" ? (
        <div className="space-y-6">
          {Object.entries(sessionsByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, sessions]) => (
              <div key={date} className="border-l-4 border-cyan-500 pl-4">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {format(new Date(date), "EEEE, MMMM dd")}
                </h3>
                <div className="space-y-3">
                  {sessions
                    .sort(
                      (a, b) =>
                        new Date(a.startTime).getTime() -
                        new Date(b.startTime).getTime()
                    )
                    .map((session) => (
                      <div key={session._id}>
                        <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-between hover:bg-gray-600 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div
                              className={`w-3 h-3 rounded-full ${getStatusColor(
                                session.status
                              )}`}
                            />
                            <div>
                              <h4 className="text-white font-medium flex items-center gap-2">
                                {getSubjectName(session.subjectId)}
                                {session._id.startsWith("session-") && (
                                  <span className="px-2 py-1 text-xs bg-purple-600 text-white rounded">
                                    MOCK
                                  </span>
                                )}
                              </h4>
                              <div className="text-sm text-gray-300 flex items-center space-x-4">
                                <span>
                                  {format(
                                    new Date(session.startTime),
                                    "h:mm a"
                                  )}{" "}
                                  -{" "}
                                  {format(new Date(session.endTime), "h:mm a")}
                                </span>
                                <span>{session.duration} min</span>
                                <span className="capitalize">
                                  {session.sessionType}
                                </span>
                                <span>Priority: {session.priority}/5</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full text-white ${getStatusColor(
                                session.status
                              )}`}
                            >
                              {session.status}
                            </span>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleEditSession(session)}
                              className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                              title="Edit session"
                            >
                              <Edit className="h-4 w-4" />
                            </button>

                            {/* Action Buttons */}
                            {session.status === "scheduled" && (
                              <div className="flex space-x-1">
                                <button
                                  onClick={() =>
                                    handleStatusChange(session, "in-progress")
                                  }
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors font-medium"
                                >
                                  Start
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusChange(session, "completed")
                                  }
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors font-medium"
                                >
                                  Complete
                                </button>
                              </div>
                            )}
                            {session.status === "in-progress" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(session, "completed")
                                }
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors font-medium"
                              >
                                Complete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <SimpleCalendarView
          sessions={sessions}
          subjects={subjects}
          onSessionClick={handleEditSession}
        />
      )}

      {sessions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No sessions in this schedule</p>
        </div>
      )}

      {/* Session Edit Modal */}
      {editingSession && (
        <SessionEditModal
          session={editingSession}
          subjects={subjects}
          onClose={() => setEditingSession(null)}
          onSave={(updatedSession) => {
            onSessionUpdate?.(updatedSession);
            setEditingSession(null);
          }}
        />
      )}
    </div>
  );
};

// Session Edit Modal Component
interface SessionEditModalProps {
  session: ScheduleSession;
  subjects: Subject[];
  onClose: () => void;
  onSave: (session: ScheduleSession) => void;
}

const SessionEditModal: React.FC<SessionEditModalProps> = ({
  session,
  subjects,
  onClose,
  onSave,
}) => {
  const [editedSession, setEditedSession] = useState<ScheduleSession>({
    ...session,
  });

  const handleSave = () => {
    onSave(editedSession);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold text-white mb-4">Edit Session</h3>

        <div className="space-y-4">
          {/* Subject Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subject
            </label>
            <select
              value={
                typeof editedSession.subjectId === "string"
                  ? editedSession.subjectId
                  : editedSession.subjectId._id
              }
              onChange={(e) =>
                setEditedSession((prev) => ({
                  ...prev,
                  subjectId: e.target.value,
                }))
              }
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-400"
            >
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={format(
                new Date(editedSession.startTime),
                "yyyy-MM-dd'T'HH:mm"
              )}
              onChange={(e) => {
                const newStartTime = new Date(e.target.value);
                const newEndTime = new Date(
                  newStartTime.getTime() + editedSession.duration * 60000
                );
                setEditedSession((prev) => ({
                  ...prev,
                  startTime: newStartTime.toISOString(),
                  endTime: newEndTime.toISOString(),
                }));
              }}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duration (minutes)
            </label>
            <input
              type="number"
              min="15"
              max="480"
              step="15"
              value={editedSession.duration}
              onChange={(e) => {
                const duration = parseInt(e.target.value);
                const newEndTime = new Date(
                  new Date(editedSession.startTime).getTime() + duration * 60000
                );
                setEditedSession((prev) => ({
                  ...prev,
                  duration,
                  endTime: newEndTime.toISOString(),
                }));
              }}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          {/* Session Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Session Type
            </label>
            <select
              value={editedSession.sessionType}
              onChange={(e) =>
                setEditedSession((prev) => ({
                  ...prev,
                  sessionType: e.target.value as ScheduleSession["sessionType"],
                }))
              }
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-400"
            >
              <option value="study">Study</option>
              <option value="review">Review</option>
              <option value="practice">Practice</option>
              <option value="break">Break</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Priority (1-5)
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={editedSession.priority}
              onChange={(e) =>
                setEditedSession((prev) => ({
                  ...prev,
                  priority: parseInt(e.target.value),
                }))
              }
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-400"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple Calendar View Component
interface SimpleCalendarViewProps {
  sessions: ScheduleSession[];
  subjects: Subject[];
  onSessionClick: (session: ScheduleSession) => void;
}

const SimpleCalendarView: React.FC<SimpleCalendarViewProps> = ({
  sessions,
  subjects,
  onSessionClick,
}) => {
  // Debug logging for calendar view
  console.log("=== SimpleCalendarView Debug ===");
  console.log("Received sessions:", sessions);
  console.log("Sessions length:", sessions.length);
  console.log("Received subjects:", subjects);
  console.log("Subjects length:", subjects.length);
  console.log("=== End Calendar Debug ===");

  const getSubjectName = (subjectId: string | Subject) => {
    if (typeof subjectId === "object") return subjectId.name;
    const subject = subjects.find((s) => s._id === subjectId);
    return subject?.name || "Unknown Subject";
  };

  const getStatusColor = (status: ScheduleSession["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in-progress":
        return "bg-blue-500";
      case "missed":
        return "bg-red-500";
      case "rescheduled":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  // Group sessions by week
  const weekSessions = sessions.reduce((acc, session) => {
    console.log("Processing session for calendar:", session);
    const date = new Date(session.startTime);
    console.log("Session date:", date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    const weekKey = format(weekStart, "yyyy-MM-dd");
    console.log("Week key:", weekKey);

    if (!acc[weekKey]) {
      acc[weekKey] = [];
    }
    acc[weekKey].push(session);
    return acc;
  }, {} as Record<string, ScheduleSession[]>);

  console.log("Week sessions grouped:", weekSessions);

  // Check if there are any sessions to display
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No sessions to display in calendar view</p>
      </div>
    );
  }

  if (Object.keys(weekSessions).length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No sessions found for any week</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(weekSessions)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([weekStart, weekSessions]) => {
          const startDate = new Date(weekStart);
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);

          return (
            <div key={weekStart} className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Week of {format(startDate, "MMM dd")} -{" "}
                {format(endDate, "MMM dd, yyyy")}
              </h3>

              <div className="grid grid-cols-7 gap-2">
                {/* Day Headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="text-center text-gray-300 text-sm font-medium py-2"
                    >
                      {day}
                    </div>
                  )
                )}

                {/* Calendar Days */}
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const currentDate = new Date(startDate);
                  currentDate.setDate(startDate.getDate() + dayIndex);
                  const dayKey = format(currentDate, "yyyy-MM-dd");
                  const daySessions = weekSessions.filter(
                    (session) =>
                      format(new Date(session.startTime), "yyyy-MM-dd") ===
                      dayKey
                  );

                  return (
                    <div
                      key={dayIndex}
                      className="min-h-[120px] bg-gray-800 rounded p-2"
                    >
                      <div className="text-xs text-gray-400 mb-2">
                        {format(currentDate, "dd")}
                      </div>
                      <div className="space-y-1">
                        {daySessions
                          .sort(
                            (a, b) =>
                              new Date(a.startTime).getTime() -
                              new Date(b.startTime).getTime()
                          )
                          .map((session) => (
                            <div
                              key={session._id}
                              onClick={() => onSessionClick(session)}
                              className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(
                                session.status
                              )}`}
                              title={`${getSubjectName(
                                session.subjectId
                              )} - ${format(
                                new Date(session.startTime),
                                "h:mm a"
                              )}`}
                            >
                              <div className="text-white font-medium truncate">
                                {getSubjectName(session.subjectId)}
                              </div>
                              <div className="text-white text-xs opacity-90">
                                {format(new Date(session.startTime), "h:mm a")}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default SimpleScheduleView;
