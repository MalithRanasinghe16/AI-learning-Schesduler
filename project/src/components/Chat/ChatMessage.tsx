import React from "react";
import { Bot, User } from "lucide-react";
import moment from "moment";
import { ChatMessage as ChatMessageType } from "../../types";

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message }) => {
  const isBot = message.sender === "bot";
  const timestamp = moment(message.timestamp).format("h:mm A, MMM DD, YYYY");

  return (
    <div
      className={`flex ${
        isBot ? "justify-start" : "justify-end"
      } mb-4 animate-fade-in`}
    >
      <div
        className={`flex max-w-[80%] ${
          isBot ? "flex-row" : "flex-row-reverse"
        }`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isBot
              ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white mr-3"
              : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white ml-3"
          }`}
        >
          {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
        </div>

        {/* Message content */}
        <div className="flex flex-col">
          <div
            className={`px-4 py-2 rounded-lg shadow-sm ${
              isBot
                ? "bg-indigo-200 dark:bg-indigo-800 text-gray-800 dark:text-indigo-100 rounded-bl-none"
                : "bg-cyan-200 dark:bg-cyan-800 text-gray-800 dark:text-cyan-100 rounded-br-none"
            }`}
          >
            {/* Message text with markdown-like formatting */}
            <div
              className="text-sm leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: message.text
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\*(.*?)\*/g, "<em>$1</em>")
                  .replace(
                    /`(.*?)`/g,
                    '<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">$1</code>'
                  )
                  .replace(/\n/g, "<br/>"),
              }}
            />

            {/* Intent and confidence for bot messages */}
            {isBot && message.intent && message.confidence && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Intent: {message.intent} ({Math.round(message.confidence * 100)}
                %)
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div
            className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${
              isBot ? "text-left" : "text-right"
            }`}
          >
            {timestamp}
          </div>
        </div>
      </div>
    </div>
  );
});

ChatMessage.displayName = "ChatMessage";

export default ChatMessage;
