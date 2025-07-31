import { Analytics } from "../types";

export interface ChatbotAnalytics {
  totalInteractions: number;
  completedSessions: number;
  progressUpdates: number;
  aiRecommendations: number;
  averageResponseTime: number;
  userEngagement: number;
}

export interface DailyAnalytics {
  studyTime: number; // Today's study time in minutes
  sessionsCompleted: number; // Sessions completed today
  focusScore: number; // Average focus score today
  completionRate: number; // Today's goal completion rate
  todaysGoal: number; // Daily study goal in minutes
  streak: number; // Current daily streak
  timeRemaining: number; // Minutes remaining to reach today's goal
  bestSubjectToday?: string; // Subject with most progress today
}

export interface WeeklyAnalytics {
  totalStudyTime: number; // Total weekly study time in minutes
  totalSessions: number; // Total sessions this week
  averageFocus: number; // Average focus score this week
  weeklyGoal: number; // Weekly study goal in minutes
  dailyConsistency: number[]; // Study time for each day [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  bestDay: string; // Day with highest study time
  weeklyProgress: number; // Percentage of weekly goal achieved
  subjectDistribution: { name: string; time: number; sessions: number }[];
}

export interface EnhancedAnalytics extends Analytics {
  chatbotData: ChatbotAnalytics;
  dailyAnalytics: DailyAnalytics;
  weeklyAnalytics: WeeklyAnalytics;
  lastUpdated: Date;
  dataSource: {
    mainBackend: boolean;
    chatbot: boolean;
  };
}

