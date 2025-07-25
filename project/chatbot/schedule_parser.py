from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta, time
import logging
import re

logger = logging.getLogger(__name__)

class ScheduleParser:
    def __init__(self):
        self.default_session_duration = 60  # minutes
        self.default_break_duration = 15    # minutes
        
        # Time slot mappings
        self.time_slots = {
            'morning': (9, 12),      # 9 AM - 12 PM
            'afternoon': (13, 17),   # 1 PM - 5 PM
            'evening': (18, 21),     # 6 PM - 9 PM
            'night': (21, 23)        # 9 PM - 11 PM
        }
        
        # Priority mappings
        self.priority_keywords = {
            'high': ['urgent', 'important', 'priority', 'asap', 'critical'],
            'medium': ['normal', 'regular', 'standard'],
            'low': ['later', 'when possible', 'low priority', 'optional']
        }
    
    def parse_schedule_request(
        self, 
        subjects: List[str], 
        timeframe: str, 
        preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Parse a schedule creation request into structured data"""
        
        # Parse timeframe
        start_date, end_date = self.parse_timeframe(timeframe)
        
        # Parse subjects with priorities and durations
        parsed_subjects = self.parse_subjects(subjects, preferences)
        
        # Parse preferred time slots
        preferred_times = self.parse_time_preferences(preferences)
        
        # Generate session distribution
        session_distribution = self.generate_session_distribution(
            parsed_subjects, start_date, end_date, preferred_times
        )
        
        schedule_data = {
            'name': self.generate_schedule_name(subjects, timeframe),
            'startDate': start_date.isoformat(),
            'endDate': end_date.isoformat(),
            'subjects': parsed_subjects,
            'preferredTimes': preferred_times,
            'sessionDistribution': session_distribution,
            'totalDuration': sum(s['totalMinutes'] for s in parsed_subjects),
            'preferences': preferences,
            'createdBy': 'chatbot',
            'scheduleType': 'ai_generated'
        }
        
        return schedule_data
    
    def parse_timeframe(self, timeframe: str) -> tuple[datetime, datetime]:
        """Parse timeframe string into start and end dates"""
        now = datetime.now()
        timeframe_lower = timeframe.lower().strip()
        
        if 'today' in timeframe_lower:
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=1)
        
        elif 'tomorrow' in timeframe_lower:
            start_date = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=1)
        
        elif 'this week' in timeframe_lower:
            # Start from today, end on Sunday
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            days_until_sunday = (6 - now.weekday()) % 7
            end_date = start_date + timedelta(days=days_until_sunday if days_until_sunday > 0 else 7)
        
        elif 'next week' in timeframe_lower:
            # Start from next Monday
            days_until_monday = (7 - now.weekday()) % 7
            if days_until_monday == 0:
                days_until_monday = 7
            start_date = (now + timedelta(days=days_until_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=7)
        
        elif 'month' in timeframe_lower:
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            # Add roughly 30 days
            end_date = start_date + timedelta(days=30)
        
        else:
            # Default to this week
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=7)
        
        logger.info(f"Parsed timeframe '{timeframe}' to: {start_date} - {end_date}")
        return start_date, end_date
    
    def parse_subjects(self, subjects: List[str], preferences: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse subjects with estimated durations and priorities"""
        parsed_subjects = []
        
        for subject in subjects:
            subject_data = {
                'name': subject.strip(),
                'priority': self.determine_priority(subject, preferences),
                'estimatedMinutes': self.estimate_subject_duration(subject, preferences),
                'totalMinutes': 0,  # Will be calculated
                'difficulty': self.estimate_difficulty(subject, preferences),
                'sessions': []
            }
            
            # Calculate total minutes needed
            base_duration = subject_data['estimatedMinutes']
            priority_multiplier = {'high': 1.3, 'medium': 1.0, 'low': 0.8}
            subject_data['totalMinutes'] = int(base_duration * priority_multiplier[subject_data['priority']])
            
            parsed_subjects.append(subject_data)
        
        return parsed_subjects
    
    def determine_priority(self, subject: str, preferences: Dict[str, Any]) -> str:
        """Determine subject priority from context"""
        subject_lower = subject.lower()
        
        # Check for explicit priority keywords
        for priority, keywords in self.priority_keywords.items():
            if any(keyword in subject_lower for keyword in keywords):
                return priority
        
        # Check preferences
        if 'priorities' in preferences:
            subject_priorities = preferences['priorities']
            if isinstance(subject_priorities, dict) and subject in subject_priorities:
                return subject_priorities[subject]
        
        # Default priority based on common academic subjects
        high_priority_subjects = ['math', 'mathematics', 'calculus', 'physics', 'chemistry']
        if any(hp_subject in subject_lower for hp_subject in high_priority_subjects):
            return 'high'
        
        return 'medium'
    
    def estimate_subject_duration(self, subject: str, preferences: Dict[str, Any]) -> int:
        """Estimate how long to spend on a subject (in minutes)"""
        
        # Check for explicit durations in preferences
        if 'durations' in preferences:
            subject_durations = preferences['durations']
            if isinstance(subject_durations, dict) and subject in subject_durations:
                return subject_durations[subject]
        
        # Check for duration mentioned with subject
        duration_match = re.search(r'(\d+)\s*(?:hours?|hrs?|h)', subject, re.IGNORECASE)
        if duration_match:
            return int(duration_match.group(1)) * 60
        
        duration_match = re.search(r'(\d+)\s*(?:minutes?|mins?|m)', subject, re.IGNORECASE)
        if duration_match:
            return int(duration_match.group(1))
        
        # Default durations based on subject type
        subject_lower = subject.lower()
        
        if any(math_subject in subject_lower for math_subject in ['math', 'calculus', 'algebra', 'statistics']):
            return 90  # Math usually needs more time
        elif any(science_subject in subject_lower for science_subject in ['physics', 'chemistry', 'biology']):
            return 75
        elif any(lang_subject in subject_lower for lang_subject in ['english', 'literature', 'writing']):
            return 60
        else:
            return self.default_session_duration
    
    def estimate_difficulty(self, subject: str, preferences: Dict[str, Any]) -> str:
        """Estimate subject difficulty"""
        
        # Check preferences
        if 'difficulties' in preferences:
            subject_difficulties = preferences['difficulties']
            if isinstance(subject_difficulties, dict) and subject in subject_difficulties:
                return subject_difficulties[subject]
        
        # Default difficulty estimation
        subject_lower = subject.lower()
        
        advanced_subjects = ['calculus', 'physics', 'organic chemistry', 'differential equations']
        if any(adv_subject in subject_lower for adv_subject in advanced_subjects):
            return 'advanced'
        
        intermediate_subjects = ['algebra', 'chemistry', 'biology', 'statistics']
        if any(int_subject in subject_lower for int_subject in intermediate_subjects):
            return 'intermediate'
        
        return 'beginner'
    
    def parse_time_preferences(self, preferences: Dict[str, Any]) -> List[str]:
        """Parse time preferences from user input"""
        time_prefs = []
        
        if 'timePreferences' in preferences:
            time_prefs = preferences['timePreferences']
        elif 'preferredTimes' in preferences:
            time_prefs = preferences['preferredTimes']
        
        # If no preferences specified, default to common study times
        if not time_prefs:
            time_prefs = ['morning', 'afternoon']
        
        return time_prefs
    
    def generate_session_distribution(
        self, 
        subjects: List[Dict[str, Any]], 
        start_date: datetime, 
        end_date: datetime, 
        preferred_times: List[str]
    ) -> List[Dict[str, Any]]:
        """Generate optimal distribution of study sessions"""
        
        sessions = []
        total_days = (end_date - start_date).days
        
        if total_days <= 0:
            return sessions
        
        # Calculate total study time needed
        total_minutes = sum(subject['totalMinutes'] for subject in subjects)
        
        # Distribute sessions across available days
        daily_capacity = self.calculate_daily_capacity(preferred_times)
        sessions_per_day = min(daily_capacity // self.default_session_duration, len(subjects))
        
        current_date = start_date
        subject_index = 0
        
        while current_date < end_date and subject_index < len(subjects):
            daily_sessions = self.generate_daily_sessions(
                current_date, subjects, preferred_times, sessions_per_day
            )
            sessions.extend(daily_sessions)
            
            current_date += timedelta(days=1)
            
            # Rotate subjects to ensure even distribution
            subject_index = (subject_index + sessions_per_day) % len(subjects)
        
        return sessions
    
    def calculate_daily_capacity(self, preferred_times: List[str]) -> int:
        """Calculate daily study capacity in minutes"""
        total_capacity = 0
        
        for time_slot in preferred_times:
            if time_slot.lower() in self.time_slots:
                start_hour, end_hour = self.time_slots[time_slot.lower()]
                slot_duration = (end_hour - start_hour) * 60  # Convert to minutes
                total_capacity += slot_duration
        
        return total_capacity
    
    def generate_daily_sessions(
        self, 
        date: datetime, 
        subjects: List[Dict[str, Any]], 
        preferred_times: List[str], 
        max_sessions: int
    ) -> List[Dict[str, Any]]:
        """Generate study sessions for a specific day"""
        
        sessions = []
        current_time = date.replace(hour=9, minute=0)  # Start at 9 AM
        
        # Sort subjects by priority for this day
        sorted_subjects = sorted(subjects, key=lambda x: {
            'high': 3, 'medium': 2, 'low': 1
        }[x['priority']], reverse=True)
        
        sessions_created = 0
        subject_index = 0
        
        while sessions_created < max_sessions and subject_index < len(sorted_subjects):
            subject = sorted_subjects[subject_index]
            
            # Check if we're in a preferred time slot
            current_hour = current_time.hour
            in_preferred_slot = any(
                self.time_slots[slot.lower()][0] <= current_hour < self.time_slots[slot.lower()][1]
                for slot in preferred_times 
                if slot.lower() in self.time_slots
            )
            
            if in_preferred_slot or sessions_created == 0:  # Always create at least one session
                session = {
                    'subjectName': subject['name'],
                    'startTime': current_time.isoformat(),
                    'duration': min(subject['estimatedMinutes'], self.default_session_duration),
                    'priority': subject['priority'],
                    'sessionType': 'study',
                    'date': date.date().isoformat()
                }
                
                sessions.append(session)
                sessions_created += 1
                
                # Move to next time slot
                current_time += timedelta(minutes=session['duration'] + self.default_break_duration)
            
            subject_index += 1
        
        return sessions
    
    def generate_schedule_name(self, subjects: List[str], timeframe: str) -> str:
        """Generate a descriptive name for the schedule"""
        if len(subjects) == 1:
            subject_part = subjects[0].title()
        elif len(subjects) <= 3:
            subject_part = " & ".join(s.title() for s in subjects)
        else:
            subject_part = f"{subjects[0].title()} & {len(subjects)-1} more"
        
        timeframe_part = timeframe.title()
        timestamp = datetime.now().strftime("%m/%d")
        
        return f"{subject_part} - {timeframe_part} ({timestamp})"
    
    def validate_schedule_request(self, subjects: List[str], timeframe: str) -> Dict[str, Any]:
        """Validate a schedule request and return any issues"""
        issues = []
        warnings = []
        
        # Validate subjects
        if not subjects:
            issues.append("At least one subject is required")
        elif len(subjects) > 10:
            warnings.append("Large number of subjects may result in short sessions")
        
        # Validate timeframe
        try:
            start_date, end_date = self.parse_timeframe(timeframe)
            if start_date >= end_date:
                issues.append("Invalid timeframe: end date must be after start date")
            elif (end_date - start_date).days > 365:
                warnings.append("Very long timeframe may not be practical")
        except Exception as e:
            issues.append(f"Could not parse timeframe: {e}")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'warnings': warnings
        }
