import React, { useState, useEffect } from 'react';
import { Clock, Target, TrendingUp, BookOpen, Calendar, Play, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardAnalytics, StudySession } from '../../types';
import { apiService } from '../../services/api';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const Dashboard: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [todaySessions, setTodaySessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || authLoading) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const [analyticsData, sessionsData] = await Promise.all([
          apiService.getDashboardAnalytics(),
          apiService.getTodaySessions(),
        ]);
        setAnalytics(analyticsData);
        // Handle potential API response variation
        setTodaySessions(sessionsData.sessions || sessionsData || []);
      } catch (err: any) {
        setError('Failed to load dashboard data');
        toast.error(`Error: ${err.message || 'Unknown error'}`);
        console.error('Dashboard data fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading]);

  const handleStartSession = async (sessionId: string) => {
    try {
      await apiService.startSession(sessionId);
      const updatedSessions = await apiService.getTodaySessions();
      setTodaySessions(updatedSessions.sessions || updatedSessions || []);
      toast.success('Session started successfully!');
    } catch (err: any) {
      toast.error(`Failed to start session: ${err.message || 'Unknown error'}`);
      console.error('Start session error:', err);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-r from-indigo-900 to-purple-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
        <p className="text-lg">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition-colors duration-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
        <p className="text-lg">No dashboard data available</p>
      </div>
    );
  }

  const stats = [
    {
      name: 'Weekly Study Time',
      value: `${Math.round(analytics.weeklyStats.totalStudyTime / 60)}h ${analytics.weeklyStats.totalStudyTime % 60}m`,
      icon: Clock,
      color: 'from-blue-500 to-cyan-400',
    },
    {
      name: 'Completed Sessions',
      value: analytics.weeklyStats.totalSessions.toString(),
      icon: CheckCircle,
      color: 'from-green-500 to-teal-400',
    },
    {
      name: 'Average Focus',
      value: `${analytics.weeklyStats.averageFocus.toFixed(1)}/10`,
      icon: Target,
      color: 'from-purple-500 to-pink-400',
    },
    {
      name: 'Completion Rate',
      value: `${analytics.weeklyStats.completionRate.toFixed(0)}%`,
      icon: TrendingUp,
      color: 'from-orange-500 to-red-400',
    },
  ];

  return (
    <div className="space-y-6 p-6 bg-gradient-to-b from-gray-900 to-indigo-900 min-h-screen">
      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform duration-300">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-300">Welcome to your learning hub!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className={`bg-gradient-to-r ${stat.color} rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform duration-300`}
            >
              <div className="flex items-center">
                <div className="rounded-lg p-3 bg-white bg-opacity-20">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-white">{stat.name}</p>
                  <p className="text-2xl font-semibold text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 animate-fade-in">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Today's Sessions
        </h2>
        {todaySessions.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-300">No sessions scheduled for today</p>
            <p className="text-sm text-gray-400 mt-1">
              Visit the Schedule page to generate your learning plan
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {todaySessions.map((session) => {
              const subject = typeof session.subjectId === 'object' ? session.subjectId : null;
              return (
                <div
                  key={session._id}
                  className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-colors duration-200"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{subject?.name || 'Unknown Subject'}</h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-300">
                      <span>{format(new Date(session.scheduledDate), 'h:mm a')}</span>
                      <span>{session.plannedDuration} minutes</span>
                      <span className="capitalize">{subject?.difficulty}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        session.status === 'completed'
                          ? 'bg-green-500 text-white'
                          : session.status === 'in-progress'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-500 text-white'
                      }`}
                    >
                      {session.status.replace('-', ' ')}
                    </span>
                    {session.status === 'scheduled' && (
                      <button
                        onClick={() => handleStartSession(session._id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 transition-colors duration-200"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 animate-fade-in">
        <h2 className="text-lg font-semibold text-white mb-6">Subject Progress</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{analytics.subjectProgress.total}</div>
            <div className="text-sm text-gray-300">Total Subjects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{analytics.subjectProgress.completed}</div>
            <div className="text-sm text-gray-300">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{analytics.subjectProgress.inProgress}</div>
            <div className="text-sm text-gray-300">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-300">{analytics.subjectProgress.notStarted}</div>
            <div className="text-sm text-gray-300">Not Started</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
