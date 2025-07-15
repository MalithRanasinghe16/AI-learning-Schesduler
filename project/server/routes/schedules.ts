import express from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth';
import Schedule from '../models/Schedule';
import ScheduleSession from '../models/ScheduleSession';
import { scheduleGenerator } from '../services/scheduleGenerator';

const router = express.Router();

// Get all schedules for user
router.get('/', auth, async (req, res) => {
  try {
    const schedules = await Schedule.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    // Populate session count for each schedule
    const schedulesWithSessions = await Promise.all(
      schedules.map(async (schedule) => {
        const sessionsCount = await ScheduleSession.countDocuments({ scheduleId: schedule._id });
        return {
          ...schedule.toObject(),
          sessionsCount
        };
      })
    );

    res.json({ schedules: schedulesWithSessions });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ message: 'Error fetching schedules' });
  }
});

// Get specific schedule with sessions
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('🔍 Getting schedule with ID:', req.params.id);
    
    const schedule = await Schedule.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!schedule) {
      console.log('❌ Schedule not found');
      return res.status(404).json({ message: 'Schedule not found' });
    }

    console.log('✅ Schedule found:', {
      id: schedule._id,
      name: schedule.name,
      scheduleType: schedule.scheduleType
    });

    // Debug: Check if sessions exist for this schedule
    const sessionsCount = await ScheduleSession.countDocuments({ scheduleId: schedule._id });
    console.log('📊 Sessions count for schedule:', sessionsCount);
    console.log('🔍 Query schedule._id:', schedule._id);
    console.log('🔍 Query schedule._id type:', typeof schedule._id);
    console.log('🔍 Query schedule._id toString:', schedule._id.toString());

    // === TEST TYPE MISMATCH ===
    console.log('🔬 Testing type mismatch scenarios...');
    const sessionsAsString = await ScheduleSession.find({ scheduleId: schedule._id.toString() });
    const sessionsAsObjectId = await ScheduleSession.find({ scheduleId: schedule._id });
    console.log('📊 Sessions with string ID:', sessionsAsString.length);
    console.log('📊 Sessions with ObjectId:', sessionsAsObjectId.length);

    // First try without populate to isolate the issue
    const sessions = await ScheduleSession.find({ scheduleId: schedule._id })
      .sort({ startTime: 1 });

    console.log('📋 Sessions retrieved (no populate):', sessions.length);
    
    // If we find sessions, then try to populate them
    let populatedSessions = sessions;
    if (sessions.length > 0) {
      console.log('🔬 Testing population scenarios...');
      
      // Test if subjects exist for these sessions
      const sampleSession = sessions[0];
      const Subject = mongoose.model('Subject');
      const subjectExists = await Subject.findById(sampleSession.subjectId);
      console.log('🔍 Sample session subject exists:', !!subjectExists);
      
      if (!subjectExists) {
        console.warn('⚠️ POPULATION ISSUE: Subject does not exist for session!');
        console.log('🔍 Missing subject ID:', sampleSession.subjectId);
        
        // Check what subjects exist for this user
        const userSubjects = await Subject.find({ userId: req.user.id });
        console.log('🔍 User has subjects:', userSubjects.length);
        console.log('🔍 User subject IDs:', userSubjects.map(s => s._id.toString()));
      }
      
      try {
        // Test different populate approaches
        console.log('🧪 Testing standard populate...');
        const standardPopulate = await ScheduleSession.find({ scheduleId: schedule._id })
          .populate('subjectId', 'name difficulty priority')
          .sort({ startTime: 1 });
        console.log('📊 Standard populate result:', standardPopulate.length);
        
        console.log('🧪 Testing populate with strictPopulate false...');
        const strictPopulate = await ScheduleSession.find({ scheduleId: schedule._id })
          .populate({
            path: 'subjectId',
            select: 'name difficulty priority',
            options: { strictPopulate: false }
          })
          .sort({ startTime: 1 });
        console.log('� Strict populate result:', strictPopulate.length);
        
        // Use the result that gives us more sessions
        if (strictPopulate.length >= standardPopulate.length) {
          populatedSessions = strictPopulate;
          console.log('✅ Using strictPopulate result');
        } else {
          populatedSessions = standardPopulate;
          console.log('✅ Using standard populate result');
        }
        
        // If populate reduces session count, warn about it
        if (populatedSessions.length < sessions.length) {
          console.warn(`⚠️ POPULATION REDUCED SESSIONS: ${sessions.length} → ${populatedSessions.length}`);
          
          // Find which sessions were lost
          const populatedIds = populatedSessions.map(s => s._id.toString());
          const lostSessions = sessions.filter(s => !populatedIds.includes(s._id.toString()));
          console.log('❌ Lost sessions:', lostSessions.length);
          console.log('❌ Lost sessions subject IDs:', lostSessions.map(s => s.subjectId));
          
          // In this case, use unpopulated sessions to preserve all data
          populatedSessions = sessions;
          console.log('🔄 Falling back to unpopulated sessions to preserve data');
        }
        
      } catch (populateError) {
        console.error('🔍 Populate error:', populateError);
        // Use non-populated sessions if populate fails
        populatedSessions = sessions;
      }
    }

    console.log('📋 Final sessions count:', populatedSessions.length);
    console.log('📋 Sessions IDs:', populatedSessions.map(s => s._id).slice(0, 3)); // First 3 for brevity

    // If no sessions found, let's debug the query
    if (populatedSessions.length === 0 && sessionsCount > 0) {
      console.log('🔍 CRITICAL: sessionsCount shows sessions exist but query returns 0!');
      console.log('🔍 This indicates a TYPE MISMATCH issue');
      
      // Test both scenarios systematically
      console.log('🧪 SYSTEMATIC DEBUGGING:');
      
      // 1. Raw query variations
      const rawSessions = await ScheduleSession.find({ scheduleId: schedule._id }).lean();
      const rawSessionsString = await ScheduleSession.find({ scheduleId: schedule._id.toString() }).lean();
      console.log('📊 Raw sessions (ObjectId):', rawSessions.length);
      console.log('📊 Raw sessions (String):', rawSessionsString.length);
      
      // 2. If raw sessions exist, test population
      if (rawSessions.length > 0 || rawSessionsString.length > 0) {
        const testSessions = rawSessions.length > 0 ? rawSessions : rawSessionsString;
        const testQuery = rawSessions.length > 0 ? { scheduleId: schedule._id } : { scheduleId: schedule._id.toString() };
        
        console.log('🧪 Testing population on found sessions...');
        try {
          const testPopulated = await ScheduleSession.find(testQuery)
            .populate('subjectId', 'name difficulty priority');
          console.log('📊 Population test result:', testPopulated.length);
          
          if (testPopulated.length < testSessions.length) {
            console.warn('⚠️ POPULATION ISSUE CONFIRMED!');
            console.log('📊 Sessions before populate:', testSessions.length);
            console.log('📊 Sessions after populate:', testPopulated.length);
            
            // Use the working query without population
            populatedSessions = await ScheduleSession.find(testQuery).sort({ startTime: 1 });
            console.log('🔄 Using non-populated sessions to preserve data');
          } else {
            populatedSessions = testPopulated;
            console.log('✅ Population working correctly');
          }
        } catch (popError) {
          console.error('❌ Population failed:', popError);
        }
      }
    } else if (populatedSessions.length === 0) {
      console.log('🔍 No sessions found via any method - debugging...');
      
      // Try raw query without populate first
      const rawSessions = await ScheduleSession.find({ scheduleId: schedule._id }).lean();
      console.log('🔍 Raw sessions (no populate):', rawSessions.length);
      
      if (rawSessions.length > 0) {
        console.log('🔍 Raw session sample:', {
          sessionId: rawSessions[0]._id,
          scheduleId: rawSessions[0].scheduleId,
          subjectId: rawSessions[0].subjectId
        });
        
        // Now try with populate to see if that's the issue
        try {
          const testPopulated = await ScheduleSession.find({ scheduleId: schedule._id })
            .populate('subjectId', 'name difficulty priority');
          console.log('🔍 Test populate result:', testPopulated.length);
        } catch (populateError) {
          console.error('🔍 Populate error:', populateError);
        }
      }
      
      // Try with string conversion
      const sessionsAsString = await ScheduleSession.find({ scheduleId: schedule._id.toString() });
      console.log('🔍 Sessions with string ID:', sessionsAsString.length);
      
      // Try to find any sessions for this user
      const userSchedules = await Schedule.find({ userId: req.user.id });
      const userScheduleIds = userSchedules.map(s => s._id);
      const anyUserSessions = await ScheduleSession.find({ scheduleId: { $in: userScheduleIds } });
      console.log('🔍 Any sessions for user:', anyUserSessions.length);
      
      // Debug the first few sessions to see their scheduleId format
      const allSessions = await ScheduleSession.find({}).limit(5);
      console.log('🔍 Sample sessions from DB:', allSessions.map(s => ({
        sessionId: s._id,
        scheduleId: s.scheduleId,
        scheduleIdType: typeof s.scheduleId
      })));
    }

    res.json({ 
      schedule: {
        ...schedule.toObject(),
        sessions: populatedSessions
      }
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ message: 'Error fetching schedule' });
  }
});

