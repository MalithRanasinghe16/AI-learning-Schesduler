import React from 'react';
import { format, getHours, getMinutes } from 'date-fns';
import { CalendarEvent, Subject } from '../../types';
import { Clock, Target, BookOpen } from 'lucide-react';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onEventUpdate: (event: any) => void;
  subjects: Subject[];
}

const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onEventUpdate,
  subjects
}) => {
  const hours = Array.from({ length: 18 }, (_, i) => i + 5); // 5 AM to 11 PM

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500 border-blue-600 text-white';
      case 'in-progress':
        return 'bg-yellow-500 border-yellow-600 text-white';
      case 'completed':
        return 'bg-green-500 border-green-600 text-white';
      case 'missed':
        return 'bg-red-500 border-red-600 text-white';
      case 'rescheduled':
        return 'bg-purple-500 border-purple-600 text-white';
      default:
        return 'bg-gray-500 border-gray-600 text-white';
    }
  };

  // Priority indicator
  const getPriorityIcon = (priority: number) => {
    if (priority >= 4) return '🔥';
    if (priority === 3) return '⚡';
    if (priority === 2) return '📘';
    return '📋';
  };

  // Calculate event position
  const getEventPosition = (event: CalendarEvent) => {
    const startHour = getHours(event.start);
    const startMinute = getMinutes(event.start);
    const endHour = getHours(event.end);
    const endMinute = getMinutes(event.end);

    const top = ((startHour - 5) * 80 + (startMinute / 60) * 80); // 80px per hour
    const height = ((endHour - startHour) * 80 + ((endMinute - startMinute) / 60) * 80);

    return { top, height };
  };

  // Get current time indicator position
  const getCurrentTimePosition = () => {
    const now = new Date();
    const currentHour = getHours(now);
    const currentMinute = getMinutes(now);
    
    if (currentHour < 5 || currentHour > 22) return null;
    
    return ((currentHour - 5) * 80 + (currentMinute / 60) * 80);
  };

  const currentTimePosition = getCurrentTimePosition();

  // Calculate daily stats
  const totalSessions = events.length;
  const completedSessions = events.filter(e => e.status === 'completed').length;
  const totalDuration = events.reduce((sum, event) => sum + event.duration, 0);
  const completedDuration = events
    .filter(e => e.status === 'completed')
    .reduce((sum, event) => sum + event.duration, 0);

  return (
    <div className="bg-white bg-opacity-5 rounded-lg overflow-hidden">
      {/* Day Stats Header */}
      <div className="p-4 bg-white bg-opacity-10 border-b border-white border-opacity-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{totalSessions}</div>
            <div className="text-xs text-gray-300">Total Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">{completedSessions}</div>
            <div className="text-xs text-gray-300">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-cyan-400">
              {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
            </div>
            <div className="text-xs text-gray-300">Planned Time</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-400">
              {Math.floor(completedDuration / 60)}h {completedDuration % 60}m
            </div>
            <div className="text-xs text-gray-300">Completed Time</div>
          </div>
        </div>
      </div>

      {/* Time Grid */}
      <div className="relative">
        {/* Current time indicator */}
        {currentTimePosition !== null && (
          <div
            className="absolute left-0 right-0 z-30 border-t-2 border-red-400"
            style={{ top: `${currentTimePosition}px` }}
          >
            <div className="bg-red-400 text-white text-xs px-2 py-1 rounded-r inline-block">
              {format(new Date(), 'HH:mm')}
            </div>
          </div>
        )}

        {/* Hour rows */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="relative border-b border-white border-opacity-10"
            style={{ height: '80px' }}
          >
            {/* Time label */}
            <div className="absolute left-0 top-0 w-16 h-full flex items-start pt-1 pr-2">
              <span className="text-xs text-gray-400 text-right w-full">
                {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
              </span>
            </div>

            {/* Events container */}
            <div className="ml-16 relative h-full">
              {events
                .filter(event => {
                  const eventStartHour = getHours(event.start);
                  const eventEndHour = getHours(event.end);
                  return hour >= eventStartHour && hour < eventEndHour;
                })
                .map((event, index) => {
                  const position = getEventPosition(event);
                  const startHour = getHours(event.start);
                  
                  // Only render the event block at its start hour
                  if (hour !== startHour) return null;

                  return (
                    <div
                      key={event.id}
                      className={`absolute left-2 right-2 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${getStatusColor(event.status)}`}
                      style={{
                        top: `${position.top - (hour - 5) * 80}px`,
                        height: `${Math.max(position.height, 40)}px`,
                        zIndex: 20 + index
                      }}
                      onClick={() => onEventClick(event)}
                    >
                      <div className="p-3 h-full flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm truncate flex-1">
                              {event.title}
                            </span>
                            <span className="text-xs ml-2">
                              {getPriorityIcon(event.priority)}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-3 text-xs opacity-90">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Target className="h-3 w-3" />
                              <span>{event.duration}min</span>
                            </div>
                          </div>
                        </div>

                        {position.height > 60 && (
                          <div className="mt-2">
                            <div className="flex items-center space-x-1 text-xs opacity-80">
                              <BookOpen className="h-3 w-3" />
                              <span className="capitalize">{event.sessionType}</span>
                            </div>
                            
                            <div className={`mt-1 px-2 py-1 rounded text-xs font-medium ${
                              event.status === 'completed' ? 'bg-green-600' :
                              event.status === 'in-progress' ? 'bg-yellow-600' :
                              event.status === 'missed' ? 'bg-red-600' :
                              'bg-blue-600'
                            }`}>
                              {event.status.replace('-', ' ').toUpperCase()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {events.length === 0 && (
        <div className="p-8 text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg">No sessions scheduled for this day</p>
          <p className="text-gray-400 text-sm mt-2">
            Add some study sessions to see them here
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 bg-white bg-opacity-5 border-t border-white border-opacity-20">
        <div className="text-xs text-gray-400 text-center">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </div>
      </div>
    </div>
  );
};

export default DayView;
