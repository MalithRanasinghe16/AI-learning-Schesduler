import aiohttp
import asyncio
import json
import os
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class BackendClient:
    def __init__(self):
        self.base_url = os.getenv('BACKEND_API_URL', 'http://localhost:5000/api')
        self.timeout = aiohttp.ClientTimeout(total=30)
        self.session = None
        
    async def get_session(self):
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(timeout=self.timeout)
        return self.session
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def health_check(self) -> bool:
        """Check if the backend is available"""
        try:
            session = await self.get_session()
            async with session.get(f"{self.base_url}/health") as response:
                return response.status == 200
        except Exception as e:
            logger.error(f"Backend health check failed: {e}")
            return False
    
    async def make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to backend"""
        
        url = f"{self.base_url}{endpoint}"
        
        # Prepare headers
        request_headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        if headers:
            request_headers.update(headers)
        
        if auth_token:
            request_headers['Authorization'] = f'Bearer {auth_token}'
        
        # Prepare data
        json_data = json.dumps(data) if data else None
        
        try:
            session = await self.get_session()
            
            async with session.request(
                method=method,
                url=url,
                data=json_data,
                headers=request_headers
            ) as response:
                
                response_text = await response.text()
                
                # Try to parse JSON response
                try:
                    response_data = json.loads(response_text)
                except json.JSONDecodeError:
                    response_data = {'message': response_text}
                
                if response.status >= 400:
                    logger.error(f"Backend request failed: {response.status} - {response_data}")
                    raise Exception(f"Backend error: {response_data.get('message', 'Unknown error')}")
                
                logger.info(f"Backend request successful: {method} {endpoint}")
                return response_data
                
        except aiohttp.ClientError as e:
            logger.error(f"Network error in backend request: {e}")
            raise Exception(f"Network error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in backend request: {e}")
            raise
    
    async def get(self, endpoint: str, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Make GET request to backend"""
        return await self.make_request('GET', endpoint, headers=headers)
    
    async def post(self, endpoint: str, data: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Make POST request to backend"""
        return await self.make_request('POST', endpoint, data=data, headers=headers)
    
    async def put(self, endpoint: str, data: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Make PUT request to backend"""
        return await self.make_request('PUT', endpoint, data=data, headers=headers)
    
    async def delete(self, endpoint: str, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Make DELETE request to backend"""
        return await self.make_request('DELETE', endpoint, headers=headers)
    
    async def get_user_subjects(self, user_id: str, auth_token: str) -> List[Dict[str, Any]]:
        """Get all subjects for a user"""
        try:
            response = await self.make_request(
                'GET', 
                '/subjects',
                auth_token=auth_token
            )
            return response.get('data', response.get('subjects', []))
        except Exception as e:
            logger.error(f"Error fetching user subjects: {e}")
            return []
    
    async def create_subject(
        self, 
        user_id: str, 
        subject_data: Dict[str, Any], 
        auth_token: str
    ) -> Dict[str, Any]:
        """Create a new subject"""
        return await self.make_request(
            'POST',
            '/subjects',
            data=subject_data,
            auth_token=auth_token
        )
    
    async def get_user_schedules(self, user_id: str, auth_token: str) -> List[Dict[str, Any]]:
        """Get all schedules for a user"""
        try:
            response = await self.make_request(
                'GET',
                '/schedules',
                auth_token=auth_token
            )
            return response.get('data', response.get('schedules', []))
        except Exception as e:
            logger.error(f"Error fetching user schedules: {e}")
            return []
    
    async def create_schedule(
        self, 
        user_id: str, 
        schedule_data: Dict[str, Any], 
        auth_token: str
    ) -> Dict[str, Any]:
        """Create a new schedule"""
        
        # Transform chatbot format to backend format
        backend_schedule = self.transform_schedule_for_backend(schedule_data, user_id)
        
        response = await self.make_request(
            'POST',
            '/schedules',
            data=backend_schedule,
            auth_token=auth_token
        )
        
        return response
    
    def transform_schedule_for_backend(
        self, 
        chatbot_schedule: Dict[str, Any], 
        user_id: str
    ) -> Dict[str, Any]:
        """Transform chatbot schedule format to backend API format"""
        
        # Extract subjects that need to be created/verified
        subjects_to_verify = []
        for subject in chatbot_schedule.get('subjects', []):
            subjects_to_verify.append(subject['name'])
        
        # Transform session distribution to schedule sessions
        sessions = []
        for session in chatbot_schedule.get('sessionDistribution', []):
            # Parse the session data
            start_time = datetime.fromisoformat(session['startTime'])
            
            backend_session = {
                'subjectName': session['subjectName'],
                'startTime': session['startTime'],
                'endTime': (start_time.replace(microsecond=0) + 
                           timedelta(minutes=session['duration'])).isoformat(),
                'duration': session['duration'],
                'status': 'scheduled',
                'priority': self.map_priority_to_number(session.get('priority', 'medium')),
                'sessionType': session.get('sessionType', 'study')
            }
            sessions.append(backend_session)
        
        # Create the backend schedule format
        backend_schedule = {
            'name': chatbot_schedule['name'],
            'startDate': chatbot_schedule['startDate'],
            'endDate': chatbot_schedule['endDate'],
            'subjects': subjects_to_verify,
            'preferences': {
                'dailyStudyGoal': chatbot_schedule.get('totalDuration', 120),
                'preferredTimeSlots': chatbot_schedule.get('preferredTimes', ['morning', 'afternoon']),
                'difficultyLevel': 'intermediate'  # Default
            },
            'sessions': sessions,
            'scheduleType': 'ai_generated'
        }
        
        return backend_schedule
    
    def map_priority_to_number(self, priority: str) -> int:
        """Map priority string to number"""
        priority_map = {
            'high': 5,
            'medium': 3,
            'low': 1
        }
        return priority_map.get(priority.lower(), 3)
    
    async def update_schedule(
        self, 
        schedule_id: str, 
        updates: Dict[str, Any], 
        auth_token: str
    ) -> Dict[str, Any]:
        """Update an existing schedule"""
        return await self.make_request(
            'PUT',
            f'/schedules/{schedule_id}',
            data=updates,
            auth_token=auth_token
        )
    
    async def delete_schedule(self, schedule_id: str, auth_token: str) -> Dict[str, Any]:
        """Delete a schedule"""
        return await self.make_request(
            'DELETE',
            f'/schedules/{schedule_id}',
            auth_token=auth_token
        )
    
    async def get_schedule_sessions(
        self, 
        schedule_id: str, 
        auth_token: str
    ) -> List[Dict[str, Any]]:
        """Get sessions for a specific schedule"""
        try:
            response = await self.make_request(
                'GET',
                f'/schedule-sessions/{schedule_id}',
                auth_token=auth_token
            )
            return response.get('data', response.get('sessions', []))
        except Exception as e:
            logger.error(f"Error fetching schedule sessions: {e}")
            return []
    
    async def create_schedule_session(
        self, 
        schedule_id: str, 
        session_data: Dict[str, Any], 
        auth_token: str
    ) -> Dict[str, Any]:
        """Create a new schedule session"""
        return await self.make_request(
            'POST',
            f'/schedule-sessions/{schedule_id}',
            data=session_data,
            auth_token=auth_token
        )
    
    async def update_session_status(
        self, 
        session_id: str, 
        status: str, 
        auth_token: str
    ) -> Dict[str, Any]:
        """Update session status"""
        return await self.make_request(
            'PATCH',
            f'/schedule-sessions/session/{session_id}/status',
            data={'status': status},
            auth_token=auth_token
        )
    
    async def get_user_analytics(self, user_id: str, auth_token: str) -> Dict[str, Any]:
        """Get user analytics"""
        try:
            response = await self.make_request(
                'GET',
                '/analytics/dashboard',
                auth_token=auth_token
            )
            return response.get('data', {})
        except Exception as e:
            logger.error(f"Error fetching user analytics: {e}")
            return {}
    
    async def generate_ai_schedule(
        self, 
        user_id: str, 
        subject_ids: List[str], 
        start_date: str, 
        auth_token: str
    ) -> Dict[str, Any]:
        """Generate AI schedule through backend"""
        data = {
            'subjectIds': subject_ids,
            'startDate': start_date
        }
        
        return await self.make_request(
            'POST',
            '/schedules/generate',
            data=data,
            auth_token=auth_token
        )
    
    async def search_subjects(self, query: str, auth_token: str) -> List[Dict[str, Any]]:
        """Search for subjects by name"""
        try:
            response = await self.make_request(
                'GET',
                f'/subjects/search?q={query}',
                auth_token=auth_token
            )
            return response.get('data', response.get('subjects', []))
        except Exception as e:
            logger.error(f"Error searching subjects: {e}")
            return []
    
    async def get_today_sessions(self, auth_token: str) -> List[Dict[str, Any]]:
        """Get today's sessions for user"""
        try:
            today = datetime.now().date().isoformat()
            response = await self.make_request(
                'GET',
                f'/schedule-sessions/today?date={today}',
                auth_token=auth_token
            )
            return response.get('data', response.get('sessions', []))
        except Exception as e:
            logger.error(f"Error fetching today's sessions: {e}")
            return []
    
    async def get_analytics(self, user_id: str, auth_token: str) -> Optional[Dict[str, Any]]:
        """Get user analytics data from backend"""
        try:
            response = await self.make_request(
                'GET',
                '/analytics/dashboard',
                auth_token=auth_token
            )
            return response
        except Exception as e:
            logger.error(f"Error fetching analytics for user {user_id}: {e}")
            return None

    async def get_user_context(self, user_id: str, auth_token: str = None) -> Optional[Dict[str, Any]]:
        """Get comprehensive user context for intelligent suggestions"""
        try:
            context = {}
            
            # Get user subjects
            try:
                if auth_token:
                    subjects = await self.get_user_subjects(user_id, auth_token)
                    context['subjects'] = subjects
                else:
                    context['subjects'] = []
            except Exception as e:
                logger.warning(f"Could not fetch subjects for user context: {e}")
                context['subjects'] = []
            
            # Get recent sessions (last 10)
            try:
                if auth_token:
                    sessions_response = await self.make_request(
                        'GET',
                        f'/sessions?limit=10&sort=-createdAt',
                        auth_token=auth_token
                    )
                    recent_sessions = sessions_response.get('sessions', [])
                    context['recent_sessions'] = recent_sessions
                else:
                    context['recent_sessions'] = []
            except Exception as e:
                logger.warning(f"Could not fetch recent sessions: {e}")
                context['recent_sessions'] = []
            
            # Check for upcoming deadlines
            try:
                upcoming_deadlines = []
                if context.get('subjects'):
                    for subject in context['subjects']:
                        if subject.get('deadline'):
                            deadline_date = datetime.fromisoformat(subject['deadline'].replace('Z', '+00:00'))
                            days_until = (deadline_date - datetime.now()).days
                            if days_until >= 0 and days_until <= 7:  # Next 7 days
                                upcoming_deadlines.append({
                                    'name': subject['name'],
                                    'deadline': subject['deadline'],
                                    'days_until': days_until,
                                    'progress': subject.get('progress', 0)
                                })
                
                # Sort by nearest deadline
                upcoming_deadlines.sort(key=lambda x: x['days_until'])
                context['upcoming_deadlines'] = upcoming_deadlines
                
            except Exception as e:
                logger.warning(f"Could not process deadlines: {e}")
                context['upcoming_deadlines'] = []
            
            # Get user analytics for additional context
            try:
                if auth_token:
                    analytics = await self.get_user_analytics(user_id, auth_token)
                    context['analytics'] = analytics
                else:
                    context['analytics'] = {}
            except Exception as e:
                logger.warning(f"Could not fetch analytics for context: {e}")
                context['analytics'] = {}
            
            return context
            
        except Exception as e:
            logger.error(f"Error fetching user context for {user_id}: {e}")
            return None

# Utility function to handle datetime serialization
from datetime import timedelta

def serialize_datetime(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, timedelta):
        return obj.total_seconds()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
