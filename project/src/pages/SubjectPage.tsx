import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Edit3,
  Save,
  X,
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  MessageCircle,
  Star,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Subject } from "../types";
import { toast } from "react-toastify";
import { apiService } from "../services/api";

const SubjectPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editForm, setEditForm] = useState({
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    estimated_hours: 0,
    progress: 0,
  });

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        const data = await apiService.getSubjects();

        // Handle different possible response formats
        let subjectsData: Subject[] = [];
        if (Array.isArray(data)) {
          subjectsData = data;
        } else if (data && Array.isArray(data.subjects)) {
          subjectsData = data.subjects;
        } else if (data && Array.isArray(data.data)) {
          subjectsData = data.data;
        } else {
          console.warn("Unexpected API response format:", data);
          subjectsData = [];
        }

        setSubjects(subjectsData);
        setFilteredSubjects(subjectsData);
      } catch (error) {
        console.error("Error fetching subjects:", error);
        toast.error("Failed to load subjects");
        // Mock data for development
        const mockSubjects: Subject[] = [
          {
            _id: "1",
            id: "1",
            name: "Advanced Mathematics",
            description: "Calculus, algebra, and trigonometry",
            difficulty: "hard",
            priority: "high",
            estimated_hours: 120,
            progress: 65,
            category: "Science",
            tags: ["calculus", "algebra"],
            created_date: new Date().toISOString().split("T")[0],
            created_by: "chatbot",
            userId: user?._id || "",
            isCompleted: false,
            estimatedHours: 120,
          },
          {
            _id: "2",
            id: "2",
            name: "Physics Mechanics",
            description: "Classical mechanics and dynamics",
            difficulty: "medium",
            priority: "medium",
            estimated_hours: 80,
            progress: 40,
            category: "Science",
            tags: ["mechanics", "dynamics"],
            created_date: new Date().toISOString().split("T")[0],
            created_by: "chatbot",
            userId: user?._id || "",
            isCompleted: false,
            estimatedHours: 80,
          },
          {
            _id: "3",
            id: "3",
            name: "Chemistry Fundamentals",
            description: "Basic chemistry principles and reactions",
            difficulty: "medium",
            priority: "medium",
            estimated_hours: 60,
            progress: 25,
            category: "Science",
            tags: ["chemistry", "reactions"],
            created_date: new Date().toISOString().split("T")[0],
            created_by: "chatbot",
            userId: user?._id || "",
            isCompleted: false,
            estimatedHours: 60,
          },
        ];
        setSubjects(mockSubjects);
        setFilteredSubjects(mockSubjects);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [user?._id]);

  // Filter subjects based on search and priority
  useEffect(() => {
    // Ensure subjects is always an array
    const subjectsArray = Array.isArray(subjects) ? subjects : [];
    let filtered = subjectsArray;

    if (searchTerm) {
      filtered = filtered.filter(
        (subject) =>
          subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          subject.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterPriority !== "all") {
      filtered = filtered.filter(
        (subject) => subject.priority === filterPriority
      );
    }

    setFilteredSubjects(filtered);
  }, [subjects, searchTerm, filterPriority]);

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setEditForm({
      description: subject.description,
      priority: subject.priority,
      estimated_hours: subject.estimated_hours || subject.estimatedHours || 0,
      progress: subject.progress,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSubject) return;

    try {
      const updatedSubject = await apiService.updateSubject(
        editingSubject._id,
        {
          description: editForm.description,
          priority: editForm.priority,
          estimated_hours: editForm.estimated_hours,
        }
      );

      setSubjects((prev) =>
        prev.map((subject) =>
          subject._id === editingSubject._id
            ? { ...subject, ...updatedSubject }
            : subject
        )
      );

      setEditingSubject(null);
      toast.success("Subject updated successfully!");
    } catch (error) {
      console.error("Error updating subject:", error);
      toast.error("Failed to update subject");
    }
  };

  const refreshSubjectProgress = async (subjectId: string) => {
    try {
      console.log("🔄 Refreshing progress for subject:", subjectId);

      // Call the backend to recalculate progress from sessions
      const response = await fetch(
        `http://localhost:5000/api/subjects/${subjectId}/progress`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📡 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("📊 Progress data received:", data);

        // Update the subject in local state
        setSubjects((prev) =>
          prev.map((subject) =>
            subject._id === subjectId
              ? { ...subject, ...data.subject }
              : subject
          )
        );

        // Also update filtered subjects
        setFilteredSubjects((prev) =>
          prev.map((subject) =>
            subject._id === subjectId
              ? { ...subject, ...data.subject }
              : subject
          )
        );

        toast.success(`Progress refreshed: ${data.calculatedProgress}%`);
      } else {
        const errorData = await response.json();
        console.error("❌ Server error:", errorData);
        toast.error(
          `Failed to refresh progress: ${errorData.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("❌ Error refreshing progress:", error);
      toast.error("Failed to refresh progress - network error");
    }
  };

  // Handler for Analytics button
  const handleAnalytics = (subject: Subject) => {
    // Navigate to dashboard with subject filter
    navigate("/dashboard", {
      state: {
        focusSubject: subject._id,
        subjectName: subject.name,
      },
    });
    toast.info(`Viewing analytics for ${subject.name}`);
  };

  // Handler for Schedule button
  const handleSchedule = (subject: Subject) => {
    // Navigate to schedule page and trigger chatbot
    navigate("/schedule");

    // Small delay to ensure page loads, then trigger chatbot
    setTimeout(() => {
      const event = new CustomEvent("open-chatbot", {
        detail: {
          action: "schedule",
          subject: subject.name,
          message: `Create a study schedule for ${subject.name}`,
        },
      });
      window.dispatchEvent(event);
    }, 500);

    toast.info(`Creating schedule for ${subject.name}`);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 60) return "bg-blue-500";
    if (progress >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-4 text-xl">Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Study Subjects</h1>
          <p className="text-purple-200">
            Manage your subjects with AI-powered insights
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="pl-10 pr-8 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="all" className="text-gray-800">
                  All Priorities
                </option>
                <option value="high" className="text-gray-800">
                  High
                </option>
                <option value="medium" className="text-gray-800">
                  Medium
                </option>
                <option value="low" className="text-gray-800">
                  Low
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Chatbot Integration Notice */}
        <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-md rounded-xl p-6 mb-6 border border-cyan-500/30">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6 text-cyan-400" />
            <div>
              <h3 className="text-white font-semibold">
                AI Subject Management
              </h3>
              <p className="text-cyan-200 text-sm">
                Use the chatbot to add new subjects, get study recommendations,
                and track progress automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(filteredSubjects) &&
            filteredSubjects.map((subject) => (
              <div
                key={subject._id}
                className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:border-purple-400/50 transition-all duration-300 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                    <h3 className="text-xl font-semibold text-white truncate">
                      {subject.name}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                        subject.priority
                      )}`}
                    >
                      {subject.priority}
                    </span>
                    <button
                      onClick={() => handleEdit(subject)}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                  {subject.description}
                </p>

                {/* Stats */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Clock className="w-4 h-4" />
                      <span>
                        {subject.estimated_hours || subject.estimatedHours || 0}
                        h estimated
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Target className="w-4 h-4" />
                      <span>{subject.progress}% complete</span>
                      <button
                        onClick={() => refreshSubjectProgress(subject._id)}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-200 transition-colors"
                        title="Refresh progress from completed sessions"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                        subject.progress
                      )}`}
                      style={{ width: `${subject.progress}%` }}
                    ></div>
                  </div>

                  {/* Progress Info */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 text-center">
                      Progress calculated from completed study sessions
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAnalytics(subject)}
                    className="flex-1 px-3 py-2 bg-purple-600/20 text-purple-300 rounded-lg text-sm hover:bg-purple-600/30 transition-colors border border-purple-500/30"
                  >
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    Analytics
                  </button>
                  <button
                    onClick={() => handleSchedule(subject)}
                    className="flex-1 px-3 py-2 bg-cyan-600/20 text-cyan-300 rounded-lg text-sm hover:bg-cyan-600/30 transition-colors border border-cyan-500/30"
                  >
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Schedule
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* Empty State */}
        {(!Array.isArray(filteredSubjects) || filteredSubjects.length === 0) &&
          !loading && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No subjects found
              </h3>
              <p className="text-gray-300 mb-4">
                {searchTerm || filterPriority !== "all"
                  ? "Try adjusting your search or filters"
                  : "Start by asking the chatbot to add subjects for you"}
              </p>
              <button
                onClick={() => {
                  const event = new CustomEvent("open-chatbot", {
                    detail: { action: "add-subject" },
                  });
                  window.dispatchEvent(event);
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:from-purple-700 hover:to-cyan-700 transition-all duration-300"
              >
                <MessageCircle className="w-5 h-5 inline mr-2" />
                Ask AI to Add Subjects
              </button>
            </div>
          )}
      </div>

      {/* Edit Modal */}
      {editingSubject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                Edit Subject
              </h3>
              <button
                onClick={() => setEditingSubject(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={editForm.priority}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      priority: e.target.value as "low" | "medium" | "high",
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  value={editForm.estimated_hours}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      estimated_hours: parseInt(e.target.value),
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min="1"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setEditingSubject(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectPage;
