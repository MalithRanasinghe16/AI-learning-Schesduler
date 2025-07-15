import React from 'react';
import { Schedule, Subject, ScheduleSession } from '../../types';
import { format } from 'date-fns';

interface SimpleScheduleViewProps {
  schedule: Schedule;
  subjects: Subject[];
  onSessionUpdate?: (session: ScheduleSession) => void;
}

const SimpleScheduleView: React.FC<SimpleScheduleViewProps> = ({
  schedule,
  subjects,
  onSessionUpdate
}) => {
  // Group sessions by date
  const sessionsByDate = schedule.sessions.reduce((acc, session) => {
    const date = format(new Date(session.startTime), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(session);
    return acc;
  }, {} as Record<string, ScheduleSession[]>);

  const getSubjectName = (subjectId: string | Subject) => {
    if (typeof subjectId === 'object') return subjectId.name;
    const subject = subjects.find(s => s._id === subjectId);
    return subject?.name || 'Unknown Subject';
  };

  const getStatusColor = (status: ScheduleSession['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'missed': return 'bg-red-500';
      case 'rescheduled': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const handleStatusChange = (session: ScheduleSession, newStatus: ScheduleSession['status']) => {
    const updatedSession = { ...session, status: newStatus };
    onSessionUpdate?.(updatedSession);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">{schedule.name}</h2>
        <p className="text-gray-300">
          {schedule.sessions.length} sessions from {format(new Date(schedule.startDate), 'MMM dd')} to {format(new Date(schedule.endDate), 'MMM dd')}
        </p>
      </div>

      <div className="space-y-6">
        {Object.entries(sessionsByDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, sessions]) => (
            <div key={date} className="border-l-4 border-cyan-500 pl-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                {format(new Date(date), 'EEEE, MMMM dd')}
              </h3>
              <div className="space-y-3">
                {sessions
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map(session => (
                  <div key={session._id}>
                    <div
                      className="bg-gray-700 rounded-lg p-4 flex items-center justify-between hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(session.status)}`} />
                        <div>
                          <h4 className="text-white font-medium flex items-center gap-2">
                            {getSubjectName(session.subjectId)}
                            {session._id.startsWith('session-') && (
                              <span className="px-2 py-1 text-xs bg-green-600 text-white rounded">
                                TEST
                              </span>
                            )}
                          </h4>
                          <div className="text-sm text-gray-300 flex items-center space-x-4">
                            <span>
                              {format(new Date(session.startTime), 'h:mm a')} - {format(new Date(session.endTime), 'h:mm a')}
                            </span>
                            <span>{session.duration} min</span>
                            <span className="capitalize">{session.sessionType}</span>
                            <span>Priority: {session.priority}/5</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                        {session.status === 'scheduled' && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleStatusChange(session, 'in-progress')}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                            >
                              Start
                            </button>
                            <button
                              onClick={() => handleStatusChange(session, 'completed')}
                              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                            >
                              Complete
                            </button>
                          </div>
                        )}
                        {session.status === 'in-progress' && (
                          <button
                            onClick={() => handleStatusChange(session, 'completed')}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  ))}
              </div>
            </div>
          ))}
      </div>

      {schedule.sessions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No sessions in this schedule</p>
        </div>
      )}
    </div>
  );
};

export default SimpleScheduleView;
