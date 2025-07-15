import { Schedule, ScheduleSession, Subject } from '../../types';

// Mock data for testing the calendar functionality
export const generateMockSchedule = (subjects: Subject[]): Schedule => {
  const startDate = new Date();
  const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks from now

  // Generate mock sessions
  const sessions: ScheduleSession[] = [];
  const subjectIds = subjects.length > 0 ? subjects.map(s => s._id) : ['mock-subject-1'];

  for (let day = 0; day < 14; day++) {
    const sessionDate = new Date(startDate);
    sessionDate.setDate(sessionDate.getDate() + day);
    
    // Skip weekends for now
    if (sessionDate.getDay() === 0 || sessionDate.getDay() === 6) continue;

    // Morning session
    const morningStart = new Date(sessionDate);
    morningStart.setHours(9, 0, 0, 0);
    const morningEnd = new Date(morningStart);
    morningEnd.setHours(10, 30, 0, 0);

    sessions.push({
      _id: `session-${day}-morning`,
      scheduleId: 'mock-schedule-1',
      subjectId: subjectIds[day % subjectIds.length],
      startTime: morningStart.toISOString(),
      endTime: morningEnd.toISOString(),
      duration: 90,
      status: 'scheduled',
      priority: 3,
      sessionType: 'study',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isMockData: true
    });

    // Afternoon session
    const afternoonStart = new Date(sessionDate);
    afternoonStart.setHours(14, 0, 0, 0);
    const afternoonEnd = new Date(afternoonStart);
    afternoonEnd.setHours(15, 30, 0, 0);

    sessions.push({
      _id: `session-${day}-afternoon`,
      scheduleId: 'mock-schedule-1',
      subjectId: subjectIds[(day + 1) % subjectIds.length],
      startTime: afternoonStart.toISOString(),
      endTime: afternoonEnd.toISOString(),
      duration: 90,
      status: 'scheduled',
      priority: 2,
      sessionType: 'practice',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isMockData: true
    });
  }

  return {
    _id: 'mock-schedule-1',
    userId: 'mock-user-1',
    name: `Test Schedule - ${new Date().toLocaleDateString()}`,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    sessions,
    status: 'active',
    adaptations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isMockData: true // Add flag to identify mock data
  };
};

export const generateMockSubjects = (): Subject[] => [
  {
    _id: 'mock-subject-1',
    name: 'JavaScript Fundamentals',
    description: 'Learn the basics of JavaScript programming',
    difficulty: 'beginner',
    progress: 25,
    userId: 'mock-user-1',
    estimatedHours: 40,
    priority: 'high',
    tags: [],
    isCompleted: false,
    category: 'Programming'
  },
  {
    _id: 'mock-subject-2',
    name: 'React Development',
    description: 'Build modern web applications with React',
    difficulty: 'intermediate',
    progress: 10,
    userId: 'mock-user-1',
    estimatedHours: 60,
    priority: 'medium',
    tags: [],
    isCompleted: false,
    category: 'Web Development'
  },
  {
    _id: 'mock-subject-3',
    name: 'Data Structures',
    description: 'Understanding algorithms and data structures',
    difficulty: 'advanced',
    progress: 0,
    userId: 'mock-user-1',
    estimatedHours: 80,
    priority: 'high',
    tags: [],
    isCompleted: false,
    category: 'Computer Science'
  }
];
