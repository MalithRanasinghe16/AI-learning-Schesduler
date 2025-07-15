import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Settings, RefreshCw } from 'lucide-react';
import { Schedule, ScheduleSession, Subject } from '../../types';
import { apiService } from '../../services/api';
import SimpleScheduleView from './SimpleScheduleView';
import { toast } from 'react-toastify';
import { generateMockSchedule, generateMockSubjects } from './mockData';

const SchedulePage: React.FC = () => {
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Check backend status on component mount and periodically
  useEffect(() => {
    const checkStatus = async () => {
      const isOnline = await checkBackendHealth();
      setBackendStatus(isOnline ? 'online' : 'offline');
    };
    
    checkStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [schedulesResponse, subjectsResponse] = await Promise.all([
        apiService.getSchedules(),
        apiService.getSubjects()
      ]);
      
      console.log('Schedules response:', schedulesResponse);
      console.log('Subjects response:', subjectsResponse);
      
      // Handle different response formats
      const schedules = schedulesResponse.schedules || schedulesResponse || [];
      const subjects = subjectsResponse.subjects || subjectsResponse || [];
      
      setSchedules(schedules);
      setSubjects(subjects);
      
      console.log('Loaded schedules:', schedules);
      console.log('Loaded subjects:', subjects);
      
      // Set the active schedule as current, or the most recent one
      const activeSchedule = schedules.find(s => s.status === 'active') || schedules[0];
      setCurrentSchedule(activeSchedule || null);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load schedule data');
      // Set empty arrays on error so buttons still work
      setSchedules([]);
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSchedule = async () => {
    console.log('Generate schedule clicked');
    console.log('Subjects available:', subjects);
    console.log('Subjects length:', subjects.length);
    
    // Remove the subject length check to always show the modal for testing
    console.log('Opening generate modal');
    setShowGenerateModal(true);
  };

  const handleGenerateTestSchedule = () => {
    console.log('=== GENERATING TEST SCHEDULE (MOCK DATA) ===');
    
    // Use mock subjects if no real subjects are available
    const testSubjects = subjects.length > 0 ? subjects : generateMockSubjects();
    const testSchedule = generateMockSchedule(testSubjects);
    
    console.log('Generated mock schedule:', testSchedule);
    console.log('Mock schedule sessions:', testSchedule.sessions.map(s => ({ id: s._id, isMock: s.isMockData })));
    
    setCurrentSchedule(testSchedule);
    setSchedules(prev => [testSchedule, ...prev]);
    
    if (subjects.length === 0) {
      setSubjects(testSubjects);
    }
    
    toast.success('Test schedule generated successfully! (Mock Data)');
  };

  const handleCreateTestSubjects = async () => {
    try {
      const mockSubjects = generateMockSubjects();
      
      // Create subjects via API
      const createdSubjects: Subject[] = [];
      for (const subject of mockSubjects) {
        const { _id, ...subjectData } = subject; // Remove mock _id
        const response = await apiService.createSubject(subjectData);
        createdSubjects.push(response.subject || response);
      }
      
      setSubjects(createdSubjects);
      toast.success(`Created ${createdSubjects.length} test subjects!`);
    } catch (error) {
      console.error('Error creating test subjects:', error);
      toast.error('Failed to create test subjects');
    }
  };

  const handleScheduleGenerated = async (newSchedule: Schedule) => {
    console.log('=== SCHEDULE GENERATED FROM API ===');
    console.log('Generated API schedule:', newSchedule);
    console.log('API schedule sessions:', newSchedule.sessions.map(s => ({ id: s._id, isMock: s.isMockData })));
    
    setSchedules(prev => [newSchedule, ...prev]);
    setCurrentSchedule(newSchedule);
    setShowGenerateModal(false);
    toast.success('New schedule generated successfully! (API Data)');
  };

  const handleSessionUpdate = async (sessionId: string, updates: Partial<ScheduleSession>) => {
    try {
      // Find the session to check if it's mock data
      const session = currentSchedule?.sessions.find(s => s._id === sessionId);
      
      // Check if this is a mock session using multiple criteria
      const isMockSession = session?.isMockData || 
                           sessionId.startsWith('session-') || 
                           sessionId.includes('mock-') ||
                           currentSchedule?.isMockData ||
                           currentSchedule?.name?.includes('Test Schedule');
      
      console.log('=== SESSION UPDATE ===');
      console.log('Session ID:', sessionId);
      console.log('Is Mock Session:', isMockSession);
      console.log('Session data:', session);
      console.log('Current schedule isMock:', currentSchedule?.isMockData);
      console.log('Current schedule name:', currentSchedule?.name);
      console.log('Updates:', updates);
      
      if (!isMockSession) {
        console.log('Making API call to update session...');
        
        // First check if backend is running
        const isBackendRunning = await checkBackendHealth();
        if (!isBackendRunning) {
          console.warn('Backend is not running, treating session as mock');
          toast.warn('Backend is not running - treating as mock session');
        } else {
          try {
            // Only call API for real sessions
            await apiService.updateScheduleSession(sessionId, updates);
            console.log('API call completed successfully');
          } catch (apiError: any) {
            console.warn('API call failed, treating as mock session:', apiError.message);
            // If API call fails (e.g., session not found in DB), treat as mock session
            if (apiError.response?.status === 404) {
              console.log('Session not found in database, treating as mock session');
              toast.warn('Session not found in database - updating locally only');
            } else {
              // Re-throw other errors
              throw apiError;
            }
          }
        }
      } else {
        console.log('Skipping API call for mock session');
      }
      
      // Update the current schedule's sessions (both mock and real)
      if (currentSchedule) {
        const updatedSessions = currentSchedule.sessions.map(session =>
          session._id === sessionId ? { ...session, ...updates } : session
        );
        setCurrentSchedule({
          ...currentSchedule,
          sessions: updatedSessions
        });
      }
      
      // Update the schedules list as well
      setSchedules(prev => prev.map(schedule => 
        schedule._id === currentSchedule?._id 
          ? { ...schedule, sessions: schedule.sessions.map(session =>
              session._id === sessionId ? { ...session, ...updates } : session
            )}
          : schedule
      ));
      
      // Determine success message based on what actually happened
      let successMessage = 'Session updated successfully';
      if (isMockSession) {
        successMessage = 'Mock session updated locally';
      } else if (!await checkBackendHealth()) {
        successMessage = 'Session updated locally (Backend offline)';
      }
      
      toast.success(successMessage);
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
    }
  };

  // Check if backend is running
  const checkBackendHealth = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/health');
      const data = await response.json();
      console.log('Backend health check:', data);
      return data.status === 'OK';
    } catch (error) {
      console.warn('Backend health check failed:', error);
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
          <p className="text-gray-300">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="h-8 w-8 text-cyan-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Study Schedule</h1>
              <p className="text-gray-300 mt-1">
                {currentSchedule 
                  ? `${currentSchedule.name} - ${currentSchedule.sessions.length} sessions`
                  : 'No active schedule'
                }
              </p>
              {/* Status indicators */}
              <div className="flex items-center space-x-3 mt-2">
                {/* Backend Status */}
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    backendStatus === 'online' ? 'bg-green-400' : 
                    backendStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400'
                  }`}></div>
                  <span className="text-xs text-gray-400">
                    Backend: {backendStatus === 'checking' ? 'Checking...' : backendStatus}
                  </span>
                </div>
                
                {/* Schedule Type */}
                {currentSchedule && (
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      currentSchedule.isMockData ? 'bg-purple-400' : 'bg-blue-400'
                    }`}></div>
                    <span className="text-xs text-gray-400">
                      {currentSchedule.isMockData ? 'Mock Data' : 'API Data'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => loadData()}
              className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>

            {/* Create Test Subjects Button */}
            {subjects.length === 0 && (
              <button
                onClick={handleCreateTestSubjects}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Test Subjects
              </button>
            )}

            {/* Test Schedule Button for Development */}
            <button
              onClick={handleGenerateTestSchedule}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Test Schedule (Mock Data)
            </button>
            
            <button
              onClick={(e) => {
                console.log('Generate Schedule button clicked');
                e.preventDefault();
                handleGenerateSchedule();
              }}
              disabled={isGenerating}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Schedule (API)'}
            </button>
          </div>
        </div>

        {/* Schedule Selection */}
        {schedules.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Schedule
            </label>
            <select
              value={currentSchedule?._id || ''}
              onChange={(e) => {
                const schedule = schedules.find(s => s._id === e.target.value);
                setCurrentSchedule(schedule || null);
              }}
              className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            >
              {schedules.map(schedule => (
                <option key={schedule._id} value={schedule._id}>
                  {schedule.name} ({schedule.sessions.length} sessions)
                  {schedule.status === 'active' && ' - Active'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Main Calendar View */}
        {currentSchedule ? (
          <SimpleScheduleView
            schedule={currentSchedule}
            subjects={subjects}
            onSessionUpdate={(session: ScheduleSession) => handleSessionUpdate(session._id, session)}
          />
        ) : (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <CalendarIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Schedule Found</h3>
            <p className="text-gray-400 mb-6">
              You don't have any schedules yet. Create your first schedule to get started.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleGenerateTestSchedule}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Generate Test Schedule
              </button>
              <button
                onClick={(e) => {
                  console.log('Generate Your First Schedule button clicked');
                  e.preventDefault();
                  handleGenerateSchedule();
                }}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Generate Your First Schedule
              </button>
            </div>
          </div>
        )}

        {/* Generate Schedule Modal */}
        {showGenerateModal && (
          <GenerateScheduleModal
            subjects={subjects}
            onClose={() => setShowGenerateModal(false)}
            onGenerate={handleScheduleGenerated}
          />
        )}

        {/* Backend Status Indicator */}
        <div className="mt-4 text-center">
          {backendStatus === 'checking' && (
            <p className="text-gray-400">Checking backend status...</p>
          )}
          {backendStatus === 'online' && (
            <p className="text-green-400">Backend is online</p>
          )}
          {backendStatus === 'offline' && (
            <p className="text-red-400">Backend is offline</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Generate Schedule Modal Component
interface GenerateScheduleModalProps {
  subjects: Subject[];
  onClose: () => void;
  onGenerate: (schedule: Schedule) => void;
}

const GenerateScheduleModal: React.FC<GenerateScheduleModalProps> = ({
  subjects,
  onClose,
  onGenerate
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [preferences, setPreferences] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
    dailyHours: 4,
    preferredTimes: ['morning', 'afternoon'],
    sessionDuration: 90,
    breakDuration: 15
  });

  const handleGenerate = async () => {
    console.log('Modal generate function called');
    console.log('Selected subjects:', selectedSubjects);
    
    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    try {
      setIsGenerating(true);
      
      const scheduleData = {
        name: `Study Schedule - ${new Date().toLocaleDateString()}`,
        startDate: preferences.startDate,
        endDate: preferences.endDate,
        subjectIds: selectedSubjects,
        preferences: {
          dailyStudyHours: preferences.dailyHours,
          preferredTimeSlots: preferences.preferredTimes,
          sessionDuration: preferences.sessionDuration,
          breakDuration: preferences.breakDuration
        }
      };

      console.log('Generating schedule with data:', scheduleData);

      const response = await apiService.generateSmartSchedule(
        selectedSubjects,
        scheduleData.preferences,
        preferences.startDate,
        preferences.endDate
      );
      
      console.log('Schedule generation response:', response);
      onGenerate(response.schedule);
    } catch (error) {
      console.error('Error generating schedule:', error);
      toast.error('Failed to generate schedule');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Generate New Schedule</h2>
        
        {/* Subject Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Select Subjects
          </label>
          {subjects.length === 0 ? (
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-gray-300 mb-3">No subjects found. You need to create subjects first.</p>
              <button
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Subjects Page
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjects.map(subject => (
                <label key={subject._id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedSubjects.includes(subject._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSubjects(prev => [...prev, subject._id]);
                      } else {
                        setSelectedSubjects(prev => prev.filter(id => id !== subject._id));
                      }
                    }}
                    className="rounded border-gray-600 text-cyan-500 focus:ring-cyan-400"
                  />
                  <span className="text-white">{subject.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={preferences.startDate}
              onChange={(e) => setPreferences(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={preferences.endDate}
              onChange={(e) => setPreferences(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-400"
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Daily Study Hours
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={preferences.dailyHours}
              onChange={(e) => setPreferences(prev => ({ ...prev, dailyHours: parseInt(e.target.value) }))}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Session Duration (minutes)
            </label>
            <input
              type="number"
              min="30"
              max="180"
              step="15"
              value={preferences.sessionDuration}
              onChange={(e) => setPreferences(prev => ({ ...prev, sessionDuration: parseInt(e.target.value) }))}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-400"
            />
          </div>
        </div>

        {/* Preferred Times */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Preferred Study Times
          </label>
          <div className="flex flex-wrap gap-3">
            {['morning', 'afternoon', 'evening'].map(time => (
              <label key={time} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.preferredTimes.includes(time)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setPreferences(prev => ({
                        ...prev,
                        preferredTimes: [...prev.preferredTimes, time]
                      }));
                    } else {
                      setPreferences(prev => ({
                        ...prev,
                        preferredTimes: prev.preferredTimes.filter(t => t !== time)
                      }));
                    }
                  }}
                  className="rounded border-gray-600 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-white capitalize">{time}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || selectedSubjects.length === 0 || subjects.length === 0}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
