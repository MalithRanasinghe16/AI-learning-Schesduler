
import React, { useState, useEffect } from 'react';
import { Clock, Target, TrendingUp, BookOpen, Calendar as CalendarIcon } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ScheduleRecommendation, StudySession } from '../../../server/services/aiScheduler';
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
  subjectName: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  priority: 'low' | 'medium' | 'high';
  preferredDate: string;
  preferredTime: string;
}

const AdaptiveSchedulePage: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleRecommendation[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState<ScheduleInput>({
    subjectName: '',
    difficulty: 'beginner',
    priority: 'medium',
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

        const { recommendations } = await apiService.getAdaptiveSchedule();
        setSchedules(Array.isArray(recommendations) ? recommendations : []);

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setInput((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date) => {
    setInput((prev) => ({ ...prev, preferredDate: format(date, 'yyyy-MM-dd') }));
    setShowCalendar(false);
  };

  const generateSchedule = async () => {
    if (!input.subjectName.trim()) {
      setError('Subject name is required.');
      toast.error('Subject name is required.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { subject } = await apiService.createSubject({
        name: input.subjectName,
        difficulty: input.difficulty,
        priority: input.priority,
        estimatedHours: 10,
        progress: 0,
        isCompleted: false,
      });

      const { recommendations } = await apiService.generateAdaptiveSchedule(
        [subject._id],
        `${input.preferredDate}T${input.preferredTime}:00.000Z`
      );
      setSchedules(Array.isArray(recommendations) ? recommendations : []);
      toast.success('Schedule generated successfully!');
    } catch (err: any) {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            name="subjectName"
            value={input.subjectName}
            onChange={handleInputChange}
            placeholder="Subject Name"
            className="p-2 border rounded bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400"
          />
          <select
            name="difficulty"
            value={input.difficulty}
            onChange={handleInputChange}
            className="p-2 border rounded bg-gray-800 text-white focus:ring-2 focus:ring-cyan-400"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <select
            name="priority"
            value={input.priority}
            onChange={handleInputChange}
            className="p-2 border rounded bg-gray-800 text-white focus:ring-2 focus:ring-cyan-400"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <div className="relative">
            <input
              type="text"
              value={input.preferredDate}
              onClick={() => setShowCalendar(!showCalendar)}
              placeholder="Select Date"
              readOnly
              className="p-2 border rounded w-full bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400"
            />
            {showCalendar && (
              <div className="absolute z-10 mt-2">
                <Calendar
                  onChange={handleDateChange}
                  value={new Date(input.preferredDate)}
                  className="border rounded shadow-sm bg-gray-800 text-white"
                />
              </div>
            )}
          </div>
          <input
            type="time"
            name="preferredTime"
            value={input.preferredTime}
            onChange={handleInputChange}
            className="p-2 border rounded bg-gray-800 text-white focus:ring-2 focus:ring-cyan-400"
          />
          <button
            onClick={generateSchedule}
            className="col-span-1 md:col-span-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors duration-200"
            disabled={!input.subjectName.trim()}
          >
            Generate Schedule
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 animate-fade-in">
        <h2 className="text-lg font-semibold text-white mb-4">Recommended Schedule</h2>
        {schedules.length === 0 ? (
          <p className="text-gray-300">No recommendations available</p>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div
                key={schedule._id}
                className="p-4 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 cursor-pointer transition-colors duration-200"
                onClick={() => setSelectedSchedule(schedule)}
              >
                <h3 className="font-medium text-white">
                  Subject: {(typeof schedule.subjectId === 'object' ? schedule.subjectId.name : schedule.subjectId) || 'Unknown'}
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
            <p className="text-gray-300"><strong>Subject:</strong> {(typeof selectedSchedule.subjectId === 'object' ? selectedSchedule.subjectId.name : selectedSchedule.subjectId) || 'Unknown'}</p>
            <p className="text-gray-300"><strong>Time:</strong> {format(new Date(selectedSchedule.recommendedDate), 'PPP p')}</p>
            <p className="text-gray-300"><strong>Duration:</strong> {selectedSchedule.duration} min</p>
            <p className="text-gray-300"><strong>Priority:</strong> {selectedSchedule.priority}</p>
            <p className="text-gray-300"><strong>Reasoning:</strong> {selectedSchedule.reasoning}</p>
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
