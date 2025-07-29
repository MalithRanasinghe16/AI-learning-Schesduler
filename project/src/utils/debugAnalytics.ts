// Debug Analytics Test
import { analyticsService } from "../services/analyticsService";

export const testAnalytics = async () => {
  console.log("🔍 Testing Analytics Service...");

  try {
    // Test main backend analytics
    console.log("📊 Testing Main Backend Analytics...");
    const mainData = await analyticsService.fetchMainBackendAnalytics();
    console.log("Main Backend Data:", mainData);
  } catch (error) {
    console.error("❌ Main Backend Error:", error);
  }

  try {
    // Test chatbot analytics
    console.log("🤖 Testing Chatbot Analytics...");
    const chatbotData = await analyticsService.fetchChatbotAnalytics();
    console.log("Chatbot Data:", chatbotData);
  } catch (error) {
    console.error("❌ Chatbot Error:", error);
  }

  try {
    // Test enhanced analytics
    console.log("🚀 Testing Enhanced Analytics...");
    const enhancedData = await analyticsService.fetchEnhancedAnalytics();
    console.log("Enhanced Data:", enhancedData);
  } catch (error) {
    console.error("❌ Enhanced Analytics Error:", error);
  }

  // Test local storage analytics
  console.log("💾 Testing Local Storage Analytics...");
  const localData = analyticsService.getChatbotInteractionStats();
  console.log("Local Storage Data:", localData);

  // Test reporting interaction
  console.log("📝 Testing Interaction Reporting...");
  await analyticsService.reportChatbotInteraction("general");
  const updatedLocalData = analyticsService.getChatbotInteractionStats();
  console.log("Updated Local Data:", updatedLocalData);
};

// Auto-run test in development
if (typeof window !== "undefined" && window.location.hostname === "localhost") {
  // Add test function to window for easy access
  (window as any).testAnalytics = testAnalytics;
  console.log("🧪 Analytics test function available as window.testAnalytics()");
}
