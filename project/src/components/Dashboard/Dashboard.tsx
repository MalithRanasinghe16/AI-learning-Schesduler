import React, { useState, useEffect } from 'react';
import { Clock, Target, TrendingUp, BookOpen, Calendar, Play, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardAnalytics, StudySession } from '../../types';
import { apiService } from '../../services/api';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Dashboard: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [todaySessions, setTodaySessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    console.log('Dashboard: fetchDashboardData called', { user: !!user, authLoading, retryCount });
    console.log('Dashboard: Token in localStorage:', !!localStorage.getItem('token'));
    
    // If auth is still loading, keep dashboard loading
    if (authLoading) {
      console.log('Dashboard: Auth still loading, waiting...');
      return;
    }
    
    // If no user after auth is complete, that's an error state
    if (!user) {
      console.log('Dashboard: No user found after auth completed');
      setError('User not found. Please try logging in again.');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Dashboard: Fetching data for user', user.email);
      setIsLoading(true);
      setError(null);
      
      console.log('Dashboard: Calling getDashboardAnalytics...');
      const analyticsData = await apiService.getDashboardAnalytics();
      console.log('Dashboard: Analytics data received:', analyticsData);
      setAnalytics(analyticsData);

      console.log('Dashboard: Calling getTodaySessions...');
      const sessionsData = await apiService.getTodaySessions();
      console.log('Dashboard: Sessions data received:', sessionsData);
      
      // Handle potential API response variation
      const sessions = sessionsData.sessions || sessionsData || [];
      console.log('Dashboard: Setting sessions:', sessions);
      setTodaySessions(sessions);
      
    } catch (err: any) {
      console.error('Dashboard data fetch error:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      
      // For new users or API errors, create empty analytics instead of showing error
      console.log('Dashboard: API error, status:', err.response?.status);
      if (err.response?.status === 404 || err.response?.status === 500 || !err.response) {
        console.log('Dashboard: Creating empty analytics for new user due to API error');
        setAnalytics({
          weeklyStats: {
            totalStudyTime: 0,
            totalSessions: 0,
            averageFocus: 0,
            completionRate: 0,
            dailyStudyTime: [0, 0, 0, 0, 0, 0, 0]
          },
          subjectProgress: {
            total: 0,
            completed: 0,
            inProgress: 0,
            notStarted: 0,
            details: []
          }
        });
        setTodaySessions([]);
      } else {
        setError('Failed to load dashboard data. Please try again.');
        toast.error(`Error: ${err.message || 'Unknown error'}`);
      }
    } finally {
      console.log('Dashboard: Setting loading false');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('Dashboard: useEffect triggered', { 
      user: !!user, 
      userId: user?._id,
      currentUserId,
      authLoading, 
      retryCount,
      isLoading,
      hasAnalytics: !!analytics 
    });
    
    // Reset all state when auth is loading
    if (authLoading) {
      console.log('Dashboard: Auth loading, resetting state');
      setIsLoading(true);
      setError(null);
      setAnalytics(null);
      setTodaySessions([]);
      setCurrentUserId(null);
      return;
    }
    
    // Reset state when user changes (new login/register)
    if (user && user._id !== currentUserId) {
      console.log('Dashboard: User changed, resetting state', { 
        newUserId: user._id, 
        oldUserId: currentUserId 
      });
      setIsLoading(true);
      setError(null);
      setAnalytics(null);
      setTodaySessions([]);
      setCurrentUserId(user._id);
      // Don't return here, let it fetch data
    }
    
    // Only fetch data when auth is complete and we have a user
    if (!authLoading && user) {
      console.log('Dashboard: Auth complete, fetching data');
      fetchDashboardData();
    } else if (!authLoading && !user) {
      console.log('Dashboard: Auth complete but no user');
      setError('User not found. Please try logging in again.');
      setIsLoading(false);
    }
  }, [user, authLoading, retryCount]);

  // Separate effect for timeout fallback
  useEffect(() => {
    if (!authLoading && user && isLoading && !analytics && !error) {
      console.log('Dashboard: Setting up timeout fallback for user:', user._id);
      const timeoutId = setTimeout(() => {
        console.log('Dashboard: Timeout reached, checking state', { 
          isLoading, 
          hasAnalytics: !!analytics,
          authLoading,
          userId: user?._id
        });
        
        if (isLoading && !analytics && !authLoading && user) {
          console.log('Dashboard: Creating empty analytics for new user after timeout');
          setAnalytics({
            weeklyStats: {
              totalStudyTime: 0,
              totalSessions: 0,
              averageFocus: 0,
              completionRate: 0,
              dailyStudyTime: [0, 0, 0, 0, 0, 0, 0]
            },
            subjectProgress: {
              total: 0,
              completed: 0,
              inProgress: 0,
              notStarted: 0,
              details: []
            }
          });
          setTodaySessions([]);
          setIsLoading(false);
        }
      }, 5000); // Reduced from 6000 to 5000 for better UX

      return () => {
        console.log('Dashboard: Clearing timeout');
        clearTimeout(timeoutId);
      };
    }
  }, [authLoading, user, isLoading, analytics, error]);

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

  // Show loading only when auth is loading OR when we're actively fetching data for the first time
  const shouldShowLoading = authLoading || (isLoading && !analytics && !error);
  
  console.log('Dashboard: Render decision', {
    authLoading,
    isLoading,
    hasAnalytics: !!analytics,
    hasError: !!error,
    shouldShowLoading
  });

  if (shouldShowLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-r from-indigo-900 to-purple-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        <div className="ml-4 text-white">
          <p>Loading dashboard...</p>
          <p className="text-sm text-gray-300">
            {authLoading ? 'Authenticating...' : 'Fetching your data...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
        <p className="text-lg">{error}</p>
        <button
          onClick={() => {
            setRetryCount(prev => prev + 1);
            setError(null);
          }}
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
        <p className="text-sm text-gray-300 mt-2">
          Try refreshing or check if you have any subjects and study sessions.
        </p>
      </div>
    );
  }

  // Provide default values for analytics to prevent crashes
  const safeWeeklyStats = {
    totalStudyTime: analytics.weeklyStats?.totalStudyTime || 0,
    totalSessions: analytics.weeklyStats?.totalSessions || 0,
    averageFocus: analytics.weeklyStats?.averageFocus || 0,
    completionRate: analytics.weeklyStats?.completionRate || 0,
  };

  console.log('Dashboard: Rendering with stats:', safeWeeklyStats);
  console.log('Dashboard: Should show getting started?', safeWeeklyStats.totalSessions === 0 && safeWeeklyStats.totalStudyTime === 0);

  const stats = [
    {
      name: 'Weekly Study Time',
      value: `${Math.round(safeWeeklyStats.totalStudyTime / 60)}h ${safeWeeklyStats.totalStudyTime % 60}m`,
      icon: Clock,
      color: 'from-blue-500 to-cyan-400',
    },
    {
      name: 'Completed Sessions',
      value: safeWeeklyStats.totalSessions.toString(),
      icon: CheckCircle,
      color: 'from-green-500 to-teal-400',
    },
    {
      name: 'Average Focus',
      value: `${safeWeeklyStats.averageFocus.toFixed(1)}/10`,
      icon: Target,
      color: 'from-purple-500 to-pink-400',
    },
    {
      name: 'Completion Rate',
      value: `${safeWeeklyStats.completionRate.toFixed(0)}%`,
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

      {/* Getting Started Section for New Users */}
      {safeWeeklyStats.totalSessions === 0 && safeWeeklyStats.totalStudyTime === 0 && (
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg shadow-lg p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Welcome! Let's Get You Started
          </h2>
          <p className="text-gray-100 mb-4">
            It looks like you're new here! Follow these steps to get the most out of your learning experience:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="text-2xl font-bold text-white mb-2">1</div>
              <h3 className="font-medium text-white mb-1">Add Subjects</h3>
              <p className="text-sm text-gray-200 mb-3">Start by adding the subjects you want to learn.</p>
              <Link
                to="/subjects"
                className="inline-flex items-center px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
              >
                Add Subjects
              </Link>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="text-2xl font-bold text-white mb-2">2</div>
              <h3 className="font-medium text-white mb-1">Generate Schedule</h3>
              <p className="text-sm text-gray-200 mb-3">Use AI to create your personalized study schedule.</p>
              <Link
                to="/schedule"
                className="inline-flex items-center px-3 py-1 bg-cyan-500 text-white rounded text-xs hover:bg-cyan-600 transition-colors"
              >
                Create Schedule
              </Link>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="text-2xl font-bold text-white mb-2">3</div>
              <h3 className="font-medium text-white mb-1">Start Learning</h3>
              <p className="text-sm text-gray-200">Follow your schedule and track your progress.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Today's Sessions
          </h2>
          <Link
            to="/schedule"
            className="inline-flex items-center px-3 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm"
          >
            View Schedule
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
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
            <div className="text-2xl font-bold text-white">{analytics.subjectProgress?.total || 0}</div>
            <div className="text-sm text-gray-300">Total Subjects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{analytics.subjectProgress?.completed || 0}</div>
            <div className="text-sm text-gray-300">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{analytics.subjectProgress?.inProgress || 0}</div>
            <div className="text-sm text-gray-300">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-300">{analytics.subjectProgress?.notStarted || 0}</div>
            <div className="text-sm text-gray-300">Not Started</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
