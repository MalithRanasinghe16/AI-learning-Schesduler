import React from 'react';
import { ScheduleSession, Subject } from '../../types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { BarChart3, TrendingUp, Clock, Target } from 'lucide-react';

interface StudyAnalyticsProps {
  sessions: ScheduleSession[];
  subjects: Subject[];
}

const StudyAnalytics: React.FC<StudyAnalyticsProps> = ({ sessions, subjects }) => {
  // Calculate week progress
  const currentWeek = {
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date())
  };

  const thisWeekSessions = sessions.filter(session => {
    const sessionDate = new Date(session.startTime);
    return isWithinInterval(sessionDate, currentWeek);
  });

  const weeklyStats = {
    planned: thisWeekSessions.length,
    completed: thisWeekSessions.filter(s => s.status === 'completed').length,
    inProgress: thisWeekSessions.filter(s => s.status === 'in-progress').length,
    missed: thisWeekSessions.filter(s => s.status === 'missed').length,
    totalMinutes: thisWeekSessions.reduce((acc, s) => acc + s.duration, 0),
    completedMinutes: thisWeekSessions.filter(s => s.status === 'completed').reduce((acc, s) => acc + s.duration, 0)
  };

  // Daily breakdown for the week
  const weekDays = eachDayOfInterval(currentWeek);
  const dailyProgress = weekDays.map(day => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySessions = thisWeekSessions.filter(session => 
      format(new Date(session.startTime), 'yyyy-MM-dd') === dayKey
    );
    
    return {
      date: day,
      planned: daySessions.length,
      completed: daySessions.filter(s => s.status === 'completed').length,
      minutes: daySessions.filter(s => s.status === 'completed').reduce((acc, s) => acc + s.duration, 0)
    };
  });

  // Subject breakdown
  const subjectStats = subjects.map(subject => {
    const subjectSessions = thisWeekSessions.filter(session => 
      (typeof session.subjectId === 'string' ? session.subjectId : session.subjectId._id) === subject._id
    );
    
    return {
      subject,
      planned: subjectSessions.length,
      completed: subjectSessions.filter(s => s.status === 'completed').length,
      minutes: subjectSessions.filter(s => s.status === 'completed').reduce((acc, s) => acc + s.duration, 0)
    };
  }).filter(stat => stat.planned > 0);

  const weeklyCompletionRate = weeklyStats.planned > 0 
    ? Math.round((weeklyStats.completed / weeklyStats.planned) * 100) 
    : 0;

  const dailyAverageMinutes = Math.round(weeklyStats.completedMinutes / 7);

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <div className="flex items-center mb-6">
        <BarChart3 className="h-5 w-5 text-cyan-400 mr-2" />
        <h3 className="text-lg font-semibold text-white">This Week's Progress</h3>
      </div>

      {/* Week Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Completion Rate</p>
              <p className="text-white text-xl font-bold">{weeklyCompletionRate}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Sessions Done</p>
              <p className="text-white text-xl font-bold">{weeklyStats.completed}/{weeklyStats.planned}</p>
            </div>
            <Target className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Study Time</p>
              <p className="text-white text-xl font-bold">{Math.round(weeklyStats.completedMinutes / 60 * 10) / 10}h</p>
            </div>
            <Clock className="h-8 w-8 text-purple-400" />
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Daily Average</p>
              <p className="text-white text-xl font-bold">{dailyAverageMinutes}min</p>
            </div>
            <BarChart3 className="h-8 w-8 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-white mb-3">Daily Progress</h4>
        <div className="grid grid-cols-7 gap-2">
          {dailyProgress.map((day, index) => {
            const completionRate = day.planned > 0 ? (day.completed / day.planned) * 100 : 0;
            const isToday = format(day.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            
            return (
              <div key={index} className={`bg-gray-700 rounded-lg p-3 ${isToday ? 'ring-2 ring-cyan-400' : ''}`}>
                <div className="text-center">
                  <p className="text-gray-300 text-xs mb-1">{format(day.date, 'EEE')}</p>
                  <p className="text-white text-sm font-medium">{format(day.date, 'dd')}</p>
                  <div className="mt-2">
                    <div className="w-full bg-gray-600 rounded-full h-1.5 mb-1">
                      <div 
                        className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${completionRate}%` }}
                      ></div>
                    </div>
                    <p className="text-gray-400 text-xs">{day.completed}/{day.planned}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subject Breakdown */}
      {subjectStats.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-white mb-3">Subject Progress</h4>
          <div className="space-y-3">
            {subjectStats.map((stat, index) => {
              const completionRate = stat.planned > 0 ? (stat.completed / stat.planned) * 100 : 0;
              
              return (
                <div key={index} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                    <div>
                      <p className="text-white font-medium">{stat.subject.name}</p>
                      <p className="text-gray-300 text-sm">
                        {stat.completed}/{stat.planned} sessions • {Math.round(stat.minutes / 60 * 10) / 10}h
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">{Math.round(completionRate)}%</p>
                    <div className="w-16 bg-gray-600 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyAnalytics;
