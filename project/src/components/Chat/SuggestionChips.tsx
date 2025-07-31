import React from "react";
import { Lightbulb, Sparkles, Brain } from "lucide-react";

interface SuggestionChipsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  disabled?: boolean;
}

const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  suggestions,
  onSuggestionClick,
  disabled = false,
}) => {
  if (!suggestions || suggestions.length === 0) return null;

  const getChipIcon = (suggestion: string) => {
    const text = suggestion.toLowerCase();
    if (text.includes("schedule") || text.includes("create")) {
      return "📅";
    } else if (text.includes("study") || text.includes("what should")) {
      return "🎯";
    } else if (text.includes("progress") || text.includes("analytics")) {
      return "📊";
    } else if (text.includes("subject") || text.includes("add")) {
      return "📝";
    } else if (text.includes("menu")) {
      return "🏠";
    }
    return "💡";
  };

  const getChipColor = (index: number) => {
    const colors = [
      "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white",
      "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white",
      "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white",
      "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white",
      "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white",
      "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <p className="text-xs text-gray-700 dark:text-gray-200 font-semibold">
          AI Suggestions
        </p>
        <Sparkles className="w-3 h-3 text-yellow-500" />
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => !disabled && onSuggestionClick(suggestion)}
            disabled={disabled}
            className={`
              px-3 py-2 rounded-lg text-xs font-medium
              ${getChipColor(index)}
              transition-all duration-200 transform hover:scale-105 hover:shadow-md
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1
              shadow-sm active:scale-95
              flex items-center gap-1.5 min-h-[2rem]
            `}
            title={`Click to send: "${suggestion}"`}
          >
            <span className="text-sm">{getChipIcon(suggestion)}</span>
            <span className="text-xs leading-tight">{suggestion}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 italic flex items-center gap-1">
        <span>💬</span>
        <span>
          Click a suggestion above or type your own natural language message
          below
        </span>
      </div>
    </div>
  );
};

export default SuggestionChips;
