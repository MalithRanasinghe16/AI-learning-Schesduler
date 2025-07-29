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
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Analytics } from "../types";
import { toast } from "react-toastify";
import { analyticsService, EnhancedAnalytics } from "../services/analyticsService";

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
        const sources = [];
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
      
      // Set fallback analytics with mock data
      setAnalytics({
        totalStudyTime: 0,
        weeklyStudyTime: [0, 0, 0, 0, 0, 0, 0],
        completionRate: 0,
        focusScore: 0,
        progressVelocity: 0,
        weeklyLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        insights: ["Unable to load analytics data"],
        chatbotData: {
          totalInteractions: 0,
          completedSessions: 0,
          progressUpdates: 0,
          aiRecommendations: 0,
          averageResponseTime: 0,
          userEngagement: 0
        },
        lastUpdated: new Date(),
        dataSource: {
          mainBackend: false,
          chatbot: false
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics data
  useEffect(() => {
    fetchAnalytics();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);
          insights: [
            "Focus on high-priority subjects this week",
            "Your completion rate improved by 12% this week",
            "Consider studying earlier in the day for better focus",
          ],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    // Set up polling for real-time updates
    const interval = setInterval(fetchAnalytics, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: string;
  }> = ({ title, value, icon, color, trend }) => (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 ${color} transition-all duration-300 hover:shadow-lg animate-fade-in`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {trend && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.firstName || "Student"}! 👋
          </h1>
          <p className="text-gray-300">
            Here's your learning progress and quick actions for today.
          </p>
        </div>

        {/* Analytics Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Study Time"
            value={`${analytics?.totalStudyTime || 0}h`}
            icon={<Clock className="h-6 w-6 text-white" />}
            color="border-l-cyan-500"
            trend="+12% this week"
          />
          <StatCard
            title="Completion Rate"
            value={`${analytics?.completionRate || 0}%`}
            icon={<Target className="h-6 w-6 text-white" />}
            color="border-l-indigo-500"
            trend="+5% from last week"
          />
          <StatCard
            title="Focus Score"
            value={`${analytics?.focusScore || 0}/10`}
            icon={<Brain className="h-6 w-6 text-white" />}
            color="border-l-purple-500"
            trend="Excellent focus!"
          />
          <StatCard
            title="Progress Velocity"
            value={`${analytics?.progressVelocity || 0}%`}
            icon={<TrendingUp className="h-6 w-6 text-white" />}
            color="border-l-green-500"
            trend="On track!"
          />
        </div>

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
              Progress Velocity
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

        {/* AI Insights */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-yellow-500" />
            AI-Powered Insights
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
