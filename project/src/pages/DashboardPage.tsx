import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  BookOpen,
  Brain,
  TrendingUp,
  Clock,
  Target,
  BarChart3,
  Zap,
  Award,
  RefreshCw,
  Bot,
  Activity,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Analytics } from "../types";
import { toast } from "react-toastify";
import { testAnalytics } from "../utils/testAnalytics";
import {
  analyticsService,
  EnhancedAnalytics,
} from "../services/analyticsService";
import "../utils/debugAnalytics"; // Import debug utilities

// Lazy load Chart.js component for performance
const AnalyticsChart = lazy(
  () => import("../components/Dashboard/AnalyticsChart")
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<EnhancedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isWeeklyView, setIsWeeklyView] = useState(() => {
    // Load preference from localStorage, default to weekly view
    const saved = localStorage.getItem("analytics-view-preference");
    return saved ? JSON.parse(saved) : true;
  });

  // Save preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(
      "analytics-view-preference",
      JSON.stringify(isWeeklyView)
    );
  }, [isWeeklyView]);

  // Add keyboard shortcuts for development features
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+R for refresh
      if (event.ctrlKey && event.key === "r") {
        event.preventDefault();
        handleRefresh();
      }
      // Ctrl+T for test data
      if (event.ctrlKey && event.key === "t") {
        event.preventDefault();
        createTestData();
      }
      // Ctrl+D for debug
      if (event.ctrlKey && event.key === "d") {
        event.preventDefault();
        runDebugTest();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Debug test function
  const runDebugTest = async () => {
    try {
      console.log("🧪 Running analytics debug test...");
      const result = await testAnalytics();
      setAnalytics(result);
      toast.success("Analytics debug completed! Check console for details.");
    } catch (error) {
      console.error("❌ Debug failed:", error);
      toast.error("Analytics debug failed. Check console for details.");
    }
  };

  // Fetch analytics data with enhanced dual-source integration
  const fetchAnalytics = async (showToast: boolean = false) => {
    try {
      setLoading(true);
      if (showToast) {
        toast.info("Refreshing analytics data...", { autoClose: 2000 });
      }

      const enhancedData = await analyticsService.fetchEnhancedAnalytics();
      setAnalytics(enhancedData);
      setLastRefresh(new Date());

      if (showToast) {
        const sources: string[] = [];
        if (enhancedData.dataSource.mainBackend) sources.push("main server");
        if (enhancedData.dataSource.chatbot) sources.push("chatbot");

        toast.success(
          `Analytics updated from ${sources.join(" and ") || "cache"}`,
          { autoClose: 3000 }
        );
      }
    } catch (error) {
      console.error("Error fetching enhanced analytics:", error);
      toast.error("Failed to load analytics data");

      // Set empty analytics when backends fail
      setAnalytics({
        totalStudyTime: 0,
        weeklyStudyTime: [0, 0, 0, 0, 0, 0, 0],
        completionRate: 0,
        focusScore: 0,
        progressVelocity: 0,
        weeklyLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        insights: [
          "Unable to connect to analytics backend. Please check your connection.",
        ],
        weeklyStats: {
          totalStudyTime: 0,
          totalSessions: 0,
          averageFocus: 0,
          completionRate: 0,
          dailyStudyTime: [0, 0, 0, 0, 0, 0, 0],
        },
        subjectProgress: {
          total: 0,
          completed: 0,
          inProgress: 0,
          notStarted: 0,
          details: [],
        },
        chatbotData: {
          totalInteractions: 0,
          completedSessions: 0,
          progressUpdates: 0,
          aiRecommendations: 0,
          averageResponseTime: 0,
          userEngagement: 0,
        },
        dailyAnalytics: {
          studyTime: 0,
          sessionsCompleted: 0,
          focusScore: 0,
          completionRate: 0,
          todaysGoal: 120,
          streak: 0,
          timeRemaining: 120,
        },
        weeklyAnalytics: {
          totalStudyTime: 0,
          totalSessions: 0,
          averageFocus: 0,
          weeklyGoal: 840,
          dailyConsistency: [0, 0, 0, 0, 0, 0, 0],
          bestDay: "Monday",
          weeklyProgress: 0,
          subjectDistribution: [],
        },
        lastUpdated: new Date(),
        dataSource: {
          mainBackend: false,
          chatbot: false,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics data on component mount and set up auto-refresh
  useEffect(() => {
    fetchAnalytics();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    // Listen for analytics refresh events from other components
    const handleAnalyticsRefresh = () => {
      fetchAnalytics(true);
    };

    window.addEventListener("analytics-refresh", handleAnalyticsRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("analytics-refresh", handleAnalyticsRefresh);
    };
  }, []);

  // Manual refresh handler
  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  // Create test data for analytics (development only)
  const createTestData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login first");
        return;
      }

      toast.info("Creating test data...");

      const response = await fetch(
        "http://localhost:5000/api/analytics/test-data",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(
          `Test data created! ${result.subjects} subjects, ${result.sessions} sessions`
        );
        // Refresh analytics after creating test data
        setTimeout(() => fetchAnalytics(true), 1000);
      } else {
        toast.error("Failed to create test data");
      }
    } catch (error) {
      console.error("Error creating test data:", error);
      toast.error("Error creating test data");
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    trend?: string;
  }> = ({ title, value, icon, color, trend }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-all duration-300 hover:scale-105">
      <div className={`border-l-4 ${color} pl-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase">
              {title}
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {value}
            </p>
            {trend && (
              <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                {trend}
              </p>
            )}
          </div>
          <div
            className={`p-3 rounded-full bg-gradient-to-r ${color.replace(
              "border-l-",
              "from-"
            )} to-cyan-500`}
          >
            {icon}
          </div>
        </div>
      </div>
    </div>
  );

  const ActionButton: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    gradient: string;
  }> = ({ title, description, icon, onClick, gradient }) => (
    <button
      onClick={onClick}
      className={`bg-gradient-to-r ${gradient} text-white rounded-lg p-6 text-left transition-all duration-300 hover:scale-105 hover:shadow-lg`}
    >
      <div className="flex items-center mb-3">
        {icon}
        <h3 className="text-lg font-semibold ml-3">{title}</h3>
      </div>
      <p className="text-sm opacity-90">{description}</p>
    </button>
  );

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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.firstName || "Student"}! 👋
            </h1>
            <p className="text-gray-300">
              Here's your learning progress and quick actions for today.
            </p>
          </div>
          {/* Daily/Weekly Analytics Toggle - Compact Version */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-400">View:</span>
            <div className="flex items-center bg-gray-800/50 rounded-lg border border-gray-700 p-1">
              <button
                onClick={() => setIsWeeklyView(false)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                  !isWeeklyView
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setIsWeeklyView(true)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                  isWeeklyView
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Weekly
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Analytics Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isWeeklyView ? (
            // Weekly View Stats
            <>
              <StatCard
                title="Weekly Study Time"
                value={`${(
                  (analytics?.weeklyAnalytics?.totalStudyTime || 0) / 60
                ).toFixed(1)}h`}
                icon={<Clock className="h-6 w-6 text-white" />}
                color="border-l-cyan-500"
                trend={`Goal: ${(
                  (analytics?.weeklyAnalytics?.weeklyGoal || 840) / 60
                ).toFixed(1)}h`}
              />
              <StatCard
                title="Weekly Progress"
                value={`${Math.round(
                  analytics?.weeklyAnalytics?.weeklyProgress || 0
                )}%`}
                icon={<Target className="h-6 w-6 text-white" />}
                color="border-l-indigo-500"
                trend="of weekly goal"
              />
              <StatCard
                title="Average Focus"
                value={`${(
                  analytics?.weeklyAnalytics?.averageFocus || 0
                ).toFixed(1)}/10`}
                icon={<Brain className="h-6 w-6 text-white" />}
                color="border-l-purple-500"
                trend="This week"
              />
              <StatCard
                title="Total Sessions"
                value={`${analytics?.weeklyAnalytics?.totalSessions || 0}`}
                icon={<TrendingUp className="h-6 w-6 text-white" />}
                color="border-l-green-500"
                trend={`Best: ${analytics?.weeklyAnalytics?.bestDay || "N/A"}`}
              />
            </>
          ) : (
            // Daily View Stats
            <>
              <StatCard
                title="Today's Study Time"
                value={`${(
                  (analytics?.dailyAnalytics?.studyTime || 0) / 60
                ).toFixed(1)}h`}
                icon={<Clock className="h-6 w-6 text-white" />}
                color="border-l-cyan-500"
                trend={`Goal: ${(
                  (analytics?.dailyAnalytics?.todaysGoal || 120) / 60
                ).toFixed(1)}h`}
              />
              <StatCard
                title="Daily Progress"
                value={`${Math.round(
                  analytics?.dailyAnalytics?.completionRate || 0
                )}%`}
                icon={<Target className="h-6 w-6 text-white" />}
                color="border-l-indigo-500"
                trend="of daily goal"
              />
              <StatCard
                title="Today's Focus"
                value={`${(analytics?.dailyAnalytics?.focusScore || 0).toFixed(
                  1
                )}/10`}
                icon={<Brain className="h-6 w-6 text-white" />}
                color="border-l-purple-500"
                trend="Current session"
              />
              <StatCard
                title="Study Streak"
                value={`${analytics?.dailyAnalytics?.streak || 0} days`}
                icon={<Award className="h-6 w-6 text-white" />}
                color="border-l-orange-500"
                trend={
                  (analytics?.dailyAnalytics?.streak || 0) > 0
                    ? "Keep it up!"
                    : "Start today!"
                }
              />
            </>
          )}
        </div>

        {/* Daily/Weekly Specific Insights */}
        <div className="mb-8">
          {isWeeklyView ? (
            // Weekly Insights
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-6 border border-blue-500/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                📊 Weekly Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/20 rounded-lg p-4">
                  <h4 className="text-blue-300 font-medium mb-2">
                    Consistency
                  </h4>
                  <div className="flex items-center space-x-2">
                    {analytics?.weeklyAnalytics?.dailyConsistency?.map(
                      (time, index) => (
                        <div
                          key={index}
                          className={`w-6 h-6 rounded ${
                            time > 0 ? "bg-green-500" : "bg-gray-600"
                          }`}
                          title={`${
                            ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][
                              index
                            ]
                          }: ${(time / 60).toFixed(1)}h`}
                        />
                      )
                    ) ||
                      Array.from({ length: 7 }, (_, i) => (
                        <div key={i} className="w-6 h-6 rounded bg-gray-600" />
                      ))}
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    Daily study pattern
                  </p>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <h4 className="text-green-300 font-medium mb-2">
                    Best Performance
                  </h4>
                  <p className="text-2xl font-bold text-white">
                    {analytics?.weeklyAnalytics?.bestDay || "N/A"}
                  </p>
                  <p className="text-sm text-gray-400">Best study day</p>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <h4 className="text-purple-300 font-medium mb-2">
                    Goal Progress
                  </h4>
                  <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          analytics?.weeklyAnalytics?.weeklyProgress || 0
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-400">
                    {analytics?.weeklyAnalytics?.weeklyProgress?.toFixed(1) ||
                      0}
                    % of weekly goal
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Daily Insights
            <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-lg p-6 border border-orange-500/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                📅 Today's Focus
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/20 rounded-lg p-4">
                  <h4 className="text-orange-300 font-medium mb-2">
                    Time Remaining
                  </h4>
                  <p className="text-2xl font-bold text-white">
                    {Math.floor(
                      (analytics?.dailyAnalytics?.timeRemaining || 0) / 60
                    )}
                    h {(analytics?.dailyAnalytics?.timeRemaining || 0) % 60}m
                  </p>
                  <p className="text-sm text-gray-400">To reach daily goal</p>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <h4 className="text-yellow-300 font-medium mb-2">
                    Sessions Today
                  </h4>
                  <p className="text-2xl font-bold text-white">
                    {analytics?.dailyAnalytics?.sessionsCompleted || 0}
                  </p>
                  <p className="text-sm text-gray-400">Completed sessions</p>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <h4 className="text-red-300 font-medium mb-2">
                    Current Streak
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🔥</span>
                    <span className="text-2xl font-bold text-white">
                      {analytics?.dailyAnalytics?.streak || 0}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Consecutive study days
                  </p>
                </div>
              </div>
              {analytics?.dailyAnalytics?.bestSubjectToday && (
                <div className="mt-4 bg-black/20 rounded-lg p-4">
                  <h4 className="text-green-300 font-medium mb-2">
                    📚 Best Subject Today
                  </h4>
                  <p className="text-lg font-semibold text-white">
                    {analytics.dailyAnalytics.bestSubjectToday}
                  </p>
                  <p className="text-sm text-gray-400">Most progress made</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chatbot Analytics Section */}
        {analytics?.chatbotData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="AI Interactions"
              value={`${analytics.chatbotData.totalInteractions}`}
              icon={<Bot className="h-6 w-6 text-white" />}
              color="border-l-yellow-500"
              trend="This week"
            />
            <StatCard
              title="AI Recommendations"
              value={`${analytics.chatbotData.aiRecommendations}`}
              icon={<Zap className="h-6 w-6 text-white" />}
              color="border-l-orange-500"
              trend="Used this week"
            />
            <StatCard
              title="Progress Updates"
              value={`${analytics.chatbotData.progressUpdates}`}
              icon={<Activity className="h-6 w-6 text-white" />}
              color="border-l-pink-500"
              trend="Via chatbot"
            />
            <StatCard
              title="Engagement Score"
              value={`${Math.round(
                (analytics.chatbotData.userEngagement || 0) * 100
              )}%`}
              icon={<Award className="h-6 w-6 text-white" />}
              color="border-l-emerald-500"
              trend="User interaction level"
            />
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-cyan-500" />
              Weekly Study Time
            </h3>
            <Suspense
              fallback={
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                </div>
              }
            >
              <AnalyticsChart
                type="bar"
                data={analytics?.weeklyStudyTime || []}
                labels={analytics?.weeklyLabels || []}
                color="rgba(6, 182, 212, 0.8)"
              />
            </Suspense>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-indigo-500" />
              Progress Velocity Trend
            </h3>
            <Suspense
              fallback={
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              }
            >
              <AnalyticsChart
                type="line"
                data={analytics?.weeklyStudyTime || []}
                labels={analytics?.weeklyLabels || []}
                color="rgba(99, 102, 241, 0.8)"
              />
            </Suspense>
          </div>
        </div>

        {/* AI Insights - Enhanced with dual-source data */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-yellow-500" />
            AI-Powered Insights (Enhanced)
          </h3>
          <div className="space-y-3">
            {analytics?.insights?.map((insight, index) => (
              <div
                key={index}
                className="flex items-start p-3 bg-gradient-to-r from-indigo-50 to-cyan-50 dark:from-gray-700 dark:to-gray-600 rounded-lg"
              >
                <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700 dark:text-gray-300">{insight}</p>
              </div>
            )) || (
              <p className="text-gray-500 dark:text-gray-400">
                No insights available yet. Start studying to get personalized
                recommendations!
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionButton
            title="Manage Subjects"
            description="View and edit your subjects, track progress"
            icon={<BookOpen className="h-6 w-6" />}
            onClick={() => navigate("/subjects")}
            gradient="from-indigo-500 to-purple-600"
          />
          <ActionButton
            title="View Schedule"
            description="Check your study schedule and upcoming sessions"
            icon={<Calendar className="h-6 w-6" />}
            onClick={() => navigate("/schedule")}
            gradient="from-purple-500 to-cyan-500"
          />
          <ActionButton
            title="Get AI Recommendation"
            description="Ask the chatbot for optimal study suggestions"
            icon={<Brain className="h-6 w-6" />}
            onClick={() => {
              // Track this interaction for analytics
              analyticsService.reportChatbotInteraction("get_recommendation");
              // This will trigger the chatbot with a specific message
              const chatEvent = new CustomEvent("open-chatbot", {
                detail: { message: "What should I study next?" },
              });
              window.dispatchEvent(chatEvent);
            }}
            gradient="from-cyan-500 to-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
