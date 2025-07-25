import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  X, Clock, Target, BookOpen, Calendar, 
  Play, Pause, CheckCircle, XCircle, 
  Edit2, Trash2, RotateCcw, LucideIcon
} from 'lucide-react';
import { ScheduleSession, Subject } from '../../types';

interface ActionButton {
  id: string;
  label: string;
  icon: LucideIcon;
  action: () => void;
}

interface SessionBlockProps {
  session: ScheduleSession;
  subject?: Subject;
  onUpdate: (session: ScheduleSession) => void;
  onDelete: (sessionId: string) => void;
  onClose: () => void;
}

const SessionBlock: React.FC<SessionBlockProps> = ({
  session,
  subject,
  onUpdate,
  onDelete,
  onClose
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSession, setEditedSession] = useState(session);

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500';
      case 'in-progress':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'missed':
        return 'bg-red-500';
      case 'rescheduled':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Priority labels
  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Low';
      case 2: return 'Medium-Low';
      case 3: return 'Medium';
      case 4: return 'High';
      case 5: return 'Critical';
      default: return 'Medium';
    }
  };

  // Status action buttons
  const getAvailableActions = (): ActionButton[] => {
    const actions: ActionButton[] = [];
    
    switch (session.status) {
      case 'scheduled':
        actions.push(
          { id: 'start', label: 'Start Session', icon: Play, action: () => updateStatus('in-progress') },
          { id: 'miss', label: 'Mark as Missed', icon: XCircle, action: () => updateStatus('missed') }
        );
        break;
      case 'in-progress':
        actions.push(
          { id: 'complete', label: 'Complete', icon: CheckCircle, action: () => updateStatus('completed') },
          { id: 'pause', label: 'Pause', icon: Pause, action: () => updateStatus('scheduled') }
        );
        break;
      case 'missed':
        actions.push(
          { id: 'reschedule', label: 'Reschedule', icon: RotateCcw, action: () => updateStatus('rescheduled') }
        );
        break;
      case 'completed':
        actions.push(
          { id: 'reopen', label: 'Reopen', icon: RotateCcw, action: () => updateStatus('scheduled') }
        );
        break;
    }
    
    return actions;
  };

  const updateStatus = (newStatus: ScheduleSession['status']) => {
    const updatedSession = { ...session, status: newStatus };
    onUpdate(updatedSession);
  };

  const handleSaveEdit = () => {
    onUpdate(editedSession);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedSession(session);
    setIsEditing(false);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white border-opacity-20">
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${getStatusColor(session.status)}`}></div>
            <h3 className="text-lg font-semibold text-white">
              {subject?.name || 'Unknown Subject'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <div className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(session.status)}`}>
              {session.status.replace('-', ' ').toUpperCase()}
            </div>
            <div className="text-sm text-gray-300">
              Priority: {getPriorityLabel(session.priority)}
            </div>
          </div>

          {/* Session Details */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-gray-300">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">
                {format(new Date(session.startTime), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-gray-300">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-gray-300">
              <Target className="h-4 w-4" />
              <span className="text-sm">
                Duration: {formatDuration(session.duration)}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-gray-300">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm capitalize">
                Type: {session.sessionType}
              </span>
            </div>
          </div>

          {/* Subject Details */}
          {subject && (
            <div className="bg-white bg-opacity-10 rounded-lg p-3 space-y-2">
              <h4 className="text-sm font-medium text-white">Subject Details</h4>
              <div className="text-xs text-gray-300 space-y-1">
                <div>Difficulty: <span className="capitalize">{subject.difficulty}</span></div>
                <div>Progress: {subject.progress}%</div>
                <div>Category: {subject.category}</div>
              </div>
              {subject.description && (
                <div className="text-xs text-gray-300 mt-2">
                  {subject.description}
                </div>
              )}
            </div>
          )}

          {/* Adaptation Reason */}
          {session.adaptationReason && (
            <div className="bg-yellow-500 bg-opacity-20 border border-yellow-500 border-opacity-30 rounded-lg p-3">
              <h4 className="text-sm font-medium text-yellow-300">AI Adaptation</h4>
              <p className="text-xs text-yellow-200 mt-1">
                {session.adaptationReason}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-white border-opacity-20">
          {/* Status Actions */}
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-white">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              {getAvailableActions().map(action => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="flex items-center space-x-1 px-3 py-2 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-lg text-sm text-white transition-colors"
                >
                  <action.icon className="h-4 w-4" />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Edit/Delete Actions */}
          <div className="flex justify-between">
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                <span>Edit</span>
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this session?')) {
                    onDelete(session._id);
                  }
                }}
                className="flex items-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* Edit Modal Overlay */}
        {isEditing && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm">
              <h4 className="text-white font-medium mb-4">Edit Session</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={editedSession.duration}
                    onChange={(e) => setEditedSession({
                      ...editedSession,
                      duration: parseInt(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Priority</label>
                  <select
                    value={editedSession.priority}
                    onChange={(e) => setEditedSession({
                      ...editedSession,
                      priority: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value={1}>Low</option>
                    <option value={2}>Medium-Low</option>
                    <option value={3}>Medium</option>
                    <option value={4}>High</option>
                    <option value={5}>Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Session Type</label>
                  <select
                    value={editedSession.sessionType}
                    onChange={(e) => setEditedSession({
                      ...editedSession,
                      sessionType: e.target.value as any
                    })}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="study">Study</option>
                    <option value="review">Review</option>
                    <option value="practice">Practice</option>
                    <option value="break">Break</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionBlock;