// Create new schedule
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      startDate,
      endDate,
      scheduleType = 'real', // Default to 'real' if not specified
      preferences
    } = req.body;

    const schedule = new Schedule({
      userId: req.user.id,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      scheduleType,
      preferences: {
        dailyStudyHours: preferences?.dailyStudyHours || 4,
        preferredTimeSlots: preferences?.preferredTimeSlots || ['morning', 'afternoon'],
        sessionDuration: preferences?.sessionDuration || 90,
        breakDuration: preferences?.breakDuration || 15
      }
    });

    await schedule.save();
    res.status(201).json({ schedule });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ message: 'Error creating schedule' });
  }
});

// Generate smart schedule
router.post('/generate', auth, async (req, res) => {
  try {
    const {
      subjects,
      preferences,
      startDate,
      endDate,
      scheduleName,
      scheduleType = 'real' // Default to 'real' if not specified
    } = req.body;

    if (!subjects || subjects.length === 0) {
      return res.status(400).json({ message: 'At least one subject is required' });
    }

    console.log('Generating schedule with params:', {
      userId: req.user.id,
      subjects,
      preferences,
      startDate,
      endDate,
      scheduleName,
      scheduleType
    });

    // Add timeout protection
    const generateWithTimeout = Promise.race([
      (async () => {
        // Only deactivate existing active schedules if this is a real schedule
        if (scheduleType === 'real') {
          await Schedule.updateMany(
            { userId: req.user.id, status: 'active', scheduleType: 'real' },
            { status: 'archived' }
          );
        }

        const schedule = await scheduleGenerator.generateSchedule(
          req.user.id,
          subjects,
          preferences,
          startDate,
          endDate,
          scheduleName,
          scheduleType
        );

        // Get the generated sessions
        console.log('🔬 Testing session retrieval after generation...');
        
        // First test without populate
        const rawSessions = await ScheduleSession.find({ scheduleId: schedule._id });
        console.log('📊 Raw sessions after generation:', rawSessions.length);
        
        if (rawSessions.length === 0) {
          console.warn('⚠️ NO RAW SESSIONS FOUND - TYPE MISMATCH ISSUE!');
          
          // Test different query types
          const stringQuery = await ScheduleSession.find({ scheduleId: schedule._id.toString() });
          const objectIdQuery = await ScheduleSession.find({ scheduleId: new mongoose.Types.ObjectId(schedule._id.toString()) });
          
          console.log('🔍 Sessions with string query:', stringQuery.length);
          console.log('🔍 Sessions with ObjectId query:', objectIdQuery.length);
          
          // Check what's actually in the database
          const recentSessions = await ScheduleSession.find({}).sort({ createdAt: -1 }).limit(5);
          console.log('🔍 Recent sessions in DB:', recentSessions.map(s => ({
            id: s._id,
            scheduleId: s.scheduleId,
            scheduleIdType: typeof s.scheduleId
          })));
        }
        
        // Test population if we have raw sessions
        let sessions = rawSessions;
        if (rawSessions.length > 0) {
          console.log('🧪 Testing population after generation...');
          
          // Check if subjects exist
          const sampleSession = rawSessions[0];
          const Subject = mongoose.model('Subject');
          const subjectExists = await Subject.findById(sampleSession.subjectId);
          console.log('🔍 Subject exists for generated session:', !!subjectExists);
          
          try {
            const populatedSessions = await ScheduleSession.find({ scheduleId: schedule._id })
              .populate('subjectId', 'name difficulty priority')
              .sort({ startTime: 1 });
            
            console.log('📊 Populated sessions after generation:', populatedSessions.length);
            
            if (populatedSessions.length < rawSessions.length) {
              console.warn('⚠️ POPULATION ISSUE: Some sessions lost during populate!');
              console.log(`Raw: ${rawSessions.length}, Populated: ${populatedSessions.length}`);
              // Use raw sessions to preserve all data
              sessions = rawSessions;
            } else {
              sessions = populatedSessions;
            }
          } catch (populateError) {
            console.error('🔍 Population error after generation:', populateError);
            sessions = rawSessions;
          }
        }

        console.log('📋 Generated schedule details:', {
          scheduleId: schedule._id,
          scheduleName: schedule.name,
          scheduleType: schedule.scheduleType,
          sessionsGenerated: sessions.length,
          scheduleIdType: typeof schedule._id,
          scheduleIdString: schedule._id.toString()
        });

        return {
          schedule: {
            ...schedule.toObject(),
            sessions
          }
        };
      })(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Schedule generation timeout')), 30000) // 30 second timeout
      )
    ]);

    const result = await generateWithTimeout;
    res.status(201).json(result);
  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({ 
      message: 'Error generating schedule',
      error: error.message 
    });
  }
});