class AnalyticsService {
  private mainBackendUrl = "http://localhost:5000";
  private chatbotUrl = "http://localhost:8000";

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem("token");
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }

  async fetchMainBackendAnalytics(): Promise<Analytics | null> {
    try {
      const response = await this.fetchWithAuth(
        `${this.mainBackendUrl}/api/analytics/dashboard`
      );

      if (!response.ok) {
        console.warn(
          `Main backend analytics failed: ${response.status} ${response.statusText}`
        );
        // If it's an auth error, still return null to allow fallback
        if (response.status === 401 || response.status === 403) {
          console.log(
            "Authentication issue with main backend, using fallback data"
          );
          return null;
        }
        throw new Error(`Main backend analytics failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("Main backend analytics data:", data);

      // Always use the backend data, even if it's empty/minimal
      // This allows the user to see their real progress from zero
      return {
        totalStudyTime: data.weeklyStats?.totalStudyTime / 60 || 0, // Convert from minutes to hours
        weeklyStudyTime: data.weeklyStats?.dailyStudyTime?.map(
          (minutes: number) => minutes / 60
        ) || [0, 0, 0, 0, 0, 0, 0],
        completionRate: data.weeklyStats?.completionRate || 0,
        focusScore: data.weeklyStats?.averageFocus || 0,
        progressVelocity: this.calculateProgressVelocity(data),
        weeklyLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        insights: this.generateInsights(data),
        weeklyStats: {
          totalStudyTime: data.weeklyStats?.totalStudyTime || 0,
          totalSessions: data.weeklyStats?.totalSessions || 0,
          averageFocus: data.weeklyStats?.averageFocus || 0,
          completionRate: data.weeklyStats?.completionRate || 0,
          dailyStudyTime: data.weeklyStats?.dailyStudyTime || [
            0, 0, 0, 0, 0, 0, 0,
          ],
        },
        subjectProgress: data.subjectProgress || {
          total: 0,
          completed: 0,
          inProgress: 0,
          notStarted: 0,
          details: [],
        },
      };
    } catch (error) {
      console.error("Error fetching main backend analytics:", error);
      return null;
    }
  }

  async fetchChatbotAnalytics(): Promise<ChatbotAnalytics | null> {
    try {
      // Check if chatbot is available
      const healthResponse = await fetch(`${this.chatbotUrl}/health`);
      if (!healthResponse.ok) {
        console.warn("Chatbot server not available, using local storage data");
        return this.getChatbotInteractionStats();
      }

      // Fetch analytics from chatbot backend
      const analyticsResponse = await fetch(
        `${this.chatbotUrl}/analytics/chatbot`
      );
      if (!analyticsResponse.ok) {
        console.warn(
          "Chatbot analytics endpoint not available, using local storage data"
        );
        return this.getChatbotInteractionStats();
      }

      const data = await analyticsResponse.json();
      console.log("Chatbot analytics data:", data);

      if (data.success) {
        const analytics = data.analytics;

        // Use actual chatbot server data combined with local interaction tracking
        const localStats = this.getChatbotInteractionStats();

        return {
          totalInteractions: analytics.total_interactions || 0,
          completedSessions: analytics.completed_sessions || 0,
          progressUpdates: analytics.progress_updates || 0,
          aiRecommendations: analytics.ai_recommendations || 0,
          averageResponseTime: analytics.average_response_time || 0,
          userEngagement: analytics.user_engagement_score || 0,
        };
      } else {
        throw new Error("Failed to fetch chatbot analytics");
      }
    } catch (error) {
      console.error("Error fetching chatbot analytics:", error);
      // Fallback to local storage data
      return this.getChatbotInteractionStats();
    }
  }

  async fetchEnhancedAnalytics(): Promise<EnhancedAnalytics> {
    console.log("🔄 Fetching enhanced analytics from dual sources...");

    const [mainData, chatbotData] = await Promise.all([
      this.fetchMainBackendAnalytics(),
      this.fetchChatbotAnalytics(),
    ]);

    console.log(
      "📊 Main backend analytics result:",
      mainData ? "SUCCESS" : "FALLBACK"
    );
    console.log(
      "🤖 Chatbot analytics result:",
      chatbotData ? "SUCCESS" : "FALLBACK"
    );

    if (mainData) {
      console.log("📈 Main analytics data preview:", {
        studyTime: mainData.totalStudyTime,
        sessions: mainData.weeklyStats?.totalSessions,
        completion: mainData.completionRate,
      });
    }

    if (chatbotData) {
      console.log("🤖 Chatbot analytics data preview:", {
        interactions: chatbotData.totalInteractions,
        recommendations: chatbotData.aiRecommendations,
        engagement: chatbotData.userEngagement,
      });
    }

    // Create empty analytics if backends are unavailable
    const emptyAnalytics: Analytics = {
      totalStudyTime: 0,
      weeklyStudyTime: [0, 0, 0, 0, 0, 0, 0],
      completionRate: 0,
      focusScore: 0,
      progressVelocity: 0,
      weeklyLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      insights: [
        "� Start your learning journey by creating study sessions!",
        "📚 Your analytics will update as you complete sessions.",
        "🎯 Set up subjects and schedules to track your progress.",
        "� Every study session will contribute to your growth metrics.",
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
    };

    const emptyChatbotData: ChatbotAnalytics = {
      totalInteractions: 0,
      completedSessions: 0,
      progressUpdates: 0,
      aiRecommendations: 0,
      averageResponseTime: 0,
      userEngagement: 0,
    };

    const baseAnalytics = mainData || emptyAnalytics;
    const chatbot = chatbotData || emptyChatbotData;

    // Enhance analytics with chatbot data
    const enhancedAnalytics: EnhancedAnalytics = {
      ...baseAnalytics,
      // Adjust focus score based on chatbot engagement
      focusScore: this.calculateEnhancedFocusScore(
        baseAnalytics.focusScore,
        chatbot
      ),
      // Enhance progress velocity with chatbot interactions
      progressVelocity: this.calculateEnhancedProgressVelocity(
        baseAnalytics.progressVelocity,
        chatbot
      ),
      chatbotData: chatbot,
      dailyAnalytics: this.calculateDailyAnalytics(mainData),
      weeklyAnalytics: this.calculateWeeklyAnalytics(mainData),
      lastUpdated: new Date(),
      dataSource: {
        mainBackend: mainData !== null,
        chatbot: chatbotData !== null,
      },
    };

    return enhancedAnalytics;
  }

  private calculateProgressVelocity(data: any): number {
    // Calculate progress velocity based on completion rate and time
    const completionRate = data.weeklyStats?.completionRate || 0;
    const totalSessions = data.weeklyStats?.totalSessions || 0;

    if (totalSessions === 0) return 0;

    // Simple velocity calculation: sessions completed per day
    return Math.round((completionRate / 100) * totalSessions * 7) / 7;
  }

  private generateInsights(data: any): string[] {
    const insights: string[] = [];
    const completionRate = data.weeklyStats?.completionRate || 0;
    const totalStudyTime = data.weeklyStats?.totalStudyTime || 0;
    const totalSessions = data.weeklyStats?.totalSessions || 0;

    // If no real data, provide encouraging startup insights
    if (totalSessions === 0 && totalStudyTime === 0) {
      return [
        "🚀 Welcome to your learning journey! Start creating study sessions to see personalized insights.",
        "💡 Tip: Set up your first subject and schedule some study time to get started.",
        "📈 Your analytics will become more detailed as you use the app more.",
        "🎯 Consistency is key - even 15 minutes of daily study makes a difference!",
      ];
    }

    if (completionRate > 80) {
      insights.push(
        "🎉 Great job! You're maintaining excellent completion rates."
      );
    } else if (completionRate > 60) {
      insights.push("📈 Good progress! Keep up the momentum.");
    } else if (completionRate > 0) {
      insights.push(
        "💪 Focus on completing more sessions to improve your progress."
      );
    }

    if (totalStudyTime > 20 * 60) {
      // More than 20 hours per week
      insights.push("⭐ Excellent study dedication this week!");
    } else if (totalStudyTime > 10 * 60) {
      // More than 10 hours per week
      insights.push("👍 Good study time management.");
    } else if (totalStudyTime > 0) {
      insights.push(
        "� Keep building your study habits - every session counts!"
      );
    }

    return insights.length > 0 ? insights : ["📚 Keep learning and growing!"];
  }

  private calculateEnhancedFocusScore(
    baseFocusScore: number,
    chatbotData: ChatbotAnalytics
  ): number {
    // Enhance focus score with chatbot engagement metrics
    const engagementBonus = chatbotData.userEngagement > 0.7 ? 0.5 : 0;
    const interactionBonus = chatbotData.totalInteractions > 10 ? 0.3 : 0;

    return Math.min(10, baseFocusScore + engagementBonus + interactionBonus);
  }

  private calculateEnhancedProgressVelocity(
    baseVelocity: number,
    chatbotData: ChatbotAnalytics
  ): number {
    // Enhance progress velocity with chatbot interaction data
    const aiBonus = chatbotData.aiRecommendations > 5 ? 0.5 : 0;
    const sessionBonus = chatbotData.completedSessions > 3 ? 0.3 : 0;

    return Math.round((baseVelocity + aiBonus + sessionBonus) * 10) / 10;
  }

  // Create a new analytics endpoint for the chatbot to report usage data
  async reportChatbotInteraction(
    type: "view_schedule" | "get_recommendation" | "create_subject" | "general"
  ) {
    try {
      // Store chatbot interaction data in localStorage for now
      // In a real implementation, this would be sent to the backend
      const interactions = JSON.parse(
        localStorage.getItem("chatbot_interactions") || "[]"
      );
      interactions.push({
        type,
        timestamp: new Date().toISOString(),
        sessionId: Date.now(),
      });

      // Keep only last 100 interactions
      if (interactions.length > 100) {
        interactions.splice(0, interactions.length - 100);
      }

      localStorage.setItem(
        "chatbot_interactions",
        JSON.stringify(interactions)
      );
    } catch (error) {
      console.error("Error reporting chatbot interaction:", error);
    }
  }

  // Get chatbot interaction statistics from localStorage
  getChatbotInteractionStats(): ChatbotAnalytics {
    try {
      const interactions = JSON.parse(
        localStorage.getItem("chatbot_interactions") || "[]"
      );
      const last7Days = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentInteractions = interactions.filter(
        (i: any) => new Date(i.timestamp).getTime() > last7Days
      );

      return {
        totalInteractions: recentInteractions.length,
        completedSessions: recentInteractions.filter(
          (i: any) => i.type === "view_schedule"
        ).length,
        progressUpdates: recentInteractions.filter(
          (i: any) => i.type === "create_subject"
        ).length,
        aiRecommendations: recentInteractions.filter(
          (i: any) => i.type === "get_recommendation"
        ).length,
        averageResponseTime: 1.2, // Mock data - would be calculated from actual response times
        userEngagement: Math.min(1, recentInteractions.length / 20), // Engagement score 0-1
      };
    } catch (error) {
      console.error("Error getting chatbot stats:", error);
      return {
        totalInteractions: 0,
        completedSessions: 0,
        progressUpdates: 0,
        aiRecommendations: 0,
        averageResponseTime: 0,
        userEngagement: 0,
      };
    }
  }

  private calculateDailyAnalytics(data: any): DailyAnalytics {
    const dailyStudyTime = data?.weeklyStats?.dailyStudyTime || [
      0, 0, 0, 0, 0, 0, 0,
    ];
    // Backend sends array where index 6 is today
    const todaysStudyTime = dailyStudyTime[6] || 0;
    const dailyGoal = 120; // Default 2 hours in minutes

    // Calculate streak (mock for now - would need historical data)
    const streak = this.calculateStudyStreak(dailyStudyTime);

    return {
      studyTime: todaysStudyTime,
      sessionsCompleted: Math.floor(todaysStudyTime / 60), // Estimate sessions from time
      focusScore: data?.weeklyStats?.averageFocus || 0,
      completionRate: Math.min(100, (todaysStudyTime / dailyGoal) * 100),
      todaysGoal: dailyGoal,
      streak: streak,
      timeRemaining: Math.max(0, dailyGoal - todaysStudyTime),
      bestSubjectToday: this.getBestSubjectToday(data),
    };
  }

  private calculateWeeklyAnalytics(data: any): WeeklyAnalytics {
    const weeklyStats = data?.weeklyStats || {};
    const dailyStudyTime = weeklyStats.dailyStudyTime || [0, 0, 0, 0, 0, 0, 0];
    const weeklyGoal = 840; // Default 14 hours per week in minutes
    const totalWeeklyTime = dailyStudyTime.reduce(
      (sum: number, time: number) => sum + time,
      0
    );

    const dayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const bestDayIndex = dailyStudyTime.indexOf(Math.max(...dailyStudyTime));
    const bestDay = dayNames[bestDayIndex] || "Monday";

    return {
      totalStudyTime: totalWeeklyTime,
      totalSessions: weeklyStats.totalSessions || 0,
      averageFocus: weeklyStats.averageFocus || 0,
      weeklyGoal: weeklyGoal,
      dailyConsistency: dailyStudyTime,
      bestDay: bestDay,
      weeklyProgress: Math.min(100, (totalWeeklyTime / weeklyGoal) * 100),
      subjectDistribution: this.calculateSubjectDistribution(data),
    };
  }

  private calculateStudyStreak(dailyStudyTime: number[]): number {
    // Calculate consecutive days with study time > 0
    let streak = 0;
    // Backend array: index 6 is today, count backwards

    // Count backwards from today (index 6)
    for (let i = 6; i >= 0; i--) {
      if (dailyStudyTime[i] > 0) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private getBestSubjectToday(data: any): string | undefined {
    const subjectDetails = data?.subjectProgress?.details || [];
    if (subjectDetails.length === 0) return undefined;

    // Find subject with highest progress (mock calculation)
    const bestSubject = subjectDetails.reduce((best: any, current: any) => {
      return (current.progress || 0) > (best.progress || 0) ? current : best;
    }, subjectDetails[0]);

    return bestSubject?.name;
  }

  private calculateSubjectDistribution(
    data: any
  ): { name: string; time: number; sessions: number }[] {
    const subjectDetails = data?.subjectProgress?.details || [];

    return subjectDetails.map((subject: any) => ({
      name: subject.name || "Unknown Subject",
      time: Math.floor((subject.progress || 0) * 10), // Mock time calculation
      sessions: Math.floor((subject.progress || 0) / 20), // Mock sessions calculation
    }));
  }
}

export const analyticsService = new AnalyticsService();
