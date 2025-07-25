import React, { useState, useEffect } from 'react';
import { ScheduleSession, Subject } from '../../types';
import { format, isToday, isTomorrow, isWithinInterval, addMinutes } from 'date-fns';
import { Bell, Clock, AlertCircle } from 'lucide-react';

interface SessionReminderProps {
  sessions: ScheduleSession[];
  subjects: Subject[];
}

const SessionReminder: React.FC<SessionReminderProps> = ({ sessions, subjects }) => {
  const [upcomingSessions, setUpcomingSessions] = useState<ScheduleSession[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const now = new Date();
    const next24Hours = addMinutes(now, 24 * 60);

    const upcoming = sessions.filter(session => {
      const sessionStart = new Date(session.startTime);
      return session.status === 'scheduled' && 
             sessionStart > now && 
             sessionStart <= next24Hours;
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    setUpcomingSessions(upcoming.slice(0, 3)); // Show only next 3 sessions
  }, [sessions, currentTime]);

  const getSubjectName = (subjectId: string | Subject) => {
    if (typeof subjectId === 'object') return subjectId.name;
    const subject = subjects.find(s => s._id === subjectId);
    return subject?.name || 'Unknown Subject';
  };

  const getTimeUntilSession = (startTime: string) => {
    const sessionStart = new Date(startTime);
    const diffMinutes = Math.floor((sessionStart.getTime() - currentTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else if (diffMinutes < 24 * 60) {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}m`;
    } else {
      return format(sessionStart, 'MMM dd, h:mm a');
    }
  };

  const getUrgencyLevel = (startTime: string) => {
    const sessionStart = new Date(startTime);
    const diffMinutes = Math.floor((sessionStart.getTime() - currentTime.getTime()) / (1000 * 60));
    
    if (diffMinutes <= 15) return 'urgent';
    if (diffMinutes <= 60) return 'soon';
    return 'upcoming';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-500';
      case 'soon': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return <AlertCircle className="h-4 w-4" />;
      case 'soon': return <Clock className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (upcomingSessions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-6">
      <div className="flex items-center mb-3">
        <Bell className="h-5 w-5 text-cyan-400 mr-2" />
        <h3 className="text-lg font-semibold text-white">Upcoming Sessions</h3>
      </div>
      
      <div className="space-y-3">
        {upcomingSessions.map(session => {
          const urgency = getUrgencyLevel(session.startTime);
          const urgencyColor = getUrgencyColor(urgency);
          const urgencyIcon = getUrgencyIcon(urgency);
          
          return (
            <div
              key={session._id}
              className="flex items-center justify-between bg-gray-700 rounded-lg p-3"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${urgencyColor} text-white`}>
                  {urgencyIcon}
                </div>
                <div>
                  <h4 className="text-white font-medium">
                    {getSubjectName(session.subjectId)}
                  </h4>
                  <p className="text-gray-300 text-sm">
                    {format(new Date(session.startTime), 'h:mm a')} • {session.duration} min
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`text-sm font-medium ${
                  urgency === 'urgent' ? 'text-red-400' : 
                  urgency === 'soon' ? 'text-yellow-400' : 'text-cyan-400'
                }`}>
                  {getTimeUntilSession(session.startTime)}
                </p>
                <p className="text-gray-400 text-xs capitalize">
                  {session.sessionType}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SessionReminder;