// Update schedule
router.put('/:id', auth, async (req, res) => {
  try {
    const schedule = await Schedule.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    res.json({ schedule });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ message: 'Error updating schedule' });
  }
});

// Clear demo schedules (must be before /:id route)
router.delete('/demo', auth, async (req, res) => {
  try {
    // Find all demo schedules for the user
    const demoSchedules = await Schedule.find({ 
      userId: req.user.id, 
      scheduleType: 'demo' 
    });

    if (demoSchedules.length === 0) {
      return res.json({ message: 'No demo schedules found', deletedCount: 0 });
    }

    // Delete all sessions for demo schedules
    const scheduleIds = demoSchedules.map(schedule => schedule._id);
    await ScheduleSession.deleteMany({ scheduleId: { $in: scheduleIds } });

    // Delete demo schedules
    const deleteResult = await Schedule.deleteMany({ 
      userId: req.user.id, 
      scheduleType: 'demo' 
    });

    console.log(`Deleted ${deleteResult.deletedCount} demo schedules for user ${req.user.id}`);
    
    res.json({ 
      message: 'Demo schedules cleared successfully', 
      deletedCount: deleteResult.deletedCount 
    });
  } catch (error) {
    console.error('Error clearing demo schedules:', error);
    res.status(500).json({ message: 'Error clearing demo schedules' });
  }
});

