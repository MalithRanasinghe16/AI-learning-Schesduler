import React, { useState, useEffect } from 'react';
import { Clock, Target, TrendingUp, BookOpen, Calendar, Play, CheckCircle, ArrowRight, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useScheduleContext } from '../../contexts/ScheduleContext';
import { DashboardAnalytics, ScheduleSession } from '../../types';
import { apiService } from '../../services/api';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Dashboard: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { selectedSchedule, selectedScheduleId } = useScheduleContext();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [scheduleAnalytics, setScheduleAnalytics] = useState<any | null>(null);
  const [todaySessions, setTodaySessions] = useState<ScheduleSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Debug: Log context values
  console.log('🔍 Dashboard Context Debug:', {
    selectedScheduleId,
    selectedScheduleName: selectedSchedule?.name,
    hasSelectedSchedule: !!selectedSchedule,
    localStorageScheduleId: localStorage.getItem('selectedScheduleId')
  });

  const fetchDashboardData = async () => {
    console.log('Dashboard: fetchDashboardData called', { 
      user: !!user, 
      authLoading, 
      retryCount,
      selectedScheduleId,
      selectedScheduleName: selectedSchedule?.name 
    });
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

      // Fetch today's sessions - either for selected schedule or all sessions
      let activeScheduleForAnalytics: { _id: string; name?: string } | null = null;
      
      if (selectedScheduleId) {
        console.log('Dashboard: Calling getTodaySessionsForSchedule for schedule:', selectedScheduleId);
        const sessionsData = await apiService.getTodaySessionsForSchedule(selectedScheduleId);
        console.log('Dashboard: Sessions data received for schedule:', sessionsData);
        
        const sessions = sessionsData.sessions || sessionsData || [];
        console.log('Dashboard: Setting sessions for selected schedule:', {
          scheduleId: selectedScheduleId,
          sessionCount: sessions.length
        });
        setTodaySessions(sessions);
        activeScheduleForAnalytics = { _id: selectedScheduleId, name: selectedSchedule?.name };
      } else {
        console.log('Dashboard: No schedule selected, fetching all schedules to find active one...');
        
        try {
          // Try to get schedules and use the first active one
          const schedulesResponse = await apiService.getSchedules();
          const schedules = schedulesResponse.schedules || schedulesResponse || [];
          const activeSchedule = schedules.find(s => s.status === 'active') || schedules[0];
          
          if (activeSchedule) {
            console.log('Dashboard: Found active schedule, fetching sessions for:', {
              id: activeSchedule._id,
              name: activeSchedule.name
            });
            const sessionsData = await apiService.getTodaySessionsForSchedule(activeSchedule._id);
            const sessions = sessionsData.sessions || sessionsData || [];
            console.log('Dashboard: Setting sessions for active schedule:', {
              scheduleId: activeSchedule._id,
              sessionCount: sessions.length
            });
            setTodaySessions(sessions);
            activeScheduleForAnalytics = activeSchedule;
          } else {
            console.log('Dashboard: No schedules found, calling getTodaySessions (all schedules)...');
            const sessionsData = await apiService.getTodaySessions();
            const sessions = sessionsData.sessions || sessionsData || [];
            setTodaySessions(sessions);
          }
        } catch (scheduleError) {
          console.log('Dashboard: Error fetching schedules, falling back to all sessions:', scheduleError);
          const sessionsData = await apiService.getTodaySessions();
          const sessions = sessionsData.sessions || sessionsData || [];
          setTodaySessions(sessions);
        }
      }

      // Fetch schedule analytics if we have an active schedule
      if (activeScheduleForAnalytics) {
        try {
          console.log('Dashboard: Fetching schedule analytics for:', activeScheduleForAnalytics._id);
          const scheduleAnalyticsData = await apiService.getScheduleAnalytics(activeScheduleForAnalytics._id);
          console.log('Dashboard: Schedule analytics received:', scheduleAnalyticsData);
          setScheduleAnalytics(scheduleAnalyticsData);
        } catch (analyticsError) {
          console.log('Dashboard: Failed to fetch schedule analytics:', analyticsError);
          setScheduleAnalytics(null);
        }
      } else {
        setScheduleAnalytics(null);
      }
      
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
  }, [user, authLoading, retryCount, selectedScheduleId]);

  // Separate effect to re-fetch sessions when selected schedule changes
  useEffect(() => {
    // Only re-fetch sessions if auth is complete, user exists, and we're not already loading
    if (!authLoading && user && !isLoading && analytics) {
      console.log('Dashboard: Selected schedule changed, re-fetching sessions', {
        selectedScheduleId,
        selectedScheduleName: selectedSchedule?.name
      });
      
      const fetchSessionsOnly = async () => {
        try {
          let activeScheduleForAnalytics: { _id: string; name?: string } | null = null;
          
          if (selectedScheduleId) {
            console.log('Dashboard: Re-fetching sessions for selected schedule:', selectedScheduleId);
            const sessionsData = await apiService.getTodaySessionsForSchedule(selectedScheduleId);
            const sessions = sessionsData.sessions || sessionsData || [];
            console.log('Dashboard: Updated sessions for selected schedule:', {
              scheduleId: selectedScheduleId,
              sessionCount: sessions.length
            });
            setTodaySessions(sessions);
            activeScheduleForAnalytics = { _id: selectedScheduleId, name: selectedSchedule?.name };
          } else {
            console.log('Dashboard: No schedule selected, trying to find active schedule...');
            
            try {
              const schedulesResponse = await apiService.getSchedules();
              const schedules = schedulesResponse.schedules || schedulesResponse || [];
              const activeSchedule = schedules.find(s => s.status === 'active') || schedules[0];
              
              if (activeSchedule) {
                console.log('Dashboard: Using active schedule for re-fetch:', {
                  id: activeSchedule._id,
                  name: activeSchedule.name
                });
                const sessionsData = await apiService.getTodaySessionsForSchedule(activeSchedule._id);
                const sessions = sessionsData.sessions || sessionsData || [];
                setTodaySessions(sessions);
                activeScheduleForAnalytics = activeSchedule;
              } else {
                console.log('Dashboard: No schedules found, fetching all sessions');
                const sessionsData = await apiService.getTodaySessions();
                const sessions = sessionsData.sessions || sessionsData || [];
                setTodaySessions(sessions);
              }
            } catch (scheduleError) {
              console.log('Dashboard: Error finding schedules, using all sessions:', scheduleError);
              const sessionsData = await apiService.getTodaySessions();
              const sessions = sessionsData.sessions || sessionsData || [];
              setTodaySessions(sessions);
            }
          }

          // Fetch schedule analytics if we have an active schedule
          if (activeScheduleForAnalytics) {
            try {
              console.log('Dashboard: Re-fetching schedule analytics for:', activeScheduleForAnalytics._id);
              const scheduleAnalyticsData = await apiService.getScheduleAnalytics(activeScheduleForAnalytics._id);
              console.log('Dashboard: Updated schedule analytics:', scheduleAnalyticsData);
              setScheduleAnalytics(scheduleAnalyticsData);
            } catch (analyticsError) {
              console.log('Dashboard: Failed to re-fetch schedule analytics:', analyticsError);
              setScheduleAnalytics(null);
            }
          } else {
            setScheduleAnalytics(null);
          }
        } catch (error) {
          console.error('Dashboard: Error re-fetching sessions:', error);
          // Don't show error toast for session re-fetch, just log it
        }
      };
      
      fetchSessionsOnly();
    }
  }, [selectedScheduleId, selectedSchedule, authLoading, user, isLoading, analytics]);

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
      await apiService.updateSessionStatus(sessionId, 'in-progress');
      
      // Re-fetch sessions based on current context
      if (selectedScheduleId) {
        const updatedSessions = await apiService.getTodaySessionsForSchedule(selectedScheduleId);
        setTodaySessions(updatedSessions.sessions || updatedSessions || []);
      } else {
        // Fallback: try to find active schedule or use all sessions
        try {
          const schedulesResponse = await apiService.getSchedules();
          const schedules = schedulesResponse.schedules || schedulesResponse || [];
          const activeSchedule = schedules.find(s => s.status === 'active') || schedules[0];
          
          if (activeSchedule) {
            const updatedSessions = await apiService.getTodaySessionsForSchedule(activeSchedule._id);
            setTodaySessions(updatedSessions.sessions || updatedSessions || []);
          } else {
            const updatedSessions = await apiService.getTodaySessions();
            setTodaySessions(updatedSessions.sessions || updatedSessions || []);
          }
        } catch {
          const updatedSessions = await apiService.getTodaySessions();
          setTodaySessions(updatedSessions.sessions || updatedSessions || []);
        }
      }
      
      toast.success('Session started successfully!');
    } catch (err: any) {
      toast.error(`Failed to start session: ${err.message || 'Unknown error'}`);
      console.error('Start session error:', err);
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      await apiService.updateSessionStatus(sessionId, 'completed');
      
      // Re-fetch sessions based on current context
      if (selectedScheduleId) {
        const updatedSessions = await apiService.getTodaySessionsForSchedule(selectedScheduleId);
        setTodaySessions(updatedSessions.sessions || updatedSessions || []);
      } else {
        // Fallback: try to find active schedule or use all sessions
        try {
          const schedulesResponse = await apiService.getSchedules();
          const schedules = schedulesResponse.schedules || schedulesResponse || [];
          const activeSchedule = schedules.find(s => s.status === 'active') || schedules[0];
          
          if (activeSchedule) {
            const updatedSessions = await apiService.getTodaySessionsForSchedule(activeSchedule._id);
            setTodaySessions(updatedSessions.sessions || updatedSessions || []);
          } else {
            const updatedSessions = await apiService.getTodaySessions();
            setTodaySessions(updatedSessions.sessions || updatedSessions || []);
          }
        } catch {
          const updatedSessions = await apiService.getTodaySessions();
          setTodaySessions(updatedSessions.sessions || updatedSessions || []);
        }
      }
      
      toast.success('Session completed successfully!');
    } catch (err: any) {
      toast.error(`Failed to complete session: ${err.message || 'Unknown error'}`);
      console.error('Complete session error:', err);
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

  // Create stats based on schedule analytics if available, otherwise use default analytics
  const stats = scheduleAnalytics ? [
    {
      name: 'Completion Rate',
      value: `${scheduleAnalytics.completionRate}%`,
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-400',
    },
    {
      name: 'Sessions Done',
      value: `${scheduleAnalytics.sessionsCompleted}/${scheduleAnalytics.totalSessions}`,
      icon: CheckCircle,
      color: 'from-blue-500 to-cyan-400',
    },
    {
      name: 'Study Time',
      value: `${Math.floor(scheduleAnalytics.totalStudyTime / 60)}h ${scheduleAnalytics.totalStudyTime % 60}m`,
      icon: Clock,
      color: 'from-purple-500 to-pink-400',
    },
    {
      name: 'Daily Average',
      value: `${scheduleAnalytics.dailyAverage}min`,
      icon: Target,
      color: 'from-orange-500 to-red-400',
    },
  ] : [
    {
      name: 'Weekly Study Time',
      value: `${Math.round((analytics?.weeklyStats?.totalStudyTime || 0) / 60)}h ${(analytics?.weeklyStats?.totalStudyTime || 0) % 60}m`,
      icon: Clock,
      color: 'from-blue-500 to-cyan-400',
    },
    {
      name: 'Completed Sessions',
      value: (analytics?.weeklyStats?.totalSessions || 0).toString(),
      icon: CheckCircle,
      color: 'from-green-500 to-teal-400',
    },
    {
      name: 'Average Focus',
      value: `${(analytics?.weeklyStats?.averageFocus || 0).toFixed(1)}/10`,
      icon: Target,
      color: 'from-purple-500 to-pink-400',
    },
    {
      name: 'Completion Rate',
      value: `${(analytics?.weeklyStats?.completionRate || 0).toFixed(0)}%`,
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

      {/* Schedule Progress Header */}
      {scheduleAnalytics && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg shadow-lg p-4 mb-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Schedule Progress
              </h2>
              <p className="text-cyan-300 text-sm">{scheduleAnalytics.scheduleName}</p>
            </div>
            <Link
              to="/schedule"
              className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
            >
              View Schedule →
            </Link>
          </div>
        </div>
      )}

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
      {(!scheduleAnalytics || (scheduleAnalytics.totalSessions === 0 && scheduleAnalytics.totalStudyTime === 0)) && 
       (!analytics || (analytics.weeklyStats?.totalSessions === 0 && analytics.weeklyStats?.totalStudyTime === 0)) && (
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
            {selectedSchedule && (
              <span className="ml-2 text-sm text-cyan-300">
                · {selectedSchedule.name}
              </span>
            )}
            {todaySessions.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-cyan-500 text-white text-xs rounded-full">
                {todaySessions.length}
              </span>
            )}
          </h2>
          <Link
            to="/schedule"
            className="inline-flex items-center px-3 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm"
          >
            View Schedule
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        
        {/* Today's Sessions Summary */}
        {todaySessions.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-sm text-slate-400">Completed</div>
              <div className="text-lg font-semibold text-green-400">
                {todaySessions.filter(s => s.status === 'completed').length}
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-sm text-slate-400">In Progress</div>
              <div className="text-lg font-semibold text-blue-400">
                {todaySessions.filter(s => s.status === 'in-progress').length}
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-sm text-slate-400">Remaining</div>
              <div className="text-lg font-semibold text-yellow-400">
                {todaySessions.filter(s => s.status === 'scheduled').length}
              </div>
            </div>
          </div>
        )}
        {todaySessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No sessions today</h3>
            <p className="text-gray-300 mb-4">
              {selectedSchedule ? (
                <>You don't have any study sessions scheduled for today in <span className="font-medium text-cyan-300">"{selectedSchedule.name}"</span>.</>
              ) : (
                "You don't have any study sessions scheduled for today."
              )}
            </p>
            <Link
              to="/schedule"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 shadow-md"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Create Schedule
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {todaySessions.map((session) => {
              const subject = typeof session.subjectId === 'object' ? session.subjectId : null;
              
              // Calculate time range
              const startTime = new Date(session.startTime);
              const endTime = new Date(session.endTime);
              const timeRange = `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`;
              
              // Status colors
              const getStatusColor = (status: string) => {
                switch (status) {
                  case 'completed': return 'bg-green-500';
                  case 'in-progress': return 'bg-blue-500';
                  case 'missed': return 'bg-red-500';
                  case 'rescheduled': return 'bg-yellow-500';
                  default: return 'bg-gray-500';
                }
              };

              return (
                <div
                  key={session._id}
                  className="relative overflow-hidden bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg border border-slate-600 hover:border-slate-500 transition-all duration-200"
                >
                  {/* Priority indicator */}
                  <div 
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      session.priority >= 4 ? 'bg-red-400' : 
                      session.priority >= 3 ? 'bg-yellow-400' : 
                      'bg-green-400'
                    }`}
                  />
                  
                  <div className="flex items-center justify-between p-4 pl-6">
                    <div className="flex items-center space-x-4">
                      {/* Subject icon */}
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-white" />
                      </div>
                      
                      {/* Session details */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-sm">
                          {subject?.name || 'Unknown Subject'}
                        </h3>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-xs text-slate-300 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {timeRange}
                          </span>
                          <span className="text-xs text-slate-300">
                            {session.duration} min
                          </span>
                          {subject?.difficulty && (
                            <span className="text-xs px-2 py-0.5 bg-slate-600 text-slate-200 rounded-full capitalize">
                              {subject.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status and actions */}
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full text-white ${getStatusColor(session.status)}`}
                      >
                        {session.status.replace('-', ' ').toUpperCase()}
                      </span>
                      
                      {session.status === 'scheduled' && (
                        <button
                          onClick={() => handleStartSession(session._id)}
                          className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 transition-all duration-200 shadow-sm"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </button>
                      )}
                      
                      {session.status === 'in-progress' && (
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1 text-blue-400">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                            <span className="text-xs font-medium">Live</span>
                          </div>
                          <button
                            onClick={() => handleCompleteSession(session._id)}
                            className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 transition-all duration-200 shadow-sm"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complete
                          </button>
                        </div>
                      )}
                      
                      {session.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      )}
                    </div>
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
