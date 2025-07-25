import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Loader2,
  Minimize2,
  Maximize2,
  Calendar,
  Eye,
  Plus,
  BarChart3,
  Settings,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  message: string;
  color: string;
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  intent?: string;
  confidence?: number;
  actions?: Array<{ type: string; [key: string]: any }>;
  quickActions?: QuickAction[];
  suggestions?: string[];
}

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onToggle }) => {
  const { user } = useAuth();

  // Define quick actions for easy user interaction
  const quickActions: QuickAction[] = [
    {
      id: "create-schedule",
      label: "Create Schedule",
      icon: <Calendar className="w-4 h-4" />,
      message: "Create a new study schedule for my subjects",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      id: "view-schedule",
      label: "View Schedule",
      icon: <Eye className="w-4 h-4" />,
      message: "Show my current schedule",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      id: "add-subject",
      label: "Add Subject",
      icon: <Plus className="w-4 h-4" />,
      message: "Add a new subject to my profile",
      color: "bg-purple-500 hover:bg-purple-600",
    },
    {
      id: "view-analytics",
      label: "View Progress",
      icon: <BarChart3 className="w-4 h-4" />,
      message: "Show my study progress and analytics",
      color: "bg-orange-500 hover:bg-orange-600",
    },
  ];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your AI study scheduler assistant. Choose an option below or type your question:",
      sender: "bot",
      timestamp: new Date(),
      quickActions: quickActions,
      suggestions: [
        "Create schedule for math and physics",
        "What's my schedule for today?",
        "Show my study progress",
        "Help me understand how this works",
      ],
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const CHATBOT_API_URL = "http://localhost:8000";

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    // Initialize speech recognition
    if ("webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = inputText.trim();
    setInputText("");
    setIsLoading(true);

    // Use the new shared function
    await handleChatbotRequest(messageText);
  };

  const handleBotActions = (
    actions: Array<{ type: string; [key: string]: any }>
  ) => {
    actions.forEach((action) => {
      switch (action.type) {
        case "create_schedule":
          // Could trigger a schedule creation flow
          console.log("Bot wants to create schedule:", action);
          break;
        case "show_schedule_details":
          // Could open schedule view
          console.log("Bot wants to show schedule details:", action);
          break;
        case "redirect_to_analytics":
          // Could navigate to analytics page
          console.log("Bot wants to show analytics:", action);
          break;
        default:
          console.log("Unknown bot action:", action);
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleQuickAction = async (action: QuickAction) => {
    // Prevent multiple simultaneous requests
    if (isLoading) return;

    // Simulate user clicking on a quick action
    setInputText(action.message);

    // Auto-send the message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: action.message,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Send to chatbot API (await to handle errors properly)
      await handleChatbotRequest(action.message);
    } catch (error) {
      console.error("Error in handleQuickAction:", error);
      // Error is already handled in handleChatbotRequest, but ensure loading is stopped
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    // Prevent multiple simultaneous requests
    if (isLoading) return;

    setInputText(suggestion);

    // Auto-send the suggestion
    const userMessage: Message = {
      id: Date.now().toString(),
      text: suggestion,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Send to chatbot API (await to handle errors properly)
      await handleChatbotRequest(suggestion);
    } catch (error) {
      console.error("Error in handleSuggestionClick:", error);
      // Error is already handled in handleChatbotRequest, but ensure loading is stopped
      setIsLoading(false);
    }
  };

  const handleChatbotRequest = async (messageText: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${CHATBOT_API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: messageText,
          user_id: user?._id,
          conversation_id: conversationId || undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Update conversation ID if provided
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }

      // Create bot response with potential quick actions
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: "bot",
        timestamp: new Date(),
        intent: data.intent,
        confidence: data.confidence,
        actions: data.actions,
        // Add contextual quick actions based on intent
        quickActions: getContextualQuickActions(data.intent),
        suggestions: getContextualSuggestions(data.intent),
      };

      setMessages((prev) => [...prev, botMessage]);

      // Handle specific actions
      if (data.actions && data.actions.length > 0) {
        handleBotActions(data.actions);
      }
    } catch (error) {
      console.error("Error sending message:", error);

      // Determine error message based on error type
      let errorText =
        "I'm sorry, I'm having trouble connecting right now. Please make sure the chatbot service is running and try again.";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorText = "The request timed out. Please try again.";
        } else if (error.message.includes("401")) {
          errorText = "Authentication error. Please try logging in again.";
        } else if (error.message.includes("Failed to fetch")) {
          errorText =
            "Cannot connect to the chatbot service. Please check if it's running on port 8000.";
        }
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        sender: "bot",
        timestamp: new Date(),
        quickActions: quickActions, // Show main actions on error
        suggestions: [
          "Try again",
          "Check chatbot service status",
          "Contact support",
        ],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      // Always ensure loading is set to false
      setIsLoading(false);
    }
  };

  const getContextualQuickActions = (intent: string): QuickAction[] => {
    switch (intent) {
      case "create_schedule":
        return [
          {
            id: "specify-subjects",
            label: "My Subjects",
            icon: <Plus className="w-4 h-4" />,
            message: "Show me my available subjects",
            color: "bg-blue-500 hover:bg-blue-600",
          },
          {
            id: "this-week",
            label: "This Week",
            icon: <Calendar className="w-4 h-4" />,
            message: "Create schedule for this week",
            color: "bg-green-500 hover:bg-green-600",
          },
        ];
      case "get_schedule":
        return [
          {
            id: "today-schedule",
            label: "Today",
            icon: <Calendar className="w-4 h-4" />,
            message: "Show my schedule for today",
            color: "bg-blue-500 hover:bg-blue-600",
          },
          {
            id: "week-schedule",
            label: "This Week",
            icon: <Calendar className="w-4 h-4" />,
            message: "Show my schedule for this week",
            color: "bg-green-500 hover:bg-green-600",
          },
        ];
      default:
        return quickActions.slice(0, 2); // Show main actions
    }
  };

  const getContextualSuggestions = (intent: string): string[] => {
    switch (intent) {
      case "create_schedule":
        return [
          "Create schedule for math and physics this week",
          "Make a study plan for tomorrow",
          "Schedule all my subjects for next week",
        ];
      case "get_schedule":
        return [
          "What's my schedule for today?",
          "Show my schedule for tomorrow",
          "Display this week's plan",
        ];
      case "general_question":
        return [
          "How do I create a schedule?",
          "What subjects do I have?",
          "Show me my progress",
        ];
      default:
        return [
          "Create a new schedule",
          "View my current schedule",
          "Show my study progress",
        ];
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMessageIcon = (sender: "user" | "bot") => {
    if (sender === "bot") {
      return <Bot className="w-6 h-6 text-blue-500" />;
    }
    return <User className="w-6 h-6 text-gray-600" />;
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onToggle}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105"
          aria-label="Open chat"
        >
          <Bot className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Bot className="w-7 h-7" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <h3 className="font-bold text-lg">AI Study Assistant</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-sm font-medium opacity-90">
                Online & Ready to Help
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
          aria-label="Minimize chat"
          title="Minimize chat"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-blue-50">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Welcome to your AI Learning Scheduler!
            </h3>
            <p className="text-gray-600 max-w-sm mx-auto mb-6">
              I'm here to help you organize your study schedule efficiently. You
              can:
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-sm">
              <div className="bg-white p-3 rounded-lg shadow-sm border">
                <Plus className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <span className="text-gray-700 font-medium">Add Subjects</span>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border">
                <Calendar className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <span className="text-gray-700 font-medium">
                  Create Schedules
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border">
                <Eye className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <span className="text-gray-700 font-medium">View Progress</span>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border">
                <BarChart3 className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <span className="text-gray-700 font-medium">Get Analytics</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Ask me anything or use the buttons below!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex items-start space-x-2 max-w-[80%] ${
                  message.sender === "user"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  {getMessageIcon(message.sender)}
                </div>
                <div
                  className={`rounded-lg px-4 py-2 ${
                    message.sender === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-800 border border-gray-200"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>

                  {/* Quick Actions for Bot Messages */}
                  {message.sender === "bot" &&
                    message.quickActions &&
                    message.quickActions.length > 0 && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                        <p className="text-xs text-gray-700 font-semibold mb-3 flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          Choose an option:
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {message.quickActions.map((action) => (
                            <button
                              key={action.id}
                              onClick={() => handleQuickAction(action)}
                              className={`${action.color} text-sm px-4 py-3 rounded-lg flex items-center space-x-3 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
                              disabled={isLoading}
                            >
                              <span className="flex-shrink-0">
                                {action.icon}
                              </span>
                              <span className="text-left">{action.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Suggestions for Bot Messages */}
                  {message.sender === "bot" &&
                    message.suggestions &&
                    message.suggestions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-gray-600 font-medium">
                          Suggestions:
                        </p>
                        <div className="space-y-1">
                          {message.suggestions
                            .slice(0, 3)
                            .map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() =>
                                  handleSuggestionClick(suggestion)
                                }
                                className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                                disabled={isLoading}
                              >
                                💬 {suggestion}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`text-xs ${
                        message.sender === "user"
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {formatTimestamp(message.timestamp)}
                    </span>
                    {message.intent && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded ml-2">
                        {message.intent} (
                        {Math.round((message.confidence || 0) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <Bot className="w-6 h-6 text-blue-500 mt-1" />
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 rounded-b-lg">
        {!isLoading && (
          <div className="text-xs text-gray-600 mb-2 text-center">
            💡 Ask me to add subjects, create schedules, or view your progress
          </div>
        )}
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isLoading
                  ? "Please wait..."
                  : "Ask me anything about your studies..."
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isLoading}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              </div>
            )}
          </div>

          {/* Voice input button */}
          {recognitionRef.current && (
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-2 rounded-lg transition-colors ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
              disabled={isLoading}
              aria-label={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 disabled:hover:scale-100"
            aria-label="Send message"
            title={isLoading ? "Please wait..." : "Send message (Enter)"}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {isListening && (
          <div className="mt-2 text-center">
            <span className="text-sm text-red-500 animate-pulse">
              🎤 Listening...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWidget;
