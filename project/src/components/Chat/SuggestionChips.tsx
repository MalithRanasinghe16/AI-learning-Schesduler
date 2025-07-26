import React from "react";

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

  return (
    <div className="mb-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
        💡 Quick suggestions:
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => !disabled && onSuggestionClick(suggestion)}
            disabled={disabled}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium
              bg-purple-200 hover:bg-purple-300 text-purple-800
              dark:bg-purple-800 dark:hover:bg-purple-700 dark:text-purple-200
              transition-all duration-200 transform hover:scale-105
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1
              shadow-sm hover:shadow-md
            `}
            title={`Click to send: "${suggestion}"`}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestionChips;
