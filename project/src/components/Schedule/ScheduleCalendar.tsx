import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Filter } from 'lucide-react';
import { ScheduleSession, Subject, CalendarEvent, Schedule } from '../../types';
import WeekView from './WeekView.tsx';
import DayView from './DayView.tsx';
import SessionBlock from './SessionBlock.tsx';
import { apiService } from '../../services/api';
import { toast } from 'react-toastify';

interface ScheduleCalendarProps {
  schedule?: Schedule;
  subjects?: Subject[];
  onSessionUpdate?: (session: ScheduleSession) => void;
  onSessionCreate?: (session: Partial<ScheduleSession>) => void;
}

type ViewType = 'week' | 'day';

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  schedule,
  subjects = [],
  onSessionUpdate,
  onSessionCreate
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('week');
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ScheduleSession | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Convert sessions to calendar events
  const calendarEvents: CalendarEvent[] = sessions.map(session => {
    const subject = typeof session.subjectId === 'object' 
      ? session.subjectId 
      : subjects.find(s => s._id === session.subjectId);
    
    return {
      id: session._id,
      title: subject?.name || 'Unknown Subject',
      start: new Date(session.startTime),
      end: new Date(session.endTime),
      subjectId: typeof session.subjectId === 'object' ? session.subjectId._id : session.subjectId,
      subjectName: subject?.name || 'Unknown Subject',
      status: session.status,
      priority: session.priority,
      sessionType: session.sessionType,
      duration: session.duration,
      canEdit: session.status === 'scheduled' || session.status === 'missed'
    };
  });

  // Filter events based on status filter
  const filteredEvents = statusFilter === 'all' 
    ? calendarEvents 
    : calendarEvents.filter(event => event.status === statusFilter);

  // Load sessions from the provided schedule or fetch from API
  useEffect(() => {
    if (schedule) {
      // Use sessions from the provided schedule
      setSessions(schedule.sessions || []);
      setIsLoading(false);
    } else {
      // Fallback to fetching sessions from API
      fetchSessions();
    }
  }, [schedule, currentDate]);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      
      // Get schedule sessions for the current week
      const { sessions: fetchedSessions } = await apiService.getScheduleSessions(
        undefined, // scheduleId - get all schedules
        weekStart.toISOString(), 
        weekEnd.toISOString()
      );
      
      setSessions(fetchedSessions);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
      setIsLoading(false);
    }
  };

  const handlePreviousWeek = () => {
    setCurrentDate(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => addDays(prev, 7));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleSessionClick = (event: CalendarEvent) => {
    const session = sessions.find(s => s._id === event.id);
    if (session) {
      setSelectedSession(session);
    }
  };

  const handleSessionUpdate = async (updatedSession: ScheduleSession) => {
    try {
      // Update session status
      await apiService.updateSessionStatus(updatedSession._id, updatedSession.status);
      
      // Update local state
      setSessions(prev => prev.map(s => 
        s._id === updatedSession._id ? updatedSession : s
      ));
      
      onSessionUpdate?.(updatedSession);
      toast.success('Session updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update session: ${error.message}`);
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    try {
      await apiService.deleteScheduleSession(sessionId);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      setSelectedSession(null);
      toast.success('Session deleted successfully!');
    } catch (error: any) {
      toast.error(`Failed to delete session: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-r from-indigo-900 to-purple-900 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        <div className="ml-4 text-white">
          <p>Loading calendar...</p>
        </div>
      </div>
    );
  }

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  return (
    <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <CalendarIcon className="h-6 w-6 text-white" />
          <h2 className="text-xl font-semibold text-white">
            Schedule Calendar
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View Toggle */}
          <div className="bg-white bg-opacity-10 rounded-lg p-1">
            <button
              onClick={() => setViewType('week')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewType === 'week'
                  ? 'bg-white text-indigo-800'
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewType('day')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewType === 'day'
                  ? 'bg-white text-indigo-800'
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
            >
              Day
            </button>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-4 p-3 bg-white bg-opacity-10 rounded-lg">
          <div className="flex items-center space-x-4">
            <span className="text-white text-sm font-medium">Filter by status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
            >
              <option value="all">All Sessions</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
            </select>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePreviousWeek}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <h3 className="text-lg font-medium text-white min-w-0">
            {viewType === 'week' 
              ? `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
              : format(currentDate, 'EEEE, MMMM d, yyyy')
            }
          </h3>
          
          <button
            onClick={handleNextWeek}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={handleToday}
          className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium"
        >
          Today
        </button>
      </div>

      {/* Calendar View */}
      {viewType === 'week' ? (
        <WeekView
          currentDate={currentDate}
          events={filteredEvents}
          onEventClick={handleSessionClick}
          onEventUpdate={handleSessionUpdate}
          subjects={subjects}
        />
      ) : (
        <DayView
          currentDate={currentDate}
          events={filteredEvents.filter(event => 
            isSameDay(event.start, currentDate)
          )}
          onEventClick={handleSessionClick}
          onEventUpdate={handleSessionUpdate}
          subjects={subjects}
        />
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionBlock
          session={selectedSession}
          subject={subjects.find(s => s._id === (
            typeof selectedSession.subjectId === 'object' 
              ? selectedSession.subjectId._id 
              : selectedSession.subjectId
          ))}
          onUpdate={handleSessionUpdate}
          onDelete={() => handleSessionDelete(selectedSession._id)}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
};

export default ScheduleCalendar;
