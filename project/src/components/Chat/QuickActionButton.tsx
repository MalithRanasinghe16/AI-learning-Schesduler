import React from "react";
import {
  Calendar,
  Eye,
  Plus,
  BarChart3,
  Brain,
  MessageSquare,
  Settings,
  Home,
  Play,
  RefreshCw,
  Star,
  CheckCircle,
  X,
} from "lucide-react";
import { QuickAction } from "../../types";

interface QuickActionButtonProps {
  action: QuickAction;
  onClick: (message: string) => void;
  disabled?: boolean;
}

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, React.ReactNode> = {
  calendar: <Calendar className="w-4 h-4" />,
  eye: <Eye className="w-4 h-4" />,
  plus: <Plus className="w-4 h-4" />,
  chart: <BarChart3 className="w-4 h-4" />,
  brain: <Brain className="w-4 h-4" />,
  message: <MessageSquare className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  home: <Home className="w-4 h-4" />,
  play: <Play className="w-4 h-4" />,
  refresh: <RefreshCw className="w-4 h-4" />,
  star: <Star className="w-4 h-4" />,
  check: <CheckCircle className="w-4 h-4" />,
  x: <X className="w-4 h-4" />,
  default: <MessageSquare className="w-4 h-4" />,
};

const QuickActionButton: React.FC<QuickActionButtonProps> = React.memo(
  ({ action, onClick, disabled = false }) => {
    const icon = iconMap[action.icon] || iconMap.default;

    const handleClick = () => {
      if (!disabled) {
        onClick(action.message);
      }
    };

    return (
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
        group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
        transition-all duration-200 transform hover:scale-105
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${action.color} 
        shadow-sm hover:shadow-md
        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1
      `}
        title={`${action.label} - Click to ${action.message}`}
        aria-label={action.label}
      >
        {icon}
        <span className="truncate">{action.label}</span>
      </button>
    );
  }
);

QuickActionButton.displayName = "QuickActionButton";

export default QuickActionButton;
