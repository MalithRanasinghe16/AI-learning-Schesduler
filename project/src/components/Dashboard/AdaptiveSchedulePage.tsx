import React, { useState, useEffect } from 'react';
import { Clock, Target, TrendingUp, BookOpen, Calendar as CalendarIcon } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ScheduleRecommendation, StudySession, Subject } from '../../types';
import { apiService } from '../../services/api';
import { format } from 'date-fns';

interface Session {
  actualDuration?: number;
  focusScore?: number;
  status?: string;
  [key: string]: any;
}

interface Analytics {
  totalStudyTime: number;
  totalSessions: number;
  averageFocus: number;
  completionRate: number;
}

interface ScheduleInput {
  preferredDate: string;
  preferredTime: string;
}

const AdaptiveSchedulePage: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleRecommendation[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [input, setInput] = useState<ScheduleInput>({
    preferredDate: new Date().toISOString().split('T')[0],
    preferredTime: '14:00',
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleRecommendation | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch existing schedules
        const { recommendations } = await apiService.getAdaptiveSchedule();
        setSchedules(Array.isArray(recommendations) ? recommendations : []);

        // Fetch existing subjects
        const { subjects: existingSubjects } = await apiService.getSubjects();
        setSubjects(existingSubjects || []);

        // Fetch analytics data
        const { sessions } = await apiService.getSessions();
        const recentSessions: Session[] = sessions || [];
        const totalStudyTime = recentSessions.reduce(
          (sum: number, s: Session) => sum + (s.actualDuration || 0),
          0
        );
        const totalSessions = recentSessions.length || 1;
        const averageFocus =
          recentSessions.reduce((sum: number, s: Session) => sum + (s.focusScore || 0), 0) /
            totalSessions || 0;
        const completionRate =
          recentSessions.filter((s: Session) => s.status === 'completed').length /
            totalSessions || 0;

        setAnalytics({
          totalStudyTime,
          totalSessions,
          averageFocus,
          completionRate,
        });
      } catch (err: any) {
        setError(`Failed to fetch data: ${err.message}`);
        toast.error(`Failed to fetch data: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubjectSelection = (subjectId: string) => {
    setSelectedSubjectIds(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setInput((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (value: any) => {
    if (value && value instanceof Date) {
      setInput((prev) => ({ ...prev, preferredDate: format(value, 'yyyy-MM-dd') }));
      setShowCalendar(false);
    }
  };

  const generateSchedule = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate that subjects are selected
      if (selectedSubjectIds.length === 0) {
        setError('Please select at least one subject.');
        toast.error('Please select at least one subject.');
        return;
      }

      const schedulePayload = {
        subjects: selectedSubjectIds,
        startDate: `${input.preferredDate}T${input.preferredTime}:00.000Z`
      };

      console.log('Generating schedule with payload:', schedulePayload);

      const scheduleResponse = await apiService.generateAdaptiveSchedule(
        schedulePayload.subjects,
        schedulePayload.startDate
      );
      
      console.log('Schedule response received:', scheduleResponse);
      console.log('Generated recommendations:', scheduleResponse.recommendations);
      
      setSchedules(Array.isArray(scheduleResponse.recommendations) ? scheduleResponse.recommendations : []);
      toast.success('Schedule generated successfully!');
    } catch (err: any) {
      console.error('=== GENERATE SCHEDULE ERROR ===');
      console.error('Error message:', err.message);
      console.error('Error response status:', err.response?.status);
      console.error('Error response data:', err.response?.data);
      console.error('Full error object:', err);
      setError(`Failed to generate schedule: ${err.message}`);
      toast.error(`Failed to generate schedule: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-r from-indigo-900 to-purple-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-b from-gray-900 to-indigo-900 min-h-screen">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform duration-300">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <CalendarIcon className="h-6 w-6 mr-2" />
          Adaptive Schedule
        </h1>
        <p className="text-gray-300">Generate your personalized study schedule with ease.</p>
      </div>

      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-400 text-white px-4 py-3 rounded relative animate-fade-in">
          {error}
          <button onClick={() => setError(null)} className="absolute right-2 top-2 text-white">✕</button>
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 animate-fade-in">
        <h2 className="text-lg font-semibold text-white mb-4">Generate Schedule</h2>
        
        {/* Subject Selection */}
        <div className="mb-6">
          <p className="text-gray-300 text-sm mb-4">Select subjects to include in schedule:</p>
          {subjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">No subjects available.</p>
              <p className="text-gray-400 text-xs mt-1">
                Please create some subjects first in the "Subjects" section.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto mb-4">
              {subjects.map((subject) => (
                <label key={subject._id} className="flex items-center cursor-pointer p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedSubjectIds.includes(subject._id)}
                    onChange={() => handleSubjectSelection(subject._id)}
                    className="mr-3 w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium">{subject.name}</span>
                    <div className="text-xs text-gray-300">
                      {subject.difficulty} • {subject.priority} priority • {subject.progress}% complete
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Date and Time Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <label className="block text-gray-300 text-sm mb-1">Start Date</label>
            <input
              type="text"
              value={input.preferredDate}
              onClick={() => setShowCalendar(!showCalendar)}
              placeholder="Select Date"
              readOnly
              className="p-3 border rounded w-full bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400 cursor-pointer"
            />
            {showCalendar && (
              <div className="absolute z-10 mt-2">
                <Calendar
                  onChange={handleDateChange}
                  value={new Date(input.preferredDate)}
                  className="border rounded shadow-lg bg-gray-800 text-white"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-1">Start Time</label>
            <input
              type="time"
              name="preferredTime"
              value={input.preferredTime}
              onChange={handleInputChange}
              className="p-3 border rounded w-full bg-gray-800 text-white focus:ring-2 focus:ring-cyan-400"
            />
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateSchedule}
          className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-200 font-medium"
          disabled={selectedSubjectIds.length === 0}
        >
          {selectedSubjectIds.length === 0 
            ? 'Select subjects to generate schedule' 
            : `Generate Schedule for ${selectedSubjectIds.length} subject${selectedSubjectIds.length !== 1 ? 's' : ''}`
          }
        </button>
      </div>

      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 animate-fade-in">
        <h2 className="text-lg font-semibold text-white mb-4">Recommended Schedule</h2>
        {schedules.length === 0 ? (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-300 mb-2">No schedule recommendations yet</p>
            <p className="text-sm text-gray-400">
              Select subjects above and click "Generate Schedule" to get personalized recommendations
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule, index) => (
              <div
                key={`schedule-${index}`}
                className="p-4 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 cursor-pointer transition-colors duration-200"
                onClick={() => setSelectedSchedule(schedule)}
              >
                <h3 className="font-medium text-white">
                  Subject: {schedule.subjectId}
                </h3>
                <p className="text-gray-300">Time: {format(new Date(schedule.recommendedDate), 'PPP p')}</p>
                <p className="text-gray-300">Duration: {schedule.duration} min</p>
                <p className="text-gray-300">Priority: {schedule.priority}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg p-6 max-w-md w-full shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Schedule Details</h2>
            <p className="text-gray-300"><strong>Subject:</strong> {selectedSchedule.subjectId}</p>
            <p className="text-gray-300"><strong>Time:</strong> {format(new Date(selectedSchedule.recommendedDate), 'PPP p')}</p>
            <p className="text-gray-300"><strong>Duration:</strong> {selectedSchedule.duration} min</p>
            <p className="text-gray-300"><strong>Priority:</strong> {selectedSchedule.priority}</p>
            {selectedSchedule.reasoning && (
              <p className="text-gray-300"><strong>Reasoning:</strong> {selectedSchedule.reasoning}</p>
            )}
            <button
              onClick={() => setSelectedSchedule(null)}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded hover:from-cyan-600 hover:to-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 animate-fade-in">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Performance Analytics
        </h2>
        {analytics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-300">Total Time: {analytics.totalStudyTime} min</p>
              <p className="text-gray-300">Total Sessions: {analytics.totalSessions}</p>
              <p className="text-gray-300">Avg Focus: {analytics.averageFocus.toFixed(1)}/10</p>
              <p className="text-gray-300">Completion Rate: {(analytics.completionRate * 100).toFixed(0)}%</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-300">No analytics data available</p>
        )}
      </div>
    </div>
  );
};

export default AdaptiveSchedulePage;
