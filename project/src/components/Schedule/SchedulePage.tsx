import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Settings, RefreshCw, BarChart3 } from 'lucide-react';
import { Schedule, ScheduleSession, Subject } from '../../types';
import { apiService } from '../../services/api';
import { useScheduleContext } from '../../contexts/ScheduleContext';
import SimpleScheduleView from './SimpleScheduleView';
import SessionReminder from './SessionReminder';
import StudyAnalytics from './StudyAnalytics';
import { toast } from 'react-toastify';
import { generateMockSchedule, generateMockSubjects } from './mockData';

const SchedulePage: React.FC = () => {
  const { selectedSchedule, setSelectedSchedule, selectedScheduleId, setSelectedScheduleId } = useScheduleContext();
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationController, setGenerationController] = useState<AbortController | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [showAnalytics, setShowAnalytics] = useState(false);

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

  // Sync currentSchedule with global context
  useEffect(() => {
    if (currentSchedule && currentSchedule._id !== selectedScheduleId) {
      setSelectedSchedule(currentSchedule);
      console.log('🔄 Updated global selected schedule:', {
        id: currentSchedule._id,
        name: currentSchedule.name
      });
    }
  }, [currentSchedule, selectedScheduleId, setSelectedSchedule]);

  // Load schedule from context on mount if available
  useEffect(() => {
    if (selectedScheduleId && schedules.length > 0 && !currentSchedule) {
      const contextSchedule = schedules.find(s => s._id === selectedScheduleId);
      if (contextSchedule) {
        setCurrentSchedule(contextSchedule);
        console.log('🔄 Restored schedule from context:', {
          id: contextSchedule._id,
          name: contextSchedule.name
        });
      }
    }
  }, [selectedScheduleId, schedules, currentSchedule]);

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
      
      // Load session counts for all schedules
      const schedulesWithCounts = await Promise.all(
        schedules.map(async (schedule) => {
          try {
            const sessionsResponse = await apiService.getScheduleSessions(schedule._id);
            const sessions = sessionsResponse.sessions || sessionsResponse || [];
            return {
              ...schedule,
              sessions: sessions
            };
          } catch (error) {
            console.warn(`Failed to load sessions for schedule ${schedule.name}:`, error);
            return {
              ...schedule,
              sessions: []
            };
          }
        })
      );
      
      setSchedules(schedulesWithCounts);
      setSubjects(subjects);
      
      console.log('Loaded all schedules with session counts:', schedulesWithCounts.map(s => ({
        name: s.name,
        sessionCount: s.sessions?.length || 0,
        type: s.scheduleType || 'unknown'
      })));
      console.log('Loaded subjects:', subjects);
      
      // Set the active schedule as current, or the most recent one
      const activeSchedule = schedulesWithCounts.find(s => s.status === 'active') || schedulesWithCounts[0];
      
      if (activeSchedule) {
        console.log('✅ Setting current schedule:', {
          id: activeSchedule._id,
          name: activeSchedule.name,
          scheduleType: activeSchedule.scheduleType,
          sessionsCount: activeSchedule.sessions?.length || 0
        });
        
        setCurrentSchedule(activeSchedule);
      } else {
        setCurrentSchedule(null);
      }
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

  const handleGenerateTestSchedule = async () => {
    console.log('=== GENERATING TEST SCHEDULE (DATABASE) ===');
    
    try {
      // Use existing subjects if available, otherwise create test subjects first
      let testSubjects = subjects;
      if (subjects.length === 0) {
        console.log('No subjects found, creating test subjects first...');
        await handleCreateTestSubjects();
        // Reload subjects after creation
        const subjectsResponse = await apiService.getSubjects();
        testSubjects = subjectsResponse.subjects || subjectsResponse || [];
      }

      if (testSubjects.length === 0) {
        toast.error('No subjects available for schedule generation');
        return;
      }

      const subjectIds = testSubjects.map(subject => subject._id);
      const preferences = {
        dailyStudyHours: 4,
        preferredTimeSlots: ['morning', 'afternoon'],
        sessionDuration: 90,
        breakDuration: 15
      };

      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      console.log('Generating demo schedule with:', {
        subjectIds,
        preferences,
        startDate,
        endDate
      });

      // Generate demo schedule via API
      const response = await apiService.generateSmartSchedule(
        subjectIds,
        preferences,
        startDate,
        endDate,
        'demo' // This is a demo schedule
      );

      console.log('Generated demo schedule via API:', response.schedule);
      
      // Update state
      const newSchedule = response.schedule;
      setCurrentSchedule(newSchedule);
      setSchedules(prev => [newSchedule, ...prev]);
      
      toast.success('Demo schedule generated successfully! (Database)');
    } catch (error) {
      console.error('Error generating demo schedule:', error);
      toast.error('Failed to generate demo schedule');
    }
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
    console.log('API schedule sessions:', newSchedule.sessions?.map(s => ({ id: s._id, isMock: s.isMockData })) || []);
    
    // Ensure the new schedule has a sessions array
    const validatedSchedule = {
      ...newSchedule,
      sessions: newSchedule.sessions || []
    };
    
    setSchedules(prev => [validatedSchedule, ...prev]);
    setCurrentSchedule(validatedSchedule);
    setShowGenerateModal(false);
    toast.success('New schedule generated successfully! (API Data)');
  };

  const handleSessionUpdate = async (sessionId: string, updates: Partial<ScheduleSession>) => {
    try {
      console.log('=== SESSION UPDATE ===');
      console.log('Session ID:', sessionId);
      console.log('Current schedule type:', currentSchedule?.scheduleType);
      console.log('Updates:', updates);
      
      // Always call API for session updates now (both real and demo schedules are in database)
      try {
        const isBackendRunning = await checkBackendHealth();
        if (!isBackendRunning) {
          console.warn('Backend is not running');
          toast.warn('Backend is not running - cannot update session');
          return;
        }

        // Check if this is a status-only update (for Start/Complete buttons)
        const isStatusOnlyUpdate = Object.keys(updates).length === 1 && 'status' in updates;
        
        if (isStatusOnlyUpdate && updates.status) {
          // Use PATCH endpoint for status updates
          await apiService.updateSessionStatus(sessionId, updates.status);
          console.log('Status update completed successfully');
        } else {
          // Use PUT endpoint for full session updates
          await apiService.updateScheduleSession(sessionId, updates);
          console.log('Full session update completed successfully');
        }
      } catch (apiError: any) {
        console.error('API call failed:', apiError.message);
        if (apiError.response?.status === 404) {
          console.log('Session not found in database');
          toast.error('Session not found in database');
        } else if (apiError.response?.status === 403) {
          console.log('Access denied - user may not own this session');
          toast.error('Access denied - cannot update this session');
        } else {
          toast.error('Failed to update session');
        }
        return;
      }
      
      // Update the current schedule's sessions
      if (currentSchedule && currentSchedule.sessions) {
        const updatedSessions = currentSchedule.sessions.map(session =>
          session._id === sessionId ? { ...session, ...updates } : session
        );
        const updatedSchedule = {
          ...currentSchedule,
          sessions: updatedSessions
        };
        setCurrentSchedule(updatedSchedule);
      }
      
      // Update the schedules list as well
      const updatedSchedules = schedules.map(schedule => 
        schedule._id === currentSchedule?._id 
          ? { ...schedule, sessions: schedule.sessions?.map(session =>
              session._id === sessionId ? { ...session, ...updates } : session
            ) || [] }
          : schedule
      );
      setSchedules(updatedSchedules);
      
      // Determine success message based on schedule type
      const successMessage = currentSchedule?.scheduleType === 'demo' 
        ? 'Demo session updated successfully'
        : 'Session updated successfully';
      
      toast.success(successMessage);
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
    }
  };

  const handleClearMockSchedules = async () => {
    console.log('=== CLEARING DEMO SCHEDULES ===');
    console.log('Current schedules before clearing:', schedules.length);
    console.log('Demo schedules before clearing:', schedules.filter(s => s.scheduleType === 'demo').length);
    
    try {
      // Clear demo schedules via API
      const response = await apiService.clearDemoSchedules();
      console.log('API response:', response);
      
      // Remove demo schedules from the current state
      const realSchedules = schedules.filter(schedule => schedule.scheduleType !== 'demo');
      setSchedules(realSchedules);
      
      console.log('Real schedules remaining:', realSchedules.length);
      
      // If current schedule is a demo schedule, clear it
      if (currentSchedule && currentSchedule.scheduleType === 'demo') {
        setCurrentSchedule(realSchedules[0] || null);
        console.log('Cleared current demo schedule, new current schedule:', realSchedules[0]?._id || 'none');
      }
      
      toast.success(`Cleared ${response.deletedCount} demo schedules successfully!`);
    } catch (error) {
      console.error('Error clearing demo schedules:', error);
      toast.error('Failed to clear demo schedules');
    }
  };

  const handleDebugScheduleSessions = async () => {
    if (!currentSchedule) {
      toast.error('No schedule selected');
      return;
    }
    
    try {
      console.log('🐛 DEBUGGING SCHEDULE SESSIONS');
      const debugResult = await apiService.debugScheduleSessions(currentSchedule._id);
      console.log('🐛 Debug result:', debugResult);
      
      toast.info(`Debug: ${debugResult.sessionsById} sessions by ID, ${debugResult.sessionsByObjectId} by ObjectId`);
    } catch (error) {
      console.error('Error debugging schedule sessions:', error);
      toast.error('Debug failed');
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

  // Ensure currentSchedule has sessions array if it exists
  const safeCurrentSchedule = currentSchedule ? {
    ...currentSchedule,
    sessions: currentSchedule.sessions || []
  } : null;

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
                {safeCurrentSchedule 
                  ? `${safeCurrentSchedule.name} - ${safeCurrentSchedule.sessions?.length || 0} sessions`
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
                </div>                  {/* Schedule Type */}
                  {safeCurrentSchedule && (
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${
                        safeCurrentSchedule.scheduleType === 'demo' ? 'bg-purple-400' : 
                        safeCurrentSchedule.scheduleType === 'template' ? 'bg-orange-400' : 'bg-blue-400'
                      }`}></div>
                      <span className="text-xs text-gray-400">
                        {safeCurrentSchedule.scheduleType === 'demo' ? 'Demo Schedule' : 
                         safeCurrentSchedule.scheduleType === 'template' ? 'Template Schedule' : 'Real Schedule'}
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

            {/* Analytics Toggle */}
            {safeCurrentSchedule && (
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`inline-flex items-center px-4 py-2 text-white rounded-lg transition-colors ${
                  showAnalytics 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
              </button>
            )}

            {/* Create Test Subjects Button */}
            {/* {subjects.length === 0 && (
              <button
                onClick={handleCreateTestSubjects}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Test Subjects
              </button>
            )} */}

            {/* Test Schedule Button for Development */}
            {/* <button
              onClick={handleGenerateTestSchedule}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate Demo Schedule
            </button> */}

            {/* Clear Demo Schedules Button */}
            {/* {schedules.some(s => s.scheduleType === 'demo') && (
              <button
                onClick={handleClearMockSchedules}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Clear Demo Data
              </button>
            )} */}

            {/* Debug Button */}
            {/* {currentSchedule && (
              <button
                onClick={handleDebugScheduleSessions}
                className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                🐛 Debug Sessions
              </button>
            )} */}
            
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
              value={safeCurrentSchedule?._id || ''}
              onChange={async (e) => {
                const scheduleId = e.target.value;
                if (!scheduleId) return;
                
                try {
                  console.log('🔄 Loading full schedule for selection:', scheduleId);
                  const fullScheduleResponse = await apiService.getScheduleWithSessions(scheduleId);
                  const fullSchedule = fullScheduleResponse.schedule;
                  
                  console.log('✅ Loaded selected schedule with sessions:', {
                    id: fullSchedule._id,
                    name: fullSchedule.name,
                    sessionsCount: fullSchedule.sessions?.length || 0
                  });
                  
                  setCurrentSchedule(fullSchedule);
                } catch (error) {
                  console.error('❌ Error loading selected schedule:', error);
                  // Fallback to basic schedule
                  const schedule = schedules.find(s => s._id === scheduleId);
                  const validatedSchedule = schedule ? {
                    ...schedule,
                    sessions: schedule.sessions || []
                  } : null;
                  setCurrentSchedule(validatedSchedule);
                  toast.error('Failed to load schedule details');
                }
              }}
              className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            >
              {schedules.map(schedule => (
                <option key={schedule._id} value={schedule._id}>
                  {schedule.name} ({schedule.sessions?.length || 0} sessions)
                  {schedule.status === 'active' && ' - Active'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Main Calendar View */}
        {safeCurrentSchedule ? (
          <div>
            {/* Session Reminders */}
            <SessionReminder 
              sessions={safeCurrentSchedule.sessions || []} 
              subjects={subjects}
            />
            
            {/* Analytics (optional) */}
            {showAnalytics && (
              <StudyAnalytics 
                sessions={safeCurrentSchedule.sessions || []} 
                subjects={subjects}
              />
            )}
            
            {/* Schedule View */}
            <SimpleScheduleView
              schedule={safeCurrentSchedule}
              subjects={subjects}
              onSessionUpdate={(updatedSession: ScheduleSession) => {
                // Extract only the changed fields by comparing with original session
                const originalSession = safeCurrentSchedule.sessions?.find(s => s._id === updatedSession._id);
                if (!originalSession) {
                  console.error('Original session not found for comparison');
                  return;
                }
                
                // Create updates object with only changed fields
                const updates: Partial<ScheduleSession> = {};
                if (originalSession.status !== updatedSession.status) {
                  updates.status = updatedSession.status;
                }
                if (originalSession.startTime !== updatedSession.startTime) {
                  updates.startTime = updatedSession.startTime;
                }
                if (originalSession.endTime !== updatedSession.endTime) {
                  updates.endTime = updatedSession.endTime;
                }
                // Add other fields as needed
                
                handleSessionUpdate(updatedSession._id, updates);
              }}
            />
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <CalendarIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Schedule Found</h3>
            <p className="text-gray-400 mb-6">
              You don't have any schedules yet. Create your first schedule to get started.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {/* <button
                onClick={handleGenerateTestSchedule}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Generate Demo Schedule
              </button> */}
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
  const [generationController, setGenerationController] = useState<AbortController | null>(null);
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

    const controller = new AbortController();
    setGenerationController(controller);

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
        preferences.endDate,
        'real', // Real schedule from modal
        controller.signal
      );
      
      console.log('Schedule generation response:', response);
      onGenerate(response.schedule);
    } catch (error: any) {
      console.error('Error generating schedule:', error);
      if (error.name === 'AbortError') {
        toast.info('Schedule generation was cancelled');
      } else if (error.message?.includes('timeout')) {
        toast.error('Schedule generation timed out. Please try with fewer subjects or shorter time period.');
      } else {
        toast.error('Failed to generate schedule: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsGenerating(false);
      setGenerationController(null);
    }
  };

  const handleCancel = () => {
    if (generationController) {
      generationController.abort();
    }
    onClose();
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
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            {isGenerating ? 'Cancel' : 'Close'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || selectedSubjects.length === 0 || subjects.length === 0}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating... (Cancel to stop)' : 'Generate Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
