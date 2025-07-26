import axios from "axios";
import {
  ChatMessage,
  ChatResponse,
  SubjectCreateRequest,
  ScheduleGenerationRequest,
  FeedbackSubmissionRequest,
  OptimalSubjectRequest,
} from "../types";

// Create axios instance for chatbot API
const chatbotApi = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 10000,
});

// Add request/response interceptors for debugging
chatbotApi.interceptors.request.use((request) => {
  // Only log in development
  return request;
});

chatbotApi.interceptors.response.use(
  (response) => {
    // Only log in development
    return response;
  },
  (error) => {
    console.error(
      `Chatbot API Error: ${error.response?.status} ${error.config?.url}`,
      error.message
    );
    return Promise.reject(error);
  }
);

export interface ChatRequest {
  message: string;
  user_id: string;
  conversation_id?: string;
}

export const chatbotService = {
  /**
   * Send a chat message to the FastAPI chatbot
   */
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await chatbotApi.post<ChatResponse>("/chat", request);
    return response.data;
  },

  /**
   * Add a new subject using AI prioritization
   */
  addSubject: async (subject: SubjectCreateRequest): Promise<any> => {
    const response = await chatbotApi.post("/add_subject", subject);
    return response.data;
  },

  /**
   * Generate an optimized schedule using AI
   */
  generateSchedule: async (
    request: ScheduleGenerationRequest
  ): Promise<any> => {
    const response = await chatbotApi.post("/generate_schedule", request);
    return response.data;
  },

  /**
   * Submit session feedback for AI learning
   */
  submitFeedback: async (feedback: FeedbackSubmissionRequest): Promise<any> => {
    const response = await chatbotApi.post("/submit_feedback", feedback);
    return response.data;
  },

  /**
   * Get optimal subject recommendation from AI
   */
  getOptimalSubject: async (request: OptimalSubjectRequest): Promise<any> => {
    const response = await chatbotApi.post("/get_optimal_subject", request);
    return response.data;
  },

  /**
   * Health check for the chatbot service
   */
  healthCheck: async (): Promise<{ status: string }> => {
    const response = await chatbotApi.get("/health");
    return response.data;
  },
};

/**
 * Utility function to create a chat message
 */
export const createChatMessage = (
  text: string,
  sender: "user" | "bot",
  additionalData?: Partial<ChatMessage>
): ChatMessage => {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text,
    sender,
    timestamp: new Date().toISOString(),
    ...additionalData,
  };
};

/**
 * Utility function to format timestamp for display
 */
export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Debounced function for API calls
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait) as unknown as number;
  };
};

/**
 * Storage utilities for chat widget state
 */
export const chatStorage = {
  getWidgetState: (): boolean => {
    const stored = localStorage.getItem("chatbot-widget-open");
    return stored ? JSON.parse(stored) : false;
  },

  setWidgetState: (isOpen: boolean): void => {
    localStorage.setItem("chatbot-widget-open", JSON.stringify(isOpen));
  },

  getConversationHistory: (): ChatMessage[] => {
    const stored = localStorage.getItem("chatbot-conversation-history");
    return stored ? JSON.parse(stored) : [];
  },

  setConversationHistory: (messages: ChatMessage[]): void => {
    localStorage.setItem(
      "chatbot-conversation-history",
      JSON.stringify(messages)
    );
  },

  clearConversationHistory: (): void => {
    localStorage.removeItem("chatbot-conversation-history");
  },
};
