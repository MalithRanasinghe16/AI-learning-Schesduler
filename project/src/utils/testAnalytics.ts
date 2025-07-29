// Test file for analytics functionality
import { analyticsService } from "../services/analyticsService";

export const testAnalytics = async () => {
  console.log("🧪 Testing Analytics System...");
  console.log("=====================================");

  try {
    // Test enhanced analytics fetching
    console.log("📊 Fetching enhanced analytics...");
    const analytics = await analyticsService.fetchEnhancedAnalytics();

    console.log("✅ Analytics fetched successfully!");
    console.log("📈 Data Sources:", analytics.dataSource);
    console.log("📚 Total Study Time:", analytics.totalStudyTime, "hours");
    console.log("🎯 Completion Rate:", analytics.completionRate, "%");
    console.log("🧠 Focus Score:", analytics.focusScore, "/10");
    console.log("⚡ Progress Velocity:", analytics.progressVelocity);
    console.log(
      "🤖 Chatbot Interactions:",
      analytics.chatbotData.totalInteractions
    );
    console.log(
      "💡 AI Recommendations:",
      analytics.chatbotData.aiRecommendations
    );
    console.log("⏰ Last Updated:", analytics.lastUpdated);

    // Test chatbot interaction reporting
    console.log("\n🤖 Testing chatbot interaction reporting...");
    await analyticsService.reportChatbotInteraction("get_recommendation");
    console.log("✅ Chatbot interaction reported successfully!");

    // Test main backend analytics (may fail if server is down)
    console.log("\n🔍 Testing main backend connection...");
    const mainAnalytics = await analyticsService.fetchMainBackendAnalytics();
    if (mainAnalytics) {
      console.log("✅ Main backend connected and responding");
    } else {
      console.log("⚠️ Main backend not available - using fallback data");
    }

    // Test chatbot backend analytics
    console.log("\n🤖 Testing chatbot backend connection...");
    const chatbotAnalytics = await analyticsService.fetchChatbotAnalytics();
    if (chatbotAnalytics) {
      console.log("✅ Chatbot backend connected and responding");
    } else {
      console.log("⚠️ Chatbot backend not available - using fallback data");
    }

    console.log("\n🎉 Analytics test completed!");
    console.log("=====================================");

    return analytics;
  } catch (error) {
    console.error("❌ Analytics test failed:", error);
    throw error;
  }
};

// Quick test function for the dashboard
export const quickAnalyticsTest = async () => {
  try {
    const analytics = await analyticsService.fetchEnhancedAnalytics();
    console.log("📊 Quick Analytics Check:", {
      studyTime: analytics.totalStudyTime,
      completion: analytics.completionRate,
      focus: analytics.focusScore,
      chatbotActive: analytics.dataSource.chatbot,
      backendActive: analytics.dataSource.mainBackend,
    });
    return analytics;
  } catch (error) {
    console.error("❌ Quick analytics test failed:", error);
    return null;
  }
};
