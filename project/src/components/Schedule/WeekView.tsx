import React from 'react';
import { format, startOfWeek, addDays, isSameDay, getHours, getMinutes } from 'date-fns';
import { CalendarEvent, Subject } from '../../types';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onEventUpdate: (event: any) => void;
  subjects: Subject[];
}

const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onEventUpdate,
  subjects
}) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 10 PM

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500 border-blue-600';
      case 'in-progress':
        return 'bg-yellow-500 border-yellow-600';
      case 'completed':
        return 'bg-green-500 border-green-600';
      case 'missed':
        return 'bg-red-500 border-red-600';
      case 'rescheduled':
        return 'bg-purple-500 border-purple-600';
      default:
        return 'bg-gray-500 border-gray-600';
    }
  };

  // Priority border style
  const getPriorityBorder = (priority: number) => {
    switch (priority) {
      case 1:
        return 'border-l-4 border-l-gray-400';
      case 2:
        return 'border-l-4 border-l-blue-400';
      case 3:
        return 'border-l-4 border-l-yellow-400';
      case 4:
        return 'border-l-4 border-l-orange-400';
      case 5:
        return 'border-l-4 border-l-red-400';
      default:
        return 'border-l-4 border-l-gray-400';
    }
  };

  // Calculate event position in the grid
  const getEventPosition = (event: CalendarEvent) => {
    const startHour = getHours(event.start);
    const startMinute = getMinutes(event.start);
    const endHour = getHours(event.end);
    const endMinute = getMinutes(event.end);

    const top = ((startHour - 6) * 60 + startMinute) * (60 / 60); // 60px per hour
    const height = ((endHour - startHour) * 60 + (endMinute - startMinute)) * (60 / 60);

    return { top, height };
  };

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.start, day));
  };

  return (
    <div className="bg-white bg-opacity-5 rounded-lg overflow-hidden">
      {/* Week Header */}
      <div className="grid grid-cols-8 border-b border-white border-opacity-20">
        {/* Time column header */}
        <div className="p-2 text-center">
          <span className="text-xs text-gray-300">Time</span>
        </div>
        
        {/* Day headers */}
        {days.map((day, index) => (
          <div
            key={index}
            className={`p-2 text-center border-l border-white border-opacity-20 ${
              isSameDay(day, new Date()) ? 'bg-white bg-opacity-10' : ''
            }`}
          >
            <div className="text-xs text-gray-300">
              {format(day, 'EEE')}
            </div>
            <div className={`text-sm font-medium ${
              isSameDay(day, new Date()) ? 'text-cyan-400' : 'text-white'
            }`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="relative">
        {/* Time slots */}
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-white border-opacity-10">
            {/* Time label */}
            <div className="p-2 text-xs text-gray-400 text-center border-r border-white border-opacity-10">
              {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
            </div>
            
            {/* Day columns */}
            {days.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`relative h-15 border-l border-white border-opacity-10 hover:bg-white hover:bg-opacity-5 transition-colors ${
                  isSameDay(day, new Date()) ? 'bg-white bg-opacity-5' : ''
                }`}
                style={{ minHeight: '60px' }}
              >
                {/* Events for this time slot */}
                {getEventsForDay(day)
                  .filter(event => {
                    const eventHour = getHours(event.start);
                    return eventHour === hour;
                  })
                  .map((event, eventIndex) => {
                    const position = getEventPosition(event);
                    return (
                      <div
                        key={event.id}
                        className={`absolute left-1 right-1 rounded p-1 cursor-pointer transition-all hover:shadow-lg ${getStatusColor(event.status)} ${getPriorityBorder(event.priority)}`}
                        style={{
                          top: `${position.top}px`,
                          height: `${Math.max(position.height, 30)}px`,
                          zIndex: 10 + eventIndex
                        }}
                        onClick={() => onEventClick(event)}
                      >
                        <div className="text-xs font-medium text-white truncate">
                          {event.title}
                        </div>
                        <div className="text-xs text-white opacity-80">
                          {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                        </div>
                        {event.duration >= 60 && (
                          <div className="text-xs text-white opacity-60 truncate">
                            {event.sessionType}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 p-3 bg-white bg-opacity-5 rounded">
        <div className="text-xs text-gray-300 mb-2">Status Legend:</div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-xs text-gray-300">Scheduled</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span className="text-xs text-gray-300">In Progress</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-xs text-gray-300">Completed</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-xs text-gray-300">Missed</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-purple-500"></div>
            <span className="text-xs text-gray-300">Rescheduled</span>
          </div>
        </div>
        
        <div className="text-xs text-gray-300 mt-2 mb-1">Priority (left border):</div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-600 border-l-2 border-l-red-400"></div>
            <span className="text-xs text-gray-300">High (5)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-600 border-l-2 border-l-orange-400"></div>
            <span className="text-xs text-gray-300">Medium-High (4)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-600 border-l-2 border-l-yellow-400"></div>
            <span className="text-xs text-gray-300">Medium (3)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekView;