// Delete schedule
router.delete('/:id', auth, async (req, res) => {
  try {
    const schedule = await Schedule.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // Delete all associated sessions
    await ScheduleSession.deleteMany({ scheduleId: req.params.id });

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ message: 'Error deleting schedule' });
  }
});

// Adapt schedule based on completion patterns
router.post('/:id/adapt', auth, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    await scheduleGenerator.adaptSchedule(req.params.id);

    res.json({ message: 'Schedule adapted successfully' });
  } catch (error) {
    console.error('Error adapting schedule:', error);
    res.status(500).json({ message: 'Error adapting schedule' });
  }
});

// Debug endpoint - Check sessions for schedule
router.get('/debug/:id/sessions', auth, async (req, res) => {
  try {
    const scheduleId = req.params.id;
    console.log('🐛 DEBUG: Comprehensive session debugging for schedule:', scheduleId);
    
    // === TEST 1: TYPE MISMATCH DEBUGGING ===
    console.log('🔬 Testing ObjectId vs String queries...');
    
    // Try as string
    const sessionsAsString = await ScheduleSession.find({ scheduleId: scheduleId });
    console.log('📊 Sessions found with string query:', sessionsAsString.length);
    
    // Try as ObjectId
    const sessionsAsObjectId = await ScheduleSession.find({ scheduleId: new mongoose.Types.ObjectId(scheduleId) });
    console.log('📊 Sessions found with ObjectId query:', sessionsAsObjectId.length);
    
    // Try with $eq operator
    const sessionsWithEq = await ScheduleSession.find({ scheduleId: { $eq: scheduleId } });
    console.log('📊 Sessions found with $eq string:', sessionsWithEq.length);
    
    const sessionsWithEqObjectId = await ScheduleSession.find({ scheduleId: { $eq: new mongoose.Types.ObjectId(scheduleId) } });
    console.log('📊 Sessions found with $eq ObjectId:', sessionsWithEqObjectId.length);
    
    // === TEST 2: POPULATION FAILURE DEBUGGING ===
    console.log('🔬 Testing population issues...');
    
    // Get raw sessions first
    const rawSessions = await ScheduleSession.find({ scheduleId: scheduleId }).lean();
    console.log('📊 Raw sessions (no populate):', rawSessions.length);
    
    if (rawSessions.length > 0) {
      // Sample first session for detailed analysis
      const sampleSession = rawSessions[0];
      console.log('� Sample session details:', {
        sessionId: sampleSession._id,
        scheduleId: sampleSession.scheduleId,
        subjectId: sampleSession.subjectId,
        scheduleIdType: typeof sampleSession.scheduleId,
        subjectIdType: typeof sampleSession.subjectId
      });
      
      // Check if the subject exists
      const Subject = mongoose.model('Subject');
      const subjectExists = await Subject.findById(sampleSession.subjectId);
      console.log('🔍 Referenced subject exists:', !!subjectExists);
      
      if (subjectExists) {
        console.log('✅ Subject found:', {
          id: subjectExists._id,
          name: subjectExists.name
        });
      } else {
        console.log('❌ Subject NOT found for ID:', sampleSession.subjectId);
        
        // Check if any subjects exist for this user
        const userSubjects = await Subject.find({ userId: req.user.id });
        console.log('🔍 Total subjects for user:', userSubjects.length);
        console.log('🔍 User subject IDs:', userSubjects.map(s => s._id));
      }
      
      // Test different populate approaches
      try {
        // Standard populate
        const standardPopulate = await ScheduleSession.find({ scheduleId: scheduleId })
          .populate('subjectId');
        console.log('📊 Standard populate result:', standardPopulate.length);
        
        // Populate with match (should include sessions even if subject doesn't exist)
        const populateWithMatch = await ScheduleSession.find({ scheduleId: scheduleId })
          .populate({
            path: 'subjectId',
            match: { _id: { $exists: true } }
          });
        console.log('📊 Populate with match:', populateWithMatch.length);
        
        // Populate with strictPopulate false
        const populateStrict = await ScheduleSession.find({ scheduleId: scheduleId })
          .populate({
            path: 'subjectId',
            options: { strictPopulate: false }
          });
        console.log('📊 Populate with strictPopulate false:', populateStrict.length);
        
        // Check what happens to sessions with missing subjects
        const populatedResult = await ScheduleSession.find({ scheduleId: scheduleId })
          .populate('subjectId', 'name difficulty priority');
        
        console.log('📊 Final populate result:', populatedResult.length);
        
        if (populatedResult.length !== rawSessions.length) {
          console.warn('⚠️ POPULATION ISSUE DETECTED!');
          console.log(`Raw sessions: ${rawSessions.length}, Populated sessions: ${populatedResult.length}`);
          
          // Find which sessions are missing after populate
          const populatedIds = populatedResult.map(s => s._id.toString());
          const missingAfterPopulate = rawSessions.filter(s => !populatedIds.includes(s._id.toString()));
          
          console.log('❌ Sessions missing after populate:', missingAfterPopulate.length);
          console.log('❌ Missing sessions subject IDs:', missingAfterPopulate.map(s => s.subjectId));
        }
        
      } catch (populateError) {
        console.error('🔍 Populate error:', populateError);
      }
    }
    
    // === ADDITIONAL DEBUGGING ===
    const allSessions = await ScheduleSession.find({});
    const schedule = await Schedule.findById(scheduleId);
    
    console.log('🐛 Summary:', {
      scheduleExists: !!schedule,
      scheduleIdType: typeof scheduleId,
      rawSessionsFound: rawSessions.length,
      sessionsAsString: sessionsAsString.length,
      sessionsAsObjectId: sessionsAsObjectId.length,
      totalSessionsInDB: allSessions.length
    });
    
    res.json({
      scheduleId,
      scheduleExists: !!schedule,
      testing: {
        typeMatching: {
          asString: sessionsAsString.length,
          asObjectId: sessionsAsObjectId.length,
          withEqString: sessionsWithEq.length,
          withEqObjectId: sessionsWithEqObjectId.length
        },
        population: {
          rawSessions: rawSessions.length,
          sampleSession: rawSessions[0] || null,
          subjectExists: rawSessions.length > 0 ? !!(await mongoose.model('Subject').findById(rawSessions[0]?.subjectId)) : null
        }
      },
      totalSessions: allSessions.length,
      sampleSessions: rawSessions.slice(0, 3)
    });
  } catch (error) {
    console.error('🐛 DEBUG Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
