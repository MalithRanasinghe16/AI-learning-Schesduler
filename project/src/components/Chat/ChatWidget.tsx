import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  Suspense,
  lazy,
} from "react";
import {
  Send,
  Bot,
  Minimize2,
  X,
  Brain,
  Calendar,
  Plus,
  BarChart3,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import {
  ChatMessage as ChatMessageType,
  ChatContext,
  ChatResponse,
  QuickAction,
} from "../../types";
import {
  chatbotService,
  createChatMessage,
  debounce,
  chatStorage,
} from "../../services/chatbot";

// Lazy load components for better performance
const ChatMessage = lazy(() => import("./ChatMessage"));
const QuickActionButton = lazy(() => import("./QuickActionButton"));
const ProgressTracker = lazy(() => import("./ProgressTracker"));
const SuggestionChips = lazy(() => import("./SuggestionChips"));
const LoadingSkeleton = lazy(() => import("./LoadingSkeleton"));

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onToggle }) => {
  const { user } = useAuth();

  // State management
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [chatContext, setChatContext] = useState<ChatContext>({
    currentStep: "",
    flow: null,
  });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Enhanced quick actions with AI prioritization features
  const defaultQuickActions: QuickAction[] = [
    {
      id: "add-subject",
      label: "Add Subject",
      icon: "plus",
      message: "Add a new subject",
      color: "bg-purple-500 hover:bg-purple-600 text-white",
    },
    {
      id: "generate-schedule",
      label: "Generate Schedule",
      icon: "calendar",
      message: "Generate an AI-optimized schedule",
      color: "bg-indigo-500 hover:bg-indigo-600 text-white",
    },
    {
      id: "get-recommendation",
      label: "Get AI Recommendation",
      icon: "brain",
      message: "What should I study next?",
      color: "bg-cyan-500 hover:bg-cyan-600 text-white",
    },
    {
      id: "view-analytics",
      label: "View Progress",
      icon: "chart",
      message: "Show my study progress and analytics",
      color: "bg-orange-500 hover:bg-orange-600 text-white",
    },
  ];

  // Add error boundary component for lazy loading
  const ErrorFallback = ({
    error,
    resetError,
  }: {
    error: Error;
    resetError: () => void;
  }) => (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <h3 className="text-red-800 dark:text-red-200 font-medium">
        Something went wrong
      </h3>
      <p className="text-red-700 dark:text-red-300 text-sm mt-1">
        {error.message}
      </p>
      <button
        onClick={resetError}
        className="mt-2 px-3 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded text-sm hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );

  // Health check function with retry logic
  const checkChatbotHealth = async (retryCount = 0) => {
    try {
      setInitError(null);
      await chatbotService.healthCheck();
      setIsConnected(true);
      setIsInitialized(true);
      console.log("✅ Chatbot service connected");
    } catch (error) {
      console.warn("⚠️ Chatbot service check failed:", error);
      setIsConnected(false);

      // Retry logic for initial connection
      if (retryCount < 2) {
        console.log(`🔄 Retrying chatbot connection (${retryCount + 1}/3)...`);
        setTimeout(() => {
          checkChatbotHealth(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
      } else {
        setInitError(
          "Chatbot service is temporarily unavailable. You can still use the app, but AI features may be limited."
        );
        setIsInitialized(true); // Still allow the widget to initialize
      }
    }
  };

  // Initialize chat widget with error handling
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Check chatbot health on mount
        await checkChatbotHealth();

        // Load conversation history from storage
        const savedMessages = chatStorage.getConversationHistory();
        if (savedMessages.length > 0) {
          setMessages(savedMessages);
        } else {
          // Set initial welcome message
          const welcomeMessage = createChatMessage(
            `🤖 **Welcome to your AI Study Assistant!**

I'm here to help you with:
✅ **Adding subjects** with AI prioritization
✅ **Creating optimized schedules** 
✅ **Getting study recommendations**
✅ **Tracking your progress**

Ask me anything or use the quick actions below! 🚀`,
            "bot",
            {
              quickActions: defaultQuickActions,
              suggestions: [],
            }
          );
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error("❌ Chat initialization error:", error);
        setInitError("Failed to initialize chat. Please refresh the page.");
        setIsInitialized(true);
      }
    };

    initializeChat();
  }, []);

  // Listen for custom events from other components
  useEffect(() => {
    const handleChatbotEvent = (event: CustomEvent) => {
      const { message } = event.detail;
      if (message && !isOpen) {
        onToggle(); // Open the chat widget
      }
      if (message) {
        setInputText(message);
        // Auto-send the message after a short delay
        setTimeout(() => {
          handleSendMessage(message);
        }, 500);
      }
    };

    window.addEventListener(
      "open-chatbot",
      handleChatbotEvent as EventListener
    );
    return () => {
      window.removeEventListener(
        "open-chatbot",
        handleChatbotEvent as EventListener
      );
    };
  }, [isOpen, onToggle]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save conversation history to storage when messages change
  useEffect(() => {
    if (messages.length > 0) {
      chatStorage.setConversationHistory(messages);
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Debounced API call function
  const debouncedSendMessage = useCallback(
    debounce(async (message: string, userId: string) => {
      try {
        const response = await chatbotService.sendMessage({
          message,
          user_id: userId,
          conversation_id: conversationId,
        });

        // Process the response
        const botMessage = createChatMessage(response.response, "bot", {
          intent: response.intent,
          confidence: response.confidence,
          quickActions: response.quick_actions || [],
          suggestions: response.suggestions || [],
          conversationId: response.conversation_id,
        });

        setMessages((prev) => [...prev, botMessage]);
        setConversationId(response.conversation_id);

        // Update chat context if progress information is available
        if (response.progress) {
          setChatContext((prev) => ({
            ...prev,
            progress: response.progress,
          }));
        }

        // Update flow context based on intent
        if (response.intent?.includes("subject")) {
          setChatContext((prev) => ({ ...prev, flow: "subject" }));
        } else if (response.intent?.includes("schedule")) {
          setChatContext((prev) => ({ ...prev, flow: "schedule" }));
        } else if (response.intent?.includes("feedback")) {
          setChatContext((prev) => ({ ...prev, flow: "feedback" }));
        } else if (response.intent?.includes("optimal")) {
          setChatContext((prev) => ({ ...prev, flow: "optimal_subject" }));
        }
      } catch (error: any) {
        console.error("Error sending message:", error);
        setIsConnected(false);

        // Determine the error type and provide appropriate feedback
        let errorText =
          "Sorry, I encountered an error. Please try again later.";
        let isAuthError = false;

        if (error.code === "ECONNREFUSED") {
          errorText =
            "🔌 **Connection Error**\n\nThe chatbot service is not running. Please start the chatbot server and try again.";
          toast.error(
            "Chatbot service is not running. Please start the chatbot server."
          );
        } else if (
          error.response?.status === 401 ||
          error.response?.status === 403
        ) {
          errorText =
            "🔐 **Authentication Required**\n\nUsing demo mode for testing. For full functionality, please log in to your account.";
          isAuthError = true;
          toast.info("Using demo mode - please log in for full functionality");
        } else if (error.response?.status >= 500) {
          errorText =
            "🛠️ **Server Error**\n\nThe chatbot server encountered an internal error. Please try again in a moment.";
          toast.error("Server error occurred. Please try again.");
        } else {
          errorText =
            error.userMessage ||
            "🤖 **Connection Issue**\n\nI'm having trouble connecting to my services. Please check your internet connection and try again.";
          toast.error(error.userMessage || "Failed to send message");
        }

        const errorMessage = createChatMessage(errorText, "bot", {
          isError: true,
          suggestions: isAuthError
            ? ["Login to your account", "Continue in demo mode"]
            : ["Try again", "Check connection"],
        });
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [conversationId]
  );

  const handleSendMessage = async (messageText?: string) => {
    const message = messageText || inputText.trim();
    if (!message || isLoading) return;

    // For demo purposes, create a demo user if no user is logged in
    const currentUserId = user?._id || "demo_user_12345";

    // Check connection before sending
    if (!isConnected) {
      toast.warn("Chatbot is offline. Attempting to reconnect...");
      await checkChatbotHealth();
      if (!isConnected) {
        toast.error(
          "Unable to connect to chatbot service. Please ensure it's running."
        );
        return;
      }
    }

    // Add user message to chat
    const userMessage = createChatMessage(message, "user");
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    // Send to chatbot service
    await debouncedSendMessage(message, currentUserId);
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSendMessage(action.message);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === "Escape") {
      setInputText("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 500) {
      setInputText(value);
    }
  };

  const handleClearChat = () => {
    // Clear messages from state
    setMessages([]);
    // Clear from local storage
    chatStorage.clearConversationHistory();
    // Reset conversation context
    setConversationId("");
    setChatContext({
      currentStep: "",
      flow: null,
    });
    // Show a fresh welcome message
    const welcomeMessage = createChatMessage(
      `🤖 **Chat Cleared!**

Welcome back to your AI Study Assistant! 

I'm here to help you with:
✅ **Adding subjects** with AI prioritization
✅ **Creating optimized schedules** 
✅ **Getting study recommendations**
✅ **Tracking your progress**

How can I assist you today? 🚀`,
      "bot",
      {
        quickActions: defaultQuickActions,
        suggestions: [],
      }
    );
    setMessages([welcomeMessage]);
  };

  // Get current quick actions (default or from latest bot message)
  const currentQuickActions =
    messages.length > 0
      ? messages[messages.length - 1]?.quickActions || defaultQuickActions
      : defaultQuickActions;

  // Get current suggestions from latest bot message, but filter out duplicates
  const currentSuggestions = (() => {
    if (messages.length === 0) return [];

    const lastMessage = messages[messages.length - 1];
    const rawSuggestions = lastMessage?.suggestions || [];

    // Get the text content of current quick actions for comparison
    const quickActionTexts = currentQuickActions.map((action) =>
      action.message.toLowerCase().trim()
    );

    // Define common action keywords to avoid duplication
    const actionKeywords = [
      ["add", "subject"],
      ["new", "subject"],
      ["create", "schedule"],
      ["generate", "schedule"],
      ["make", "schedule"],
      ["show", "progress"],
      ["view", "progress"],
      ["my", "progress"],
      ["progress"],
      ["recommendation"],
      ["suggest"],
      ["what", "study"],
      ["study", "next"],
    ];

    // Filter out suggestions that match quick action functionality
    const filteredSuggestions = rawSuggestions.filter((suggestion) => {
      const suggestionLower = suggestion.toLowerCase().trim();

      // Check if suggestion matches any quick action text directly
      const matchesQuickAction = quickActionTexts.some(
        (actionText) =>
          actionText.includes(suggestionLower) ||
          suggestionLower.includes(actionText)
      );

      if (matchesQuickAction) return false;

      // Check if suggestion contains action keywords that match quick actions
      const containsActionKeywords = actionKeywords.some((keywords) =>
        keywords.every((keyword) => suggestionLower.includes(keyword))
      );

      // Only include suggestions that don't duplicate quick action functionality
      return !containsActionKeywords;
    });

    return filteredSuggestions;
  })();

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-full shadow-lg hover:from-indigo-600 hover:to-cyan-600 transition-all duration-300 hover:scale-110 animate-fade-in"
          aria-label="Open chat"
        >
          <Bot className="h-6 w-6 mx-auto" />
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[500px] h-[650px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col animate-slide-up md:w-[500px] sm:w-full sm:h-full sm:bottom-0 sm:right-0 sm:rounded-none">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-t-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">AI Study Assistant</h3>
                <p className="text-xs opacity-80">
                  {isLoading
                    ? "Thinking..."
                    : isConnected
                    ? user
                      ? "Online"
                      : "Demo Mode"
                    : "Offline (Chatbot service unavailable)"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleClearChat}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Clear chat"
                title="Clear chat history"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={onToggle}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Minimize chat"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={onToggle}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress Tracker */}
          {chatContext.progress && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <Suspense
                fallback={
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                }
              >
                <ProgressTracker
                  current={chatContext.progress.current}
                  total={chatContext.progress.total}
                  stepName={chatContext.progress.stepName}
                  flow={chatContext.flow}
                />
              </Suspense>
            </div>
          )}

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
          >
            {/* Error Display */}
            {initError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Chat Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <p>{initError}</p>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          setInitError(null);
                          setIsInitialized(false);
                          checkChatbotHealth();
                        }}
                        className="bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-1 rounded text-sm hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state for initialization */}
            {!isInitialized && !initError && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Initializing chat...</span>
                </div>
              </div>
            )}

            {/* Messages */}
            {isInitialized && (
              <Suspense
                fallback={
                  <div className="space-y-4">
                    <LoadingSkeleton />
                    <LoadingSkeleton />
                  </div>
                }
              >
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              </Suspense>
            )}

            {isLoading && (
              <Suspense fallback={<div className="h-16"></div>}>
                <LoadingSkeleton />
              </Suspense>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {currentSuggestions.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
              <Suspense
                fallback={
                  <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                }
              >
                <SuggestionChips
                  suggestions={currentSuggestions}
                  onSuggestionClick={handleSuggestionClick}
                />
              </Suspense>
            </div>
          )}

          {/* Quick Actions */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <div className="flex flex-wrap gap-2">
              <Suspense
                fallback={
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-8 w-20 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"
                      ></div>
                    ))}
                  </div>
                }
              >
                {currentQuickActions.slice(0, 4).map((action) => (
                  <QuickActionButton
                    key={action.id}
                    action={action}
                    onClick={() => handleQuickAction(action)}
                  />
                ))}
              </Suspense>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-end space-x-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  maxLength={500}
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {inputText.length}/500
                </div>
              </div>
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                className="p-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-lg hover:from-indigo-600 hover:to-cyan-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
