import React, { useState, useEffect, useRef, useCallback } from "react";
import { BookOpen, Plus, Trash2, Edit } from "lucide-react";
import { apiService } from "../../services/api";
import { Subject } from "../../types";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSubject, setNewSubject] = useState<{
    name: string;
    description: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    category: string;
    estimatedHours: number;
    priority: "low" | "medium" | "high";
    tags: string[];
    progress: number;
    isCompleted: boolean;
  }>({
    name: "",
    description: "",
    difficulty: "beginner",
    category: "General",
    estimatedHours: 10,
    priority: "medium",
    tags: [],
    progress: 0,
    isCompleted: false,
  });
  const [isAdding, setIsAdding] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  
  // For debouncing progress updates
  const [localProgress, setLocalProgress] = useState<{[key: string]: number}>({});
  const progressTimeouts = useRef<{[key: string]: number}>({});

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { subjects } = await apiService.getSubjects();
        setSubjects(subjects);
      } catch (error: any) {
        toast.error(`Failed to fetch subjects: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const subjectToSend = {
        ...newSubject,
        estimatedHours: newSubject.estimatedHours || 1, // fallback to 1 if empty/NaN
        tags: Array.isArray(newSubject.tags) ? newSubject.tags : [],
      };
      const { subject } = await apiService.createSubject(subjectToSend);
      setSubjects([...subjects, subject]);
      setNewSubject({
        name: "",
        description: "",
        difficulty: "beginner",
        category: "General",
        estimatedHours: 10,
        priority: "medium",
        tags: [],
        progress: 0,
        isCompleted: false,
      });
      setIsAdding(false);
      toast.success("Subject added successfully!");
    } catch (error: any) {
      toast.error(`Failed to add subject: ${error.message}`);
    }
  };

  const handleUpdateProgress = async (id: string, progress: number) => {
    try {
      const { subject } = await apiService.updateSubjectProgress(id, progress);
      setSubjects(subjects.map((s) => (s._id === id ? subject : s)));
      toast.success("Progress updated!");
    } catch (error: any) {
      toast.error(`Failed to update progress: ${error.message}`);
    }
  };

  // Debounced progress update handler
  const handleProgressChange = useCallback((id: string, newProgress: number) => {
    // Update local state immediately for responsive UI
    setLocalProgress(prev => ({ ...prev, [id]: newProgress }));
    
    // Clear existing timeout for this subject
    if (progressTimeouts.current[id]) {
      clearTimeout(progressTimeouts.current[id]);
    }
    
    // Set new timeout to update progress after user stops sliding
    progressTimeouts.current[id] = window.setTimeout(async () => {
      try {
        const { subject } = await apiService.updateSubjectProgress(id, newProgress);
        setSubjects(prevSubjects => prevSubjects.map((s) => (s._id === id ? subject : s)));
        toast.success("Progress updated!");
        
        // Remove from local progress after API update
        setLocalProgress(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
      } catch (error: any) {
        toast.error(`Failed to update progress: ${error.message}`);
        // Revert local progress on error
        setLocalProgress(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
      }
    }, 800); // Wait 800ms after user stops sliding
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(progressTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  const handleDeleteSubject = async (id: string) => {
    try {
      await apiService.deleteSubject(id);
      setSubjects(subjects.filter((s) => s._id !== id));
      toast.success("Subject deleted successfully!");
    } catch (error: any) {
      toast.error(`Failed to delete subject: ${error.message}`);
    }
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setNewSubject({
      name: subject.name,
      description: subject.description || "",
      difficulty: subject.difficulty,
      category: subject.category || "General",
      estimatedHours: subject.estimatedHours ?? 10,
      priority: ["low", "medium", "high"].includes(subject.priority as string)
        ? (subject.priority as "low" | "medium" | "high")
        : "medium",
      tags: subject.tags || [],
      progress: subject.progress ?? 0,
      isCompleted: subject.isCompleted ?? false,
    });
    setIsAdding(true);
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    try {
      const { subject } = await apiService.updateSubject(
        editingSubject._id,
        newSubject
      );
      setSubjects(
        subjects.map((s) => (s._id === editingSubject._id ? subject : s))
      );
      setNewSubject({
        name: "",
        description: "",
        difficulty: "beginner",
        category: "General",
        estimatedHours: 10,
        priority: "medium",
        tags: [],
        progress: 0,
        isCompleted: false,
      });
      setIsAdding(false);
      setEditingSubject(null);
      toast.success("Subject updated successfully!");
    } catch (error: any) {
      toast.error(`Failed to update subject: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-b from-gray-900 to-indigo-900 test-css">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-b from-gray-900 to-indigo-900 min-h-screen test-css">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform duration-300 animate-fade-in">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <BookOpen className="h-8 w-8 text-cyan-400 mr-2 animate-pulse" />
          Subjects
        </h1>
        <p className="text-gray-300">Manage your learning subjects</p>
      </div>

      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 animate-fade-in">
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors duration-200 mb-6"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Subject
        </button>

        {isAdding && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold text-white mb-4">
                {editingSubject ? "Edit Subject" : "Add New Subject"}
              </h2>
              <form
                onSubmit={
                  editingSubject ? handleUpdateSubject : handleAddSubject
                }
                className="space-y-4"
              >
                <div>
                  <label className="text-gray-300">Subject Name</label>
                  <input
                    type="text"
                    value={newSubject.name}
                    onChange={(e) =>
                      setNewSubject({ ...newSubject, name: e.target.value })
                    }
                    className="p-2 border rounded w-full bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400"
                    placeholder="Enter subject name"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-300">Description</label>
                  <textarea
                    value={newSubject.description}
                    onChange={(e) =>
                      setNewSubject({
                        ...newSubject,
                        description: e.target.value,
                      })
                    }
                    className="p-2 border rounded w-full bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400"
                    placeholder="Enter description (optional)"
                  />
                </div>
                <div>
                  <label className="text-gray-300">Difficulty</label>
                  <select
                    value={newSubject.difficulty}
                    onChange={(e) =>
                      setNewSubject({
                        ...newSubject,
                        difficulty: e.target.value as
                          | "beginner"
                          | "intermediate"
                          | "advanced",
                      })
                    }
                    className="p-2 border rounded w-full bg-gray-800 text-white focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-300">Category</label>
                  <input
                    type="text"
                    value={newSubject.category}
                    onChange={(e) =>
                      setNewSubject({ ...newSubject, category: e.target.value })
                    }
                    className="p-2 border rounded w-full bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400"
                    placeholder="Enter category"
                  />
                </div>
                <div>
                  <label className="text-gray-300">Estimated Hours</label>
                  <input
                    type="number"
                    value={newSubject.estimatedHours}
                    onChange={(e) =>
                      setNewSubject({
                        ...newSubject,
                        estimatedHours: parseInt(e.target.value),
                      })
                    }
                    className="p-2 border rounded w-full bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400"
                    placeholder="Enter estimated hours"
                  />
                </div>
                <div>
                  <label className="text-gray-300">Priority</label>
                  <select
                    value={newSubject.priority}
                    onChange={(e) =>
                      setNewSubject({
                        ...newSubject,
                        priority: e.target.value as "low" | "medium" | "high",
                      })
                    }
                    className="p-2 border rounded w-full bg-gray-800 text-white focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-300">Tags</label>
                  <input
                    type="text"
                    value={newSubject.tags.join(", ")}
                    onChange={(e) =>
                      setNewSubject({
                        ...newSubject,
                        tags: e.target.value
                          .split(",")
                          .map((tag) => tag.trim()),
                      })
                    }
                    className="p-2 border rounded w-full bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400"
                    placeholder="Enter tags separated by commas"
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors duration-200"
                  >
                    {editingSubject ? "Update" : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingSubject(null);
                      setNewSubject({
                        name: "",
                        description: "",
                        difficulty: "beginner",
                        category: "General",
                        estimatedHours: 10,
                        priority: "medium",
                        tags: [],
                        progress: 0,
                        isCompleted: false,
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {subjects.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-300">No subjects added yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Click "Add Subject" to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <div
                key={subject._id}
                className="bg-white bg-opacity-10 rounded-lg p-4 hover:bg-opacity-20 transition-colors duration-200 animate-fade-in"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    {subject.name}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditSubject(subject)}
                      className="p-2 text-gray-300 hover:text-cyan-300"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSubject(subject._id)}
                      className="p-2 text-gray-300 hover:text-red-400"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  {subject.description || "No description"}
                </p>
                <p className="text-sm text-gray-300 capitalize mt-1">
                  Difficulty: {subject.difficulty}
                </p>
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-300 text-sm">
                      Progress: {localProgress[subject._id] ?? subject.progress}%
                    </label>
                    <div className="relative group">
                      <svg 
                        className="w-4 h-4 text-gray-400 cursor-help" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                        Track your learning progress (affects AI scheduling priority)
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={localProgress[subject._id] ?? subject.progress}
                    onChange={(e) =>
                      handleProgressChange(
                        subject._id,
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Not Started</span>
                    <span>In Progress</span>
                    <span>Complete</span>
                  </div>
                  {(localProgress[subject._id] ?? subject.progress) >= 100 && (
                    <div className="flex items-center mt-2 text-green-400 text-sm">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Subject Completed!
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Subjects;
