from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
import logging
from datetime import datetime, timedelta
import numpy as np
import requests
import spacy

# Load environment variables
load_dotenv()

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Warning: spaCy English model not found. Please install it with: python -m spacy download en_core_web_sm")
    nlp = None

# Backend URL
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')

# Import our modules
from nlp_processor import NLPProcessor
from intent_classifier import IntentClassifier
from schedule_parser import ScheduleParser
from backend_client import BackendClient
from auth_manager import AuthManager
from prioritization_engine import (
    PrioritizationEngine, 
    SubjectFeatures, 
    SessionFeedback,
    prioritization_engine
)

# Configure logging
logging.basicConfig(level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')))
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Learning Scheduler Chatbot",
    description="Intelligent chatbot for schedule management",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Vite and React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Initialize services
nlp_processor = NLPProcessor()
intent_classifier = IntentClassifier()
schedule_parser = ScheduleParser()
backend_client = BackendClient()
auth_manager = AuthManager()

# Global conversation state management
conversation_states = {}

class ConversationStep:
    # Subject Addition Steps
    ADD_SUBJECT_START = "add_subject_start"
    ADD_SUBJECT_NAME = "add_subject_name"
    ADD_SUBJECT_DESCRIPTION = "add_subject_description"
    ADD_SUBJECT_DIFFICULTY = "add_subject_difficulty"
    ADD_SUBJECT_CATEGORY = "add_subject_category"
    ADD_SUBJECT_HOURS = "add_subject_hours"
    ADD_SUBJECT_PRIORITY = "add_subject_priority"
    ADD_SUBJECT_TAGS = "add_subject_tags"
    ADD_SUBJECT_CONFIRM = "add_subject_confirm"
    
    # Schedule Creation Steps
    CREATE_SCHEDULE_START = "create_schedule_start"
    CREATE_SCHEDULE_NAME = "create_schedule_name"
    CREATE_SCHEDULE_SUBJECTS = "create_schedule_subjects"
    CREATE_SCHEDULE_DATES = "create_schedule_dates"
    CREATE_SCHEDULE_DAILY_HOURS = "create_schedule_daily_hours"
    CREATE_SCHEDULE_SESSION_DURATION = "create_schedule_session_duration"
    CREATE_SCHEDULE_PREFERRED_TIMES = "create_schedule_preferred_times"
    CREATE_SCHEDULE_CONFIRM = "create_schedule_confirm"

def get_user_conversation_state(user_id: str):
    """Get or create conversation state for user"""
    if user_id not in conversation_states:
        conversation_states[user_id] = {
            "step": None,
            "data": {},
            "last_activity": datetime.now()
        }
    return conversation_states[user_id]

def update_conversation_state(user_id: str, step: str, data: dict = None):
    """Update conversation state"""
    state = get_user_conversation_state(user_id)
    state["step"] = step
    state["last_activity"] = datetime.now()
    if data:
        state["data"].update(data)
    return state

def clear_conversation_state(user_id: str):
    """Clear conversation state"""
    if user_id in conversation_states:
        del conversation_states[user_id]

async def show_intelligent_welcome(user_id: str = None, auth_token: str = None):
    """Show intelligent welcome with contextual suggestions based on user data"""
    try:
        # Get current time for contextual greetings
        current_hour = datetime.now().hour
        if current_hour < 12:
            greeting = "Good morning"
        elif current_hour < 17:
            greeting = "Good afternoon"
        else:
            greeting = "Good evening"
        
        # Base welcome message
        welcome_msg = f"🤖 **{greeting}! I'm your AI Study Assistant.**\n\n"
        welcome_msg += "I understand natural language, so just tell me what you'd like to do!\n\n"
        
        # Get user context for smart suggestions
        contextual_suggestions = []
        smart_tips = []
        
        try:
            if user_id and user_id != "anonymous":
                # Try to fetch user data for contextual suggestions
                user_data = await backend_client.get_user_context(user_id, auth_token)
                if user_data:
                    # Generate contextual suggestions based on user data
                    contextual_suggestions, smart_tips = generate_contextual_suggestions(user_data)
        except Exception as e:
            logger.warning(f"Could not fetch user context: {e}")
        
        # Default suggestions if no user context
        if not contextual_suggestions:
            contextual_suggestions = [
                "Schedule 2 hours for math today",
                "What should I study next?",
                "Show my progress in physics",
                "Add a new subject called Chemistry",
                "How much time did I study this week?"
            ]
        
        if not smart_tips:
            smart_tips = [
                "💡 **Try natural language**: \"Schedule math for tomorrow morning\"",
                "🎯 **Ask for recommendations**: \"What should I study right now?\"",
                "📊 **Check progress**: \"How am I doing in physics?\"",
                "⚡ **Quick actions**: Type 'show menu' to see all options"
            ]
        
        # Build response with tips and suggestions
        welcome_msg += "**Here are some ways to get started:**\n"
        for tip in smart_tips[:3]:  # Show max 3 tips
            welcome_msg += f"{tip}\n"
        
        return ChatResponse(
            response=welcome_msg,
            intent="intelligent_welcome",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"welcome_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[],  # No buttons - encourage natural language
            suggestions=contextual_suggestions
        )
    except Exception as e:
        logger.error(f"Error generating intelligent welcome: {e}")
        # Fallback to simple welcome
        return show_simple_welcome()

def generate_contextual_suggestions(user_data: dict) -> tuple[list, list]:
    """Generate smart suggestions based on user context"""
    suggestions = []
    tips = []
    
    try:
        subjects = user_data.get('subjects', [])
        recent_sessions = user_data.get('recent_sessions', [])
        upcoming_deadlines = user_data.get('upcoming_deadlines', [])
        
        # Contextual suggestions based on data
        if upcoming_deadlines:
            nearest_deadline = upcoming_deadlines[0]
            days_left = (datetime.fromisoformat(nearest_deadline['deadline']) - datetime.now()).days
            if days_left <= 3:
                suggestions.append(f"Focus on {nearest_deadline['name']} - deadline in {days_left} days!")
                tips.append(f"⚠️ **Urgent**: {nearest_deadline['name']} deadline approaching!")
        
        if subjects:
            # Find subjects with low progress
            low_progress_subjects = [s for s in subjects if s.get('progress', 0) < 30]
            if low_progress_subjects:
                subject_name = low_progress_subjects[0]['name']
                suggestions.append(f"Work on {subject_name} - needs attention")
        
        # Check for inactive subjects
        if recent_sessions:
            studied_subjects = {s['subject_name'] for s in recent_sessions[-5:]}  # Last 5 sessions
            all_subjects = {s['name'] for s in subjects}
            neglected = all_subjects - studied_subjects
            if neglected:
                subject_name = list(neglected)[0]
                suggestions.append(f"Haven't studied {subject_name} recently")
                tips.append(f"🕒 **Reminder**: You haven't studied {subject_name} in a while")
        
        # Time-based suggestions
        current_hour = datetime.now().hour
        if 9 <= current_hour <= 11:
            suggestions.append("Perfect time for focused math work")
            tips.append("🌅 **Morning boost**: Great time for analytical subjects!")
        elif 14 <= current_hour <= 16:
            suggestions.append("Good afternoon for creative subjects")
            tips.append("☀️ **Afternoon energy**: Ideal for creative or discussion-based learning")
        
        # Add variety in suggestions
        suggestions.extend([
            "What's the most important thing to study today?",
            "Create a schedule for this week",
            "Show my learning analytics"
        ])
        
        # Add helpful tips
        tips.extend([
            "💬 **Natural conversation**: Ask me anything like 'What should I focus on?'",
            "🚀 **Smart scheduling**: I'll prioritize based on deadlines and difficulty",
            "📈 **Progress tracking**: I analyze your study patterns to help you improve"
        ])
        
    except Exception as e:
        logger.error(f"Error generating contextual suggestions: {e}")
    
    return suggestions[:6], tips[:4]  # Limit suggestions and tips

def show_simple_welcome():
    """Simple fallback welcome message"""
    return ChatResponse(
        response="🤖 **Hi there! I'm your AI Study Assistant.**\n\nI understand natural language - just tell me what you'd like to do!\n\n💡 **Try saying**: \"Schedule math for tomorrow\" or \"What should I study?\"",
        intent="simple_welcome",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"simple_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[],
        suggestions=[
            "What should I study today?",
            "Schedule 2 hours for math",
            "Show my progress",
            "Add a new subject",
            "Create a study plan"
        ]
    )

def show_main_menu():
    """Show structured main menu options (accessible via 'show menu' command)"""
    return ChatResponse(
        response="📋 **Main Menu Options**\n\nHere are all the things I can help you with:",
        intent="main_menu",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"menu_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "add-subject", "label": "📝 Add New Subject", "icon": "plus", "message": "I want to add a new subject", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
            {"id": "create-schedule", "label": "📅 Create Schedule", "icon": "calendar", "message": "I want to create a study schedule", "color": "bg-green-600 hover:bg-green-700 text-white"},
            {"id": "view-schedule", "label": "👁️ View Schedule", "icon": "eye", "message": "Show my current schedules", "color": "bg-purple-600 hover:bg-purple-700 text-white"},
            {"id": "progress", "label": "📊 View Progress", "icon": "chart", "message": "Show my study progress", "color": "bg-orange-600 hover:bg-orange-700 text-white"}
        ],
        suggestions=[
            "Add a new subject",
            "Create study schedule", 
            "Show my schedules",
            "How much progress have I made?",
            "What should I study next?"
        ]
    )

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    intent: str
    confidence: float
    entities: Dict[str, Any]
    actions: List[Dict[str, Any]]
    conversation_id: str
    quick_actions: Optional[List[Dict[str, Any]]] = []
    suggestions: Optional[List[str]] = []

class ScheduleRequest(BaseModel):
    subjects: List[str]
    timeframe: str
    preferences: Optional[Dict[str, Any]] = None

# New Pydantic models for prioritization engine
class SubjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    difficulty: int  # 1=Beginner, 2=Intermediate, 3=Advanced
    priority: int    # 1=Low, 2=Medium, 3=High
    category: str
    estimated_hours: float
    deadline: Optional[str] = None  # ISO format date string
    tags: Optional[List[str]] = []

class ScheduleGenerationRequest(BaseModel):
    user_id: str
    subject_ids: List[str]
    start_date: str  # ISO format
    end_date: str    # ISO format
    daily_hours: int
    session_duration: int  # minutes
    preferred_times: List[str]  # ['morning', 'afternoon', 'evening']

class FeedbackSubmissionRequest(BaseModel):
    subject_id: str
    completion_rate: float  # 0.0 to 1.0
    focus_score: float     # 1.0 to 10.0
    stress_level: float    # 1.0 to 10.0
    session_duration: float  # actual minutes
    planned_duration: float  # planned minutes

class OptimalSubjectRequest(BaseModel):
    user_id: str
    available_subject_ids: Optional[List[str]] = None

# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        user_data = auth_manager.verify_token(credentials.credentials)
        # Add the original token to user_data for backend API calls
        user_data['token'] = credentials.credentials
        return user_data
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.get("/")
async def root():
    return {
        "message": "AI Learning Scheduler Chatbot API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check if NLP processor is ready
        nlp_status = nlp_processor.is_ready()
        
        # Check backend connectivity
        backend_status = await backend_client.health_check()
        
        return {
            "status": "healthy" if nlp_status and backend_status else "degraded",
            "services": {
                "nlp_processor": "ready" if nlp_status else "not_ready",
                "backend_connection": "connected" if backend_status else "disconnected"
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/analytics")
async def get_chatbot_analytics(current_user: dict = Depends(get_current_user)):
    """Enhanced analytics endpoint for chatbot integration"""
    try:
        # Get analytics data from backend
        analytics_data = await backend_client.get_analytics(
            current_user['user_id'], 
            current_user.get('token', '')
        )
        
        if not analytics_data:
            return {
                "success": False,
                "message": "No analytics data available",
                "data": {
                    "weeklyStats": {
                        "totalStudyTime": 0,
                        "totalSessions": 0,
                        "completionRate": 0,
                        "averageFocus": 0
                    },
                    "subjectProgress": {
                        "total": 0,
                        "completed": 0,
                        "inProgress": 0,
                        "notStarted": 0,
                        "details": []
                    },
                    "insights": {
                        "motivationalMessage": "Ready to start your learning journey?",
                        "recommendations": [
                            "Add your first subject to begin tracking progress",
                            "Create a study schedule to stay organized",
                            "Set study goals to measure success"
                        ]
                    }
                }
            }
        
        # Enhanced analytics with insights
        enhanced_analytics = {
            "success": True,
            "data": analytics_data,
            "chatbot_insights": {
                "performance_level": get_performance_level(analytics_data),
                "focus_trend": get_focus_trend(analytics_data),
                "suggestions": get_personalized_suggestions(analytics_data),
                "motivational_message": get_motivational_message(analytics_data)
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return enhanced_analytics
        
    except Exception as e:
        logger.error(f"Error in chatbot analytics endpoint: {e}")
        return {
            "success": False,
            "message": f"Analytics error: {str(e)}",
            "data": None,
            "timestamp": datetime.now().isoformat()
        }

def get_performance_level(analytics_data):
    """Determine user's performance level"""
    weekly_stats = analytics_data.get('weeklyStats', {})
    completion_rate = weekly_stats.get('completionRate', 0)
    average_focus = weekly_stats.get('averageFocus', 0)
    total_sessions = weekly_stats.get('totalSessions', 0)
    
    if completion_rate >= 80 and average_focus >= 8 and total_sessions >= 5:
        return "Excellent"
    elif completion_rate >= 60 and average_focus >= 6 and total_sessions >= 3:
        return "Good"
    elif completion_rate >= 40 and total_sessions >= 1:
        return "Improving"
    else:
        return "Getting Started"

def get_focus_trend(analytics_data):
    """Analyze focus trend"""
    weekly_stats = analytics_data.get('weeklyStats', {})
    average_focus = weekly_stats.get('averageFocus', 0)
    
    if average_focus >= 8:
        return "Excellent focus levels"
    elif average_focus >= 6:
        return "Good focus, room for improvement"
    elif average_focus >= 4:
        return "Moderate focus, consider reducing distractions"
    else:
        return "Focus needs attention"

def get_personalized_suggestions(analytics_data):
    """Generate personalized suggestions"""
    suggestions = []
    weekly_stats = analytics_data.get('weeklyStats', {})
    subject_progress = analytics_data.get('subjectProgress', {})
    
    completion_rate = weekly_stats.get('completionRate', 0)
    average_focus = weekly_stats.get('averageFocus', 0)
    total_sessions = weekly_stats.get('totalSessions', 0)
    not_started = subject_progress.get('notStarted', 0)
    
    if completion_rate < 50:
        suggestions.append("Try breaking study sessions into smaller, manageable chunks")
    
    if average_focus < 6:
        suggestions.append("Consider using focus techniques like Pomodoro method")
    
    if total_sessions < 3:
        suggestions.append("Aim for more consistent daily study sessions")
    
    if not_started > 0:
        suggestions.append(f"You have {not_started} subjects waiting to be started")
    
    if not suggestions:
        suggestions.append("Keep up the great work! Your study habits are on track")
    
    return suggestions

def get_motivational_message(analytics_data):
    """Generate motivational message based on progress"""
    weekly_stats = analytics_data.get('weeklyStats', {})
    total_sessions = weekly_stats.get('totalSessions', 0)
    completion_rate = weekly_stats.get('completionRate', 0)
    
    if total_sessions == 0:
        return "Every expert was once a beginner. Start your first study session today!"
    elif completion_rate >= 80:
        return "Outstanding progress! You're developing excellent study habits."
    elif completion_rate >= 60:
        return "Great momentum! Keep pushing forward toward your goals."
    elif completion_rate >= 40:
        return "Good progress! Every session brings you closer to success."
    else:
        return "Remember: Progress, not perfection. Every small step counts!"

@app.post("/chat", response_model=ChatResponse)
async def chat(message: ChatMessage, current_user: dict = Depends(get_current_user)):
    """Main chat endpoint for processing user messages"""
    try:
        logger.info(f"Processing message from user {current_user.get('user_id')}: {message.message}")
        
        # Process the message through NLP
        processed_message = nlp_processor.process(message.message)
        
        # Classify intent
        intent_result = intent_classifier.classify(processed_message)
        
        # Generate response based on intent
        response_data = await generate_response(
            message=message.message,
            intent_result=intent_result,
            processed_message=processed_message,
            user_data=current_user,
            conversation_id=message.conversation_id
        )
        
        return response_data
        
    except Exception as e:
        logger.error(f"Error processing chat message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing message: {str(e)}"
        )

@app.post("/chat/demo", response_model=ChatResponse)
async def chat_demo(message: ChatMessage):
    """Demo chat endpoint that doesn't require authentication"""
    try:
        logger.info(f"Processing demo message: {message.message}")
        
        # Create a demo user for testing (no authentication)
        demo_user = {
            'user_id': 'demo_user',
            'email': 'demo@example.com',
            'firstName': 'Demo',
            'lastName': 'User'
        }
        
        # Process the message through NLP
        processed_message = nlp_processor.process(message.message)
        
        # Classify intent
        intent_result = intent_classifier.classify(processed_message)
        
        # Generate response based on intent
        response_data = await generate_response(
            message=message.message,
            intent_result=intent_result,
            processed_message=processed_message,
            user_data=demo_user,
            conversation_id=message.conversation_id or "demo_conversation"
        )
        
        return response_data
        
    except Exception as e:
        logger.error(f"Error processing demo chat message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing message: {str(e)}"
        )

@app.post("/schedule/create")
async def create_schedule_from_chat(
    schedule_req: ScheduleRequest, 
    current_user: dict = Depends(get_current_user)
):
    """Create a schedule based on chat conversation"""
    try:
        # Parse schedule requirements
        parsed_schedule = schedule_parser.parse_schedule_request(
            subjects=schedule_req.subjects,
            timeframe=schedule_req.timeframe,
            preferences=schedule_req.preferences or {}
        )
        
        # Create schedule through backend
        result = await backend_client.create_schedule(
            user_id=current_user['user_id'],
            schedule_data=parsed_schedule
        )
        
        return {
            "success": True,
            "schedule_id": result.get('schedule_id'),
            "message": "Schedule created successfully",
            "schedule_data": result
        }
        
    except Exception as e:
        logger.error(f"Error creating schedule: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating schedule: {str(e)}"
        )

async def generate_response(
    message: str,
    intent_result: dict,
    processed_message: dict,
    user_data: dict,
    conversation_id: Optional[str] = None
) -> ChatResponse:
    """Generate appropriate response based on intent and context"""
    
    user_id = user_data['user_id']
    conversation_state = get_user_conversation_state(user_id)
    
    # Check if user is in middle of a conversation flow
    if conversation_state["step"]:
        return await handle_conversation_flow(message, user_id, conversation_state, user_data)
    
    intent = intent_result['intent']
    confidence = intent_result['confidence']
    entities = processed_message.get('entities', {})
    
    # Generate conversation ID if not provided
    if not conversation_id:
        conversation_id = f"conv_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user_data['user_id']}"
    
    # Check for main menu triggers (keep structured menu accessible)
    if any(keyword in message.lower() for keyword in ["show menu", "main menu", "menu"]):
        clear_conversation_state(user_id)
        return show_main_menu()
    
    # Check for help/start over triggers (show intelligent welcome)
    if any(keyword in message.lower() for keyword in ["start over", "help", "what can you do", "hello", "hi"]):
        clear_conversation_state(user_id)
        auth_token = user_data.get('auth_token') if user_data else None
        return await show_intelligent_welcome(user_id, auth_token)
    
    # Check for specific action triggers (prioritize these over intent classification)
    message_lower = message.lower().strip()
    
    if any(keyword in message_lower for keyword in ["add subject", "new subject", "create subject"]):
        logger.info(f"Detected subject creation keywords in: {message}")
        return await start_add_subject_flow(user_id, user_data)
    
    if any(keyword in message_lower for keyword in ["create schedule", "new schedule", "generate schedule", "prioritized schedule", "AI schedule", "schedule generation"]):
        logger.info(f"Detected schedule creation keywords in: {message}")
        return await start_create_schedule_flow(user_id, user_data)
    
    # Check for prioritization-related keywords (EXACT MATCH FIRST)
    if message.lower().strip() == "what should i study":
        logger.info(f"Exact match for recommendation button: {message}")
        return await handle_study_recommendation_request(user_id, message, user_data)
    
    # Check for prioritization-related keywords
    prioritization_keywords = [
        "recommend", "suggestion", "what should I study", "next subject", 
        "optimal", "best subject", "prioritize", "most important",
        "deadline", "urgent", "high priority", "AI recommend",
        "get recommendation", "study recommendation"
    ]
    
    if any(keyword in message.lower() for keyword in prioritization_keywords):
        logger.info(f"Detected prioritization keywords in: {message}")
        return await handle_study_recommendation_request(user_id, message, user_data)
    
    # Check for feedback-related keywords
    feedback_keywords = [
        "completed session", "finished studying", "session feedback",
        "rate session", "focus score", "stress level", "how was study"
    ]
    
    if any(keyword in message.lower() for keyword in feedback_keywords):
        return await handle_feedback_collection_request(user_id, message, user_data)
    
    # Check for schedule viewing keywords
    schedule_view_keywords = [
        "show my current schedules", "show my schedules", "view my schedules", 
        "view schedule", "view my schedule", "current schedules", "my schedules",
        "show schedules", "display schedules", "list schedules"
    ]
    
    if any(keyword in message.lower() for keyword in schedule_view_keywords):
        logger.info(f"Detected schedule viewing keywords in: {message}")
        return await handle_get_schedule_intent({}, user_data, conversation_id, 1.0)
    
    # Check for progress viewing keywords
    progress_keywords = [
        "show my study progress", "view progress", "my progress", "study progress",
        "how am i doing", "progress report", "analytics", "statistics", "stats",
        "completion rate", "focus score", "study time", "performance"
    ]
    
    if any(keyword in message.lower() for keyword in progress_keywords):
        logger.info(f"Detected progress viewing keywords in: {message}")
        return await handle_progress_request(user_data, conversation_id)
    
    # Check for schedule selection messages (e.g., "Show sessions for Mathematics Schedule")
    if "show sessions for" in message_lower:
        schedule_name = message_lower.replace("show sessions for", "").strip()
        return await handle_schedule_selection(schedule_name, user_data, conversation_id)

    # Handle different intents if no specific flow detected
    if intent == 'create_schedule':
        return await start_create_schedule_flow(user_id, user_data)
    elif intent == 'add_subject':
        return await start_add_subject_flow(user_id, user_data)
    elif intent == 'get_schedule':
        return await handle_get_schedule_intent(entities, user_data, conversation_id, confidence)
    elif intent == 'general_question':
        # Handle general questions with helpful responses
        return ChatResponse(
            response="🤖 **I'm here to help with your study planning!**\n\nI can help you:\n• Create and manage subjects\n• Generate AI-optimized study schedules\n• Get study recommendations\n• Track your progress\n\nWhat would you like to do?",
            intent="general_help",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=conversation_id,
            quick_actions=[],  # No buttons - encourage natural language
            suggestions=[
                "Add a new subject called Biology",
                "Create a schedule for this week", 
                "What should I study right now?",
                "Show my progress in mathematics",
                "Show menu"
            ]
        )
    else:
        # Show intelligent welcome for unclear requests
        auth_token = user_data.get('auth_token') if user_data else None
        return await show_intelligent_welcome(user_data.get('user_id') if user_data else None, auth_token)
        return show_main_menu()

async def handle_conversation_flow(message: str, user_id: str, conversation_state: dict, user_data: dict):
    """Handle step-by-step conversation flows"""
    step = conversation_state["step"]
    data = conversation_state["data"]
    
    # Subject Addition Flow
    if step == ConversationStep.ADD_SUBJECT_NAME:
        return await handle_subject_name_step(message, user_id, data, user_data)
    elif step == ConversationStep.ADD_SUBJECT_DESCRIPTION:
        return await handle_subject_description_step(message, user_id, data, user_data)
    elif step == ConversationStep.ADD_SUBJECT_DIFFICULTY:
        return await handle_subject_difficulty_step_enhanced(message, user_id, data, user_data)
    elif step == ConversationStep.ADD_SUBJECT_CATEGORY:
        return await handle_subject_category_step(message, user_id, data, user_data)
    elif step == ConversationStep.ADD_SUBJECT_HOURS:
        return await handle_subject_hours_step(message, user_id, data, user_data)
    elif step == ConversationStep.ADD_SUBJECT_PRIORITY:
        return await handle_subject_priority_step_enhanced(message, user_id, data, user_data)
    elif step == ConversationStep.ADD_SUBJECT_DEADLINE:
        return await handle_subject_deadline_step(message, user_id, data, user_data)
    elif step == ConversationStep.ADD_SUBJECT_TAGS:
        return await handle_subject_tags_step(message, user_id, data, user_data)
    elif step == ConversationStep.ADD_SUBJECT_CONFIRM:
        return await handle_subject_confirm_step(message, user_id, data, user_data)
    
    # Schedule Creation Flow
    elif step == ConversationStep.CREATE_SCHEDULE_NAME:
        return await handle_schedule_name_step(message, user_id, data, user_data)
    elif step == ConversationStep.CREATE_SCHEDULE_SUBJECTS:
        return await handle_schedule_subjects_step(message, user_id, data, user_data)
    elif step == ConversationStep.CREATE_SCHEDULE_DATES:
        return await handle_schedule_dates_step(message, user_id, data, user_data)
    elif step == ConversationStep.CREATE_SCHEDULE_DAILY_HOURS:
        return await handle_schedule_daily_hours_step(message, user_id, data, user_data)
    elif step == ConversationStep.CREATE_SCHEDULE_SESSION_DURATION:
        return await handle_schedule_session_duration_step(message, user_id, data, user_data)
    elif step == ConversationStep.CREATE_SCHEDULE_PREFERRED_TIMES:
        return await handle_schedule_preferred_times_step(message, user_id, data, user_data)
    elif step == ConversationStep.CREATE_SCHEDULE_CONFIRM:
        return await handle_schedule_confirm_step(message, user_id, data, user_data)
    
    # Feedback Collection Flow
    elif step == "feedback_collection":
        return await handle_feedback_focus_step(message, user_id, data, user_data)
    elif step == "feedback_stress":
        return await handle_feedback_stress_step(message, user_id, data, user_data)
    elif step == "feedback_completion":
        return await handle_feedback_completion_step(message, user_id, data, user_data)
    
    # Fallback to intelligent welcome
    clear_conversation_state(user_id)
    auth_token = user_data.get('auth_token') if user_data else None
    return await show_intelligent_welcome(user_data.get('user_id') if user_data else None, auth_token)

# ================== SUBJECT ADDITION FLOW ==================

async def start_add_subject_flow(user_id: str, user_data: dict):
    """Start the subject addition flow"""
    update_conversation_state(user_id, ConversationStep.ADD_SUBJECT_NAME, {})
    return ChatResponse(
        response="📝 **Let's add a new subject to your profile!**\n\n**Step 1 of 7: Subject Name**\n\nWhat would you like to call this subject?\n\n*Example: Mathematics, Physics, Computer Science*",
        intent="add_subject_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=[
            "Mathematics",
            "Physics", 
            "Computer Science",
            "Biology"
        ]
    )

async def handle_subject_name_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle subject name input"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    if len(message.strip()) < 2:
        return ChatResponse(
            response="⚠️ Subject name should be at least 2 characters long. Please try again:",
            intent="add_subject_flow",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[],
            suggestions=["Mathematics", "Physics", "Computer Science"]
        )
    
    # Save the name and move to description
    update_conversation_state(user_id, ConversationStep.ADD_SUBJECT_DESCRIPTION, {"name": message.strip()})
    
    return ChatResponse(
        response=f"✅ Great! Subject name: **{message.strip()}**\n\n**Step 2 of 7: Description**\n\nPlease provide a brief description of this subject. What will you be learning?\n\n*Example: Advanced calculus and mathematical analysis*",
        intent="add_subject_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=[
            "Advanced calculus and analysis",
            "Basic programming concepts",
            "Quantum mechanics fundamentals",
            "Skip description"
        ]
    )

async def handle_subject_description_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle subject description input"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    description = message.strip() if message.lower() != "skip description" else ""
    update_conversation_state(user_id, ConversationStep.ADD_SUBJECT_DIFFICULTY, {**data, "description": description})
    
    return ChatResponse(
        response=f"✅ Description saved!\n\n**Step 3 of 7: Difficulty Level**\n\nHow would you rate the difficulty of **{data['name']}**?\n\nPlease choose one:",
        intent="add_subject_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "beginner", "label": "🟢 Beginner", "icon": "circle", "message": "beginner", "color": "bg-green-600 hover:bg-green-700 text-white"},
            {"id": "intermediate", "label": "🟡 Intermediate", "icon": "circle", "message": "intermediate", "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
            {"id": "advanced", "label": "🔴 Advanced", "icon": "circle", "message": "advanced", "color": "bg-red-600 hover:bg-red-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
        ],
        suggestions=["beginner", "intermediate", "advanced"]
    )

async def handle_subject_difficulty_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle difficulty selection"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    difficulty = message.lower().strip()
    if difficulty not in ["beginner", "intermediate", "advanced"]:
        return ChatResponse(
            response="⚠️ Please choose a valid difficulty level:",
            intent="add_subject_flow",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "beginner", "label": "🟢 Beginner", "icon": "circle", "message": "beginner", "color": "bg-green-600 hover:bg-green-700 text-white"},
                {"id": "intermediate", "label": "🟡 Intermediate", "icon": "circle", "message": "intermediate", "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
                {"id": "advanced", "label": "🔴 Advanced", "icon": "circle", "message": "advanced", "color": "bg-red-600 hover:bg-red-700 text-white"}
            ],
            suggestions=["beginner", "intermediate", "advanced"]
        )
    
    update_conversation_state(user_id, ConversationStep.ADD_SUBJECT_CATEGORY, {**data, "difficulty": difficulty})
    
    return ChatResponse(
        response=f"✅ Difficulty: **{difficulty.title()}**\n\n**Step 4 of 7: Category**\n\nWhat category does **{data['name']}** belong to?\n\n*Examples: Science, Mathematics, Technology, Language, Arts*",
        intent="add_subject_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "science", "label": "🧪 Science", "icon": "flask", "message": "Science", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
            {"id": "math", "label": "🔢 Mathematics", "icon": "calculator", "message": "Mathematics", "color": "bg-purple-600 hover:bg-purple-700 text-white"},
            {"id": "tech", "label": "💻 Technology", "icon": "laptop", "message": "Technology", "color": "bg-indigo-600 hover:bg-indigo-700 text-white"},
            {"id": "general", "label": "📚 General", "icon": "book", "message": "General", "color": "bg-gray-600 hover:bg-gray-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=["Science", "Mathematics", "Technology", "Language", "Arts"]
    )

async def handle_subject_category_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle category input"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    category = message.strip() or "General"
    update_conversation_state(user_id, ConversationStep.ADD_SUBJECT_HOURS, {**data, "category": category})
    
    return ChatResponse(
        response=f"✅ Category: **{category}**\n\n**Step 5 of 7: Estimated Hours**\n\nHow many hours do you estimate you'll need to complete **{data['name']}**?\n\n*Please enter a number (e.g., 20, 50, 100)*",
        intent="add_subject_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "10", "label": "10 hours", "icon": "clock", "message": "10", "color": "bg-green-600 hover:bg-green-700 text-white"},
            {"id": "20", "label": "20 hours", "icon": "clock", "message": "20", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
            {"id": "50", "label": "50 hours", "icon": "clock", "message": "50", "color": "bg-purple-600 hover:bg-purple-700 text-white"},
            {"id": "100", "label": "100 hours", "icon": "clock", "message": "100", "color": "bg-orange-600 hover:bg-orange-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=["10", "20", "50", "100"]
    )

async def handle_subject_hours_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle estimated hours input"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    try:
        hours = int(message.strip())
        if hours < 1 or hours > 1000:
            raise ValueError("Hours must be between 1 and 1000")
    except (ValueError, TypeError):
        return ChatResponse(
            response="⚠️ Please enter a valid number of hours (between 1 and 1000):",
            intent="add_subject_flow",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "10", "label": "10 hours", "icon": "clock", "message": "10", "color": "bg-green-600 hover:bg-green-700 text-white"},
                {"id": "20", "label": "20 hours", "icon": "clock", "message": "20", "color": "bg-blue-600 hover:bg-blue-700 text-white"}
            ],
            suggestions=["10", "20", "50"]
        )
    
    update_conversation_state(user_id, ConversationStep.ADD_SUBJECT_PRIORITY, {**data, "estimatedHours": hours})
    
    return ChatResponse(
        response=f"✅ Estimated hours: **{hours}**\n\n**Step 6 of 7: Priority Level**\n\nWhat's the priority level for **{data['name']}**?",
        intent="add_subject_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "high", "label": "🔴 High Priority", "icon": "alert-circle", "message": "high", "color": "bg-red-600 hover:bg-red-700 text-white"},
            {"id": "medium", "label": "🟡 Medium Priority", "icon": "circle", "message": "medium", "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
            {"id": "low", "label": "🟢 Low Priority", "icon": "circle", "message": "low", "color": "bg-green-600 hover:bg-green-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
        ],
        suggestions=["high", "medium", "low"]
    )

async def handle_subject_priority_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle priority selection"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    priority = message.lower().strip()
    if priority not in ["low", "medium", "high"]:
        return ChatResponse(
            response="⚠️ Please choose a valid priority level:",
            intent="add_subject_flow",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "high", "label": "🔴 High Priority", "icon": "alert-circle", "message": "high", "color": "bg-red-600 hover:bg-red-700 text-white"},
                {"id": "medium", "label": "🟡 Medium Priority", "icon": "circle", "message": "medium", "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
                {"id": "low", "label": "🟢 Low Priority", "icon": "circle", "message": "low", "color": "bg-green-600 hover:bg-green-700 text-white"}
            ],
            suggestions=["high", "medium", "low"]
        )
    
    update_conversation_state(user_id, ConversationStep.ADD_SUBJECT_DEADLINE, {**data, "priority": priority})
    
    return ChatResponse(
        response=f"✅ Priority: **{priority.title()}**\n\n**Step 7 of 8: Deadline (Optional)**\n\nDoes **{data['name']}** have a deadline? Enter a date (YYYY-MM-DD) or type 'none' if no deadline.\n\n*Deadlines help the AI prioritize urgent subjects in your schedule.*\n\n*Examples: 2024-03-15 or none*",
        intent="add_subject_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "none", "label": "📅 No Deadline", "icon": "calendar", "message": "none", "color": "bg-gray-600 hover:bg-gray-700 text-white"},
            {"id": "week", "label": "📅 Next Week", "icon": "calendar", "message": (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'), "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
            {"id": "month", "label": "📅 Next Month", "icon": "calendar", "message": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'), "color": "bg-blue-600 hover:bg-blue-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=[
            "none",
            (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),
            (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        ]
    )

async def handle_subject_tags_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle tags input"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    tags = []
    if message.lower().strip() != "skip":
        tags = [tag.strip() for tag in message.split(",") if tag.strip()]
    
    final_data = {**data, "tags": tags}
    update_conversation_state(user_id, ConversationStep.ADD_SUBJECT_CONFIRM, final_data)
    
    # Format subject summary
    tags_text = ", ".join(tags) if tags else "None"
    
    return ChatResponse(
        response=f"📋 **Subject Summary - Please Confirm:**\n\n"
                f"**Name:** {final_data['name']}\n"
                f"**Description:** {final_data.get('description', 'None')}\n"
                f"**Difficulty:** {final_data['difficulty'].title()}\n"
                f"**Category:** {final_data['category']}\n"
                f"**Estimated Hours:** {final_data['estimatedHours']}\n"
                f"**Priority:** {final_data['priority'].title()}\n"
                f"**Tags:** {tags_text}\n\n"
                f"Is this correct? I'll create the subject if you confirm!",
        intent="add_subject_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "confirm", "label": "✅ Yes, Create Subject", "icon": "check", "message": "yes", "color": "bg-green-600 hover:bg-green-700 text-white"},
            {"id": "edit", "label": "✏️ No, Start Over", "icon": "edit", "message": "restart", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=["yes", "restart", "main menu"]
    )

async def handle_subject_confirm_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle subject creation confirmation"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    response_text = message.lower().strip()
    
    if response_text in ["restart", "start over", "no"]:
        return await start_add_subject_flow(user_id, user_data)
    
    if response_text in ["yes", "confirm", "create", "save"]:
        # Create the subject using enhanced prioritization API
        try:
            subject_data = {
                "name": data['name'],
                "description": data.get('description', ''),
                "difficulty": data['difficulty'],  # Keep as string for backend validation
                "priority": data['priority'],      # Keep as string for backend validation
                "category": data['category'],
                "estimatedHours": data['estimatedHours'],  # Correct field name
                "deadline": data.get('deadline'),  # Include deadline
                "tags": data.get('tags', [])
            }
            
            # Use enhanced prioritization API - works for both demo and real users
            result = await backend_client.post(
                f"/subjects",  # Backend client already includes /api prefix
                data=subject_data,
                headers={"Authorization": f"Bearer {user_data.get('token', '')}"}
            )
            
            clear_conversation_state(user_id)
            
            # Get deadline display text
            deadline_text = "No deadline"
            if data.get('deadline'):
                try:
                    deadline_date = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
                    deadline_text = deadline_date.strftime('%B %d, %Y')
                except:
                    deadline_text = "Invalid deadline"
            
            return ChatResponse(
                response=f"🎉 **Subject Created with AI Prioritization!**\n\n**{data['name']}** has been added to your profile with enhanced scheduling features!\n\n📊 **Prioritization Details:**\n• **Difficulty:** {data['difficulty'].title()}\n• **Priority:** {data['priority'].title()}\n• **Deadline:** {deadline_text}\n• **AI Scheduling:** Enabled\n\nWhat would you like to do next?",
                intent="subject_created_enhanced",
                confidence=1.0,
                entities={},
                actions=[{"type": "subject_created", "subject_id": result.get('subject', {}).get('_id')}],
                conversation_id=f"success_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                quick_actions=[
                    {"id": "add-another", "label": "➕ Add Another Subject", "icon": "plus", "message": "add another subject", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                    {"id": "create-schedule", "label": "📅 Create AI Schedule", "icon": "calendar", "message": "create prioritized schedule", "color": "bg-green-600 hover:bg-green-700 text-white"},
                    {"id": "get-recommendation", "label": "🎯 Get Study Recommendation", "icon": "target", "message": "what should I study next", "color": "bg-purple-600 hover:bg-purple-700 text-white"},
                    {"id": "main-menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
                ],
                suggestions=[
                    "Add another subject",
                    "Create prioritized schedule", 
                    "What should I study next?",
                    "Main menu"
                ]
            )
            
        except Exception as e:
            logger.error(f"Error creating subject: {e}")
            return ChatResponse(
                response=f"❌ **Error Creating Subject**\n\nThere was an error creating your subject: {str(e)}\n\nWould you like to try again?",
                intent="subject_error",
                confidence=1.0,
                entities={},
                actions=[],
                conversation_id=f"error_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                quick_actions=[
                    {"id": "retry", "label": "🔄 Try Again", "icon": "refresh", "message": "yes", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                    {"id": "main-menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
                ],
                suggestions=["Try again", "Main menu"]
            )
    
    # Invalid response
    return ChatResponse(
        response="⚠️ Please respond with 'yes' to create the subject, 'restart' to start over, or 'cancel' for main menu:",
        intent="add_subject_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "confirm", "label": "✅ Yes, Create Subject", "icon": "check", "message": "yes", "color": "bg-green-600 hover:bg-green-700 text-white"},
            {"id": "edit", "label": "✏️ No, Start Over", "icon": "edit", "message": "restart", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=["yes", "restart", "main menu"]
    )

async def handle_create_schedule_intent(entities, user_data, conversation_id, confidence):
    """Handle schedule creation requests"""
    subjects = entities.get('subjects', [])
    timeframe = entities.get('timeframe', 'this week')
    
    if not subjects:
        return ChatResponse(
            response="I'd be happy to help you create a schedule! Which subjects would you like to include?",
            intent='create_schedule',
            confidence=confidence,
            entities=entities,
            actions=[{'type': 'request_subjects'}],
            conversation_id=conversation_id,
            quick_actions=[
                {"id": "show-subjects", "label": "My Subjects", "icon": "list", "message": "Show me my available subjects", "color": "bg-blue-500"},
                {"id": "add-subject", "label": "Add Subject", "icon": "plus", "message": "Add a new subject first", "color": "bg-green-500"}
            ],
            suggestions=[
                "Show me my available subjects",
                "Create schedule for math and physics",
                "Add a new subject called chemistry"
            ]
        )
    
    # Get user's existing subjects from backend
    try:
        user_subjects = await backend_client.get_user_subjects(user_data['user_id'])
        subject_names = [s['name'].lower() for s in user_subjects]
        
        # Validate subjects
        valid_subjects = [s for s in subjects if s.lower() in subject_names]
        invalid_subjects = [s for s in subjects if s.lower() not in subject_names]
        
        if invalid_subjects:
            return ChatResponse(
                response=f"I found these subjects: {', '.join(valid_subjects)}. However, I couldn't find: {', '.join(invalid_subjects)}. Would you like to add them first or create a schedule with the existing subjects?",
                intent='create_schedule',
                confidence=confidence,
                entities=entities,
                actions=[{'type': 'confirm_subjects', 'valid_subjects': valid_subjects, 'invalid_subjects': invalid_subjects}],
                conversation_id=conversation_id,
                quick_actions=[
                    {"id": "add-subjects", "label": f"Add {', '.join(invalid_subjects)}", "icon": "plus", "message": f"Add new subjects: {', '.join(invalid_subjects)}", "color": "bg-green-500"},
                    {"id": "continue-existing", "label": "Use Existing", "icon": "check", "message": f"Create schedule with {', '.join(valid_subjects)}", "color": "bg-blue-500"}
                ],
                suggestions=[
                    f"Add new subjects: {', '.join(invalid_subjects)}",
                    f"Create schedule with {', '.join(valid_subjects)} only",
                    "Show me all my subjects"
                ]
            )
        
        return ChatResponse(
            response=f"Great! I'll create a schedule for {', '.join(valid_subjects)} for {timeframe}. Let me generate an optimal schedule for you.",
            intent='create_schedule',
            confidence=confidence,
            entities=entities,
            actions=[{'type': 'create_schedule', 'subjects': valid_subjects, 'timeframe': timeframe}],
            conversation_id=conversation_id,
            quick_actions=[
                {"id": "view-created", "label": "View Schedule", "icon": "eye", "message": "Show me the created schedule", "color": "bg-green-500"},
                {"id": "modify-schedule", "label": "Modify", "icon": "edit", "message": "I want to modify this schedule", "color": "bg-blue-500"}
            ],
            suggestions=[
                "Show me the created schedule",
                "Modify the schedule timing",
                "Create another schedule"
            ]
        )
        
    except Exception as e:
        logger.error(f"Error fetching user subjects: {e}")
        return ChatResponse(
            response="I'm having trouble accessing your subjects. Please try again in a moment.",
            intent='create_schedule',
            confidence=confidence,
            entities=entities,
            actions=[],
            conversation_id=conversation_id,
            quick_actions=[
                {"id": "retry", "label": "Try Again", "icon": "refresh", "message": "Create a new study schedule", "color": "bg-blue-500"},
                {"id": "view-schedule", "label": "View Schedule", "icon": "eye", "message": "Show my current schedule", "color": "bg-green-500"}
            ],
            suggestions=[
                "Try creating schedule again",
                "Show my current schedule",
                "What subjects do I have?"
            ]
        )

async def handle_modify_schedule_intent(entities, user_data, conversation_id, confidence):
    """Handle schedule modification requests"""
    return ChatResponse(
        response="I can help you modify your schedule. What changes would you like to make?",
        intent='modify_schedule',
        confidence=confidence,
        entities=entities,
        actions=[{'type': 'request_modification_details'}],
        conversation_id=conversation_id,
        quick_actions=[
            {"id": "reschedule-today", "label": "Reschedule Today", "icon": "calendar", "message": "Reschedule today's sessions", "color": "bg-blue-500"},
            {"id": "cancel-session", "label": "Cancel Session", "icon": "x", "message": "Cancel a study session", "color": "bg-red-500"},
            {"id": "change-time", "label": "Change Time", "icon": "clock", "message": "Change session timing", "color": "bg-purple-500"}
        ],
        suggestions=[
            "Reschedule today's math session",
            "Cancel tomorrow's physics study",
            "Change my study time to evening"
        ]
    )

async def handle_progress_request(user_data, conversation_id):
    """Handle user progress analytics requests with comprehensive insights"""
    try:
        # Get analytics data from the backend
        analytics_data = await backend_client.get_analytics(user_data['user_id'], user_data.get('token', ''))
        
        # Check user's preference for daily/weekly view (could be passed as parameter or stored)
        # For now, we'll provide both views or make it smart based on the data
        
        if not analytics_data:
            return ChatResponse(
                response="📊 **Your Study Progress Dashboard**\n\n"
                       "🚀 **Getting Started!**\n"
                       "I notice you haven't started tracking your study sessions yet. Here's how to begin:\n\n"
                       "• Add your first subject\n"
                       "• Create a study schedule\n"
                       "• Complete some study sessions\n\n"
                       "Once you have some data, I'll provide detailed analytics about:\n"
                       "📈 Study time trends\n"
                       "🎯 Completion rates\n"
                       "🧠 Focus scores\n"
                       "⚡ Progress velocity\n\n"
                       "Ready to get started?",
                intent='view_progress',
                confidence=1.0,
                entities={},
                actions=[],
                conversation_id=conversation_id,
                quick_actions=[
                    {"id": "add-subject", "label": "📝 Add Subject", "icon": "plus", "message": "add subject", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                    {"id": "create-schedule", "label": "📅 Create Schedule", "icon": "calendar", "message": "create schedule", "color": "bg-green-600 hover:bg-green-700 text-white"},
                    {"id": "daily-view", "label": "📅 Daily View", "icon": "calendar", "message": "show my daily progress", "color": "bg-orange-600 hover:bg-orange-700 text-white"},
                    {"id": "main-menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
                ],
                suggestions=["Add my first subject", "Create study schedule", "Show daily progress", "Main menu"]
            )
        
        # Extract key metrics from analytics
        weekly_stats = analytics_data.get('weeklyStats', {})
        subject_progress = analytics_data.get('subjectProgress', {})
        
        total_study_time = weekly_stats.get('totalStudyTime', 0)
        total_sessions = weekly_stats.get('totalSessions', 0)
        completion_rate = weekly_stats.get('completionRate', 0)
        average_focus = weekly_stats.get('averageFocus', 0)
        daily_study_time = weekly_stats.get('dailyStudyTime', [0, 0, 0, 0, 0, 0, 0])
        
        # Calculate daily analytics
        today_index = (datetime.now().weekday()) % 7  # Monday = 0
        todays_study_time = daily_study_time[today_index] if len(daily_study_time) > today_index else 0
        daily_goal = 120  # 2 hours in minutes
        
        # Convert minutes to hours for display
        study_hours = total_study_time / 60 if total_study_time > 0 else 0
        todays_hours = todays_study_time / 60 if todays_study_time > 0 else 0
        
        # Calculate daily average
        daily_average = study_hours / 7 if study_hours > 0 else 0
        
        # Build comprehensive progress report with both daily and weekly insights
        response_text = "📊 **Your Study Progress Dashboard**\n\n"
        
        # Today's Snapshot
        response_text += "📅 **Today's Snapshot:**\n"
        response_text += f"⏰ **Study Time Today:** {todays_hours:.1f} hours\n"
        response_text += f"🎯 **Daily Goal Progress:** {min(100, (todays_study_time / daily_goal) * 100):.0f}%\n"
        time_remaining = max(0, daily_goal - todays_study_time)
        response_text += f"⏳ **Time to Goal:** {time_remaining // 60}h {time_remaining % 60}m remaining\n\n"
        
        # Weekly Overview
        response_text += "📈 **This Week's Performance:**\n"
        response_text += f"⏱️ **Total Study Time:** {study_hours:.1f} hours ({daily_average:.1f}h/day)\n"
        response_text += f"📚 **Sessions:** {total_sessions} completed\n"
        response_text += f"🎯 **Completion Rate:** {completion_rate:.0f}%\n"
        response_text += f"🧠 **Focus Score:** {average_focus:.1f}/10\n\n"
        
        # Subject progress overview
        if subject_progress.get('total', 0) > 0:
            response_text += "📚 **Subject Progress:**\n"
            response_text += f"✅ **Completed:** {subject_progress.get('completed', 0)} subjects\n"
            response_text += f"🔄 **In Progress:** {subject_progress.get('inProgress', 0)} subjects\n"
            response_text += f"📝 **Not Started:** {subject_progress.get('notStarted', 0)} subjects\n\n"
            
            # Show top performing subjects
            subject_details = subject_progress.get('details', [])
            if subject_details:
                top_subjects = sorted(subject_details, key=lambda x: x.get('progress', 0), reverse=True)[:3]
                response_text += "🏆 **Top Performing Subjects:**\n"
                for subject in top_subjects:
                    progress = subject.get('progress', 0)
                    name = subject.get('name', 'Unknown')
                    response_text += f"• {name}: {progress}% complete\n"
                response_text += "\n"
        
        # Performance insights and recommendations
        response_text += "💡 **Insights & Recommendations:**\n"
        
        # Daily-specific insights
        if todays_study_time > 0:
            response_text += f"🌟 You've studied {todays_hours:.1f} hours today - great progress!\n"
        else:
            response_text += "📚 Ready to start your first study session today?\n"
        
        # Weekly patterns
        if completion_rate >= 80:
            response_text += "🎉 Excellent consistency! You're crushing your study goals.\n"
        elif completion_rate >= 60:
            response_text += "👍 Good progress! Try to maintain this momentum.\n"
        elif completion_rate > 0:
            response_text += "💪 Keep building your study habits - every session counts!\n"
        
        if average_focus >= 8:
            response_text += "🧠 Outstanding focus levels! Your deep work is paying off.\n"
        elif average_focus >= 6:
            response_text += "🎯 Solid focus during sessions. Consider minimizing distractions.\n"
        elif average_focus > 0:
            response_text += "📱 Try reducing distractions to improve focus scores.\n"
        
        # Add motivational closing
        if total_sessions > 0:
            response_text += f"\n🚀 **Keep it up!** You've built momentum with {total_sessions} sessions this week!"
        
        return ChatResponse(
            response=response_text,
            intent='view_progress',
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=conversation_id,
            quick_actions=[
                {"id": "daily-focus", "label": "� Daily Focus", "icon": "calendar", "message": "show today's progress only", "color": "bg-orange-600 hover:bg-orange-700 text-white"},
                {"id": "weekly-trends", "label": "📊 Weekly Trends", "icon": "trending-up", "message": "show weekly analytics", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                {"id": "set-goals", "label": "🎯 Set Goals", "icon": "target", "message": "help me set study goals", "color": "bg-purple-600 hover:bg-purple-700 text-white"},
                {"id": "study-recommendations", "label": "💡 Get Recommendations", "icon": "lightbulb", "message": "what should I study", "color": "bg-green-600 hover:bg-green-700 text-white"},
                {"id": "main-menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
            ],
            suggestions=[
                "Show today's progress only",
                "Show weekly analytics", 
                "What should I study next?",
                "Set study goals",
                "Main menu"
            ]
        )
        
    except Exception as e:
        logger.error(f"Error handling progress request: {e}")
        return ChatResponse(
            response="❌ **Oops!** I encountered an issue while fetching your progress data.\n\n"
                   "This might be because:\n"
                   "• The analytics service is temporarily unavailable\n"
                   "• There's a connection issue\n\n"
                   "Please try again in a moment, or check the main dashboard for your progress statistics.",
            intent='error',
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=conversation_id,
            quick_actions=[
                {"id": "retry-progress", "label": "🔄 Try Again", "icon": "refresh", "message": "Show my study progress", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                {"id": "main-menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
            ],
            suggestions=["Try again", "Main menu"]
        )

async def handle_get_schedule_intent(entities, user_data, conversation_id, confidence):
    """Handle schedule retrieval requests"""
    try:
        # Get user's current schedules
        schedules = await backend_client.get_user_schedules(user_data['user_id'], user_data.get('token', ''))
        
        if not schedules:
            return ChatResponse(
                response="You don't have any schedules yet. Would you like me to create one for you?",
                intent='get_schedule',
                confidence=confidence,
                entities=entities,
                actions=[{'type': 'offer_create_schedule'}],
                conversation_id=conversation_id,
                quick_actions=[
                    {"id": "create-first", "label": "Create Schedule", "icon": "plus", "message": "Create my first study schedule", "color": "bg-green-500"},
                    {"id": "add-subjects", "label": "Add Subjects", "icon": "book", "message": "Add subjects first", "color": "bg-blue-500"}
                ],
                suggestions=[
                    "Create my first study schedule",
                    "Add subjects to my profile",
                    "How do I create a schedule?"
                ]
            )
        
        # Filter for active schedules only
        active_schedules = [s for s in schedules if s.get('status') == 'active']
        
        if not active_schedules:
            total_schedules = len(schedules)
            return ChatResponse(
                response=f"You have {total_schedules} schedule(s) but none are currently active. Would you like to see all schedules or create a new one?",
                intent='get_schedule',
                confidence=confidence,
                entities=entities,
                conversation_id=conversation_id,
                quick_actions=[
                    {"id": "view-all", "label": "View All Schedules", "icon": "eye", "message": "Go to schedule page to view all schedules", "color": "bg-blue-500"},
                    {"id": "create-new", "label": "Create New", "icon": "plus", "message": "Create a new study schedule", "color": "bg-green-500"}
                ],
                suggestions=[
                    "Go to schedule page to view all schedules", 
                    "Create a new active schedule"
                ]
            )
        
        if len(active_schedules) == 1:
            # Single active schedule - show details and sessions
            schedule = active_schedules[0]
            schedule_id = schedule.get('_id')
            
            # Get sessions for this schedule
            sessions = await backend_client.get_schedule_sessions(schedule_id, user_data.get('token', ''))
            
            # Filter for active/pending sessions
            active_sessions = [s for s in sessions if s.get('status') in ['scheduled', 'in_progress']]
            completed_sessions = [s for s in sessions if s.get('status') == 'completed']
            
            response_text = f"📅 **{schedule['name']}**\n\n"
            response_text += f"📊 **Progress:** {len(completed_sessions)}/{len(sessions)} sessions completed\n\n"
            
            if active_sessions:
                response_text += f"🎯 **Active Sessions ({len(active_sessions)}):**\n"
                for i, session in enumerate(active_sessions[:3], 1):  # Show max 3 sessions
                    subject = session.get('subjectName', 'Unknown Subject')
                    start_time = session.get('startTime', '')
                    status = session.get('status', 'scheduled').title()
                    response_text += f"{i}. {subject} - {status}\n"
                
                if len(active_sessions) > 3:
                    response_text += f"   ... and {len(active_sessions) - 3} more sessions\n"
            else:
                response_text += "✅ All sessions completed for this schedule!\n"
            
            response_text += f"\n💡 To view all schedules, visit the Schedule page."
            
            return ChatResponse(
                response=response_text,
                intent='get_schedule',
                confidence=confidence,
                entities=entities,
                actions=[{'type': 'show_schedule_sessions', 'schedule': schedule, 'sessions': active_sessions}],
                conversation_id=conversation_id,
                quick_actions=[
                    {"id": "view-all-schedules", "label": "All Schedules", "icon": "calendar", "message": "Go to schedule page", "color": "bg-blue-500"},
                    {"id": "start-session", "label": "Start Session", "icon": "play", "message": "Start a study session", "color": "bg-green-500"}
                ],
                suggestions=[
                    "Go to schedule page",
                    "Start next study session",
                    "Update session status"
                ]
            )
        
        else:
            # Multiple active schedules - show list for selection
            response_text = f"You have {len(active_schedules)} active schedules:\n\n"
            
            schedule_options = []
            for i, schedule in enumerate(active_schedules, 1):
                schedule_name = schedule.get('name', f'Schedule {i}')
                created_date = schedule.get('createdAt', '')
                response_text += f"{i}. **{schedule_name}**"
                if created_date:
                    try:
                        date_obj = datetime.fromisoformat(created_date.replace('Z', '+00:00'))
                        response_text += f" (Created: {date_obj.strftime('%b %d, %Y')})"
                    except:
                        pass
                response_text += "\n"
                
                # Add quick action for each schedule
                schedule_options.append({
                    "id": f"select-schedule-{schedule.get('_id')}", 
                    "label": f"{schedule_name[:15]}...", 
                    "icon": "calendar", 
                    "message": f"Show sessions for {schedule_name}", 
                    "color": "bg-purple-500"
                })
            
            response_text += f"\n💡 Select a schedule to view its active sessions.\n"
            response_text += f"📋 To manage all schedules, visit the Schedule page."
            
            return ChatResponse(
                response=response_text,
                intent='get_schedule',
                confidence=confidence,
                entities=entities,
                actions=[{'type': 'select_schedule', 'schedules': active_schedules}],
                conversation_id=conversation_id,
                quick_actions=schedule_options[:4] + [  # Limit to 4 schedule options plus navigation
                    {"id": "goto-schedule-page", "label": "Schedule Page", "icon": "external-link", "message": "Go to schedule page", "color": "bg-blue-600"}
                ],
                suggestions=[
                    "Go to schedule page",
                    "Show me the most recent schedule",
                    "Which schedule should I work on today?"
                ]
            )
        
    except Exception as e:
        logger.error(f"Error fetching schedules: {e}")
        return ChatResponse(
            response="I'm having trouble accessing your schedules right now. Please try again or visit the Schedule page directly.",
            intent='get_schedule',
            confidence=confidence,
            entities=entities,
            actions=[{'type': 'error_fetching_schedules'}],
            conversation_id=conversation_id,
            quick_actions=[
                {"id": "retry-schedules", "label": "Try Again", "icon": "refresh", "message": "view my schedule", "color": "bg-orange-500"},
                {"id": "goto-schedule-page", "label": "Schedule Page", "icon": "external-link", "message": "Go to schedule page", "color": "bg-blue-600"}
            ],
            suggestions=[
                "Try again",
                "Go to schedule page"
            ]
        )

async def handle_schedule_selection(schedule_name, user_data, conversation_id):
    """Handle when user selects a specific schedule to view sessions"""
    try:
        # Get user's schedules to find the selected one
        schedules = await backend_client.get_user_schedules(user_data['user_id'], user_data.get('token', ''))
        
        # Find the selected schedule
        selected_schedule = None
        for schedule in schedules:
            if schedule.get('name') == schedule_name or schedule_name in schedule.get('name', ''):
                selected_schedule = schedule
                break
        
        if not selected_schedule:
            return ChatResponse(
                response=f"I couldn't find the schedule '{schedule_name}'. Would you like to see all your schedules?",
                intent='schedule_selection',
                confidence=0.9,
                entities={'schedule_name': schedule_name},
                conversation_id=conversation_id,
                quick_actions=[
                    {"id": "view-schedules", "label": "View Schedules", "icon": "calendar", "message": "view my schedules", "color": "bg-blue-500"},
                    {"id": "goto-schedule-page", "label": "Schedule Page", "icon": "external-link", "message": "Go to schedule page", "color": "bg-blue-600"}
                ]
            )
        
        # Get sessions for the selected schedule
        schedule_id = selected_schedule.get('_id')
        sessions = await backend_client.get_schedule_sessions(schedule_id, user_data.get('token', ''))
        
        # Filter sessions by status
        active_sessions = [s for s in sessions if s.get('status') in ['scheduled', 'in_progress']]
        completed_sessions = [s for s in sessions if s.get('status') == 'completed']
        
        # Build response
        response_text = f"📅 **{selected_schedule['name']}**\n\n"
        response_text += f"📊 **Progress:** {len(completed_sessions)}/{len(sessions)} sessions completed\n\n"
        
        if active_sessions:
            response_text += f"🎯 **Active Sessions ({len(active_sessions)}):**\n"
            for i, session in enumerate(active_sessions, 1):
                subject = session.get('subjectName', 'Unknown Subject')
                start_time = session.get('startTime', '')
                status = session.get('status', 'scheduled').title()
                
                # Format time if available
                time_str = ""
                if start_time:
                    try:
                        time_obj = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                        time_str = f" at {time_obj.strftime('%I:%M %p')}"
                    except:
                        pass
                
                response_text += f"{i}. **{subject}** - {status}{time_str}\n"
        else:
            response_text += "✅ **All sessions completed!** Great job!\n"
        
        response_text += f"\n💡 **Want to see all schedules?** Visit the Schedule page for complete schedule management."
        
        return ChatResponse(
            response=response_text,
            intent='schedule_selection',
            confidence=0.95,
            entities={'schedule_name': schedule_name, 'schedule_id': schedule_id},
            actions=[{'type': 'show_schedule_sessions', 'schedule': selected_schedule, 'sessions': active_sessions}],
            conversation_id=conversation_id,
            quick_actions=[
                {"id": "start-session", "label": "Start Session", "icon": "play", "message": "Start next study session", "color": "bg-green-500"},
                {"id": "view-all-schedules", "label": "All Schedules", "icon": "calendar", "message": "view my schedules", "color": "bg-blue-500"},
                {"id": "goto-schedule-page", "label": "Schedule Page", "icon": "external-link", "message": "Go to schedule page", "color": "bg-blue-600"}
            ],
            suggestions=[
                "Start next study session",
                "View all my schedules", 
                "Go to schedule page",
                "Mark session as completed"
            ]
        )
        
    except Exception as e:
        logger.error(f"Error handling schedule selection: {e}")
        return ChatResponse(
            response="I'm having trouble loading the schedule details. Please try again or visit the Schedule page.",
            intent='schedule_selection',
            confidence=0.8,
            entities={'schedule_name': schedule_name},
            conversation_id=conversation_id,
            quick_actions=[
                {"id": "retry-selection", "label": "Try Again", "icon": "refresh", "message": f"Show sessions for {schedule_name}", "color": "bg-orange-500"},
                {"id": "goto-schedule-page", "label": "Schedule Page", "icon": "external-link", "message": "Go to schedule page", "color": "bg-blue-600"}
            ]
        )

async def handle_general_question_intent(message, user_data, conversation_id, confidence):
    """Handle general questions and greetings"""
    message_lower = message.lower()
    
    if any(greeting in message_lower for greeting in ['hello', 'hi', 'hey', 'good morning', 'good afternoon']):
        return ChatResponse(
            response=f"Hello! I'm your AI study scheduler assistant. I can help you create, modify, and manage your study schedules. What would you like to do today?",
            intent='greeting',
            confidence=confidence,
            entities={},
            actions=[{'type': 'show_help_options'}],
            conversation_id=conversation_id
        )
    
    if any(help_word in message_lower for help_word in ['help', 'what can you do', 'how to use']):
        return ChatResponse(
            response="I can help you with:\n• Creating personalized study schedules\n• Modifying existing schedules\n• Checking your current schedules\n• Adding new subjects\n• Tracking your study progress\n\nJust tell me what you'd like to do in natural language!",
            intent='help',
            confidence=confidence,
            entities={},
            actions=[{'type': 'show_capabilities'}],
            conversation_id=conversation_id
        )
    
    return ChatResponse(
        response="I'm here to help you manage your study schedules. You can ask me to create a new schedule, modify an existing one, or check your current schedules. What would you like to do?",
        intent='general_question',
        confidence=confidence,
        entities={},
        actions=[],
        conversation_id=conversation_id
    )

# ================== SCHEDULE CREATION FLOW ==================

async def start_create_schedule_flow(user_id: str, user_data: dict):
    """Start the schedule creation flow"""
    try:
        # First check if user has any subjects
        subjects_response = await backend_client.get(
            "/subjects",
            headers={"Authorization": f"Bearer {user_data.get('token', '')}"}
        )
        subjects = subjects_response.get('subjects', [])
        
        if not subjects:
            return ChatResponse(
                response="📚 **No Subjects Found!**\n\nYou need to add some subjects before creating a schedule. Would you like to add a subject first?",
                intent="no_subjects_error",
                confidence=1.0,
                entities={},
                actions=[],
                conversation_id=f"no_subjects_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                quick_actions=[
                    {"id": "add-subject", "label": "📝 Add Subject", "icon": "plus", "message": "add subject", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                    {"id": "main-menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
                ],
                suggestions=["Add a subject", "Main menu"]
            )
        
        update_conversation_state(user_id, ConversationStep.CREATE_SCHEDULE_NAME, {"available_subjects": subjects})
        return ChatResponse(
            response="📅 **Let's create your study schedule!**\n\n**Step 1 of 6: Schedule Name**\n\nWhat would you like to name this schedule?\n\n*Example: 'Weekly Study Plan', 'Exam Preparation', 'Final Review'*",
            intent="create_schedule_flow",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
            ],
            suggestions=[
                "Weekly Study Plan",
                "Exam Preparation", 
                "Final Review",
                "Monthly Schedule"
            ]
        )
    except Exception as e:
        logger.error(f"Error starting schedule flow: {e}")
        return ChatResponse(
            response="❌ There was an error accessing your subjects. Please try again later.",
            intent="schedule_error",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"error_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "main-menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
            ],
            suggestions=["Main menu"]
        )

async def handle_schedule_name_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle schedule name input"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    if len(message.strip()) < 2:
        return ChatResponse(
            response="⚠️ Schedule name should be at least 2 characters long. Please try again:",
            intent="create_schedule_flow",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[],
            suggestions=["Weekly Study Plan", "Exam Preparation"]
        )
    
    update_conversation_state(user_id, ConversationStep.CREATE_SCHEDULE_SUBJECTS, {**data, "name": message.strip()})
    
    # Format available subjects for selection
    subjects = data.get('available_subjects', [])
    subjects_text = "\n".join([f"• {subject['name']}" for subject in subjects])
    
    return ChatResponse(
        response=f"✅ Schedule name: **{message.strip()}**\n\n**Step 2 of 6: Select Subjects**\n\nWhich subjects would you like to include in this schedule?\n\n**Available subjects:**\n{subjects_text}\n\nPlease list the subjects you want to include, separated by commas:\n\n*Example: Mathematics, Physics, Chemistry*",
        intent="create_schedule_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "all", "label": "📚 All Subjects", "icon": "book", "message": "all subjects", "color": "bg-green-600 hover:bg-green-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=[
            "all subjects",
            ", ".join([s['name'] for s in subjects[:3]]),
            subjects[0]['name'] if subjects else "Mathematics"
        ]
    )

async def handle_schedule_subjects_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle subject selection"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    available_subjects = data.get('available_subjects', [])
    
    if message.lower().strip() == "all subjects":
        selected_subjects = available_subjects
    else:
        # Parse selected subject names
        selected_names = [name.strip() for name in message.split(',')]
        selected_subjects = []
        
        for name in selected_names:
            # Find matching subject (case insensitive)
            found = False
            for subject in available_subjects:
                if subject['name'].lower() == name.lower():
                    selected_subjects.append(subject)
                    found = True
                    break
            if not found:
                return ChatResponse(
                    response=f"⚠️ Subject '{name}' not found. Please select from available subjects:\n\n" + 
                            "\n".join([f"• {s['name']}" for s in available_subjects]),
                    intent="create_schedule_flow",
                    confidence=1.0,
                    entities={},
                    actions=[],
                    conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    quick_actions=[
                        {"id": "all", "label": "📚 All Subjects", "icon": "book", "message": "all subjects", "color": "bg-green-600 hover:bg-green-700 text-white"}
                    ],
                    suggestions=["all subjects"] + [s['name'] for s in available_subjects[:3]]
                )
    
    if not selected_subjects:
        return ChatResponse(
            response="⚠️ Please select at least one subject.",
            intent="create_schedule_flow",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[],
            suggestions=["all subjects"] + [s['name'] for s in available_subjects[:3]]
        )
    
    selected_names = [s['name'] for s in selected_subjects]
    update_conversation_state(user_id, ConversationStep.CREATE_SCHEDULE_DATES, {
        **data, 
        "selected_subjects": selected_subjects,
        "selected_subject_ids": [s['_id'] for s in selected_subjects]
    })
    
    # Get default dates (today to 2 weeks from now)
    from datetime import date, timedelta
    start_date = date.today()
    end_date = start_date + timedelta(days=14)
    
    return ChatResponse(
        response=f"✅ Selected subjects: **{', '.join(selected_names)}**\n\n**Step 3 of 6: Date Range**\n\nWhen should this schedule run?\n\nCurrent suggestion:\n• **Start:** {start_date.strftime('%Y-%m-%d')} (today)\n• **End:** {end_date.strftime('%Y-%m-%d')} (2 weeks)\n\nEnter dates as: YYYY-MM-DD, YYYY-MM-DD\n\n*Example: 2024-01-15, 2024-01-29*\n\nOr type 'default' to use the suggested dates.",
        intent="create_schedule_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "default", "label": "📅 Use Default (2 weeks)", "icon": "calendar", "message": "default", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=[
            "default",
            f"{start_date.strftime('%Y-%m-%d')}, {end_date.strftime('%Y-%m-%d')}",
            f"{start_date.strftime('%Y-%m-%d')}, {(start_date + timedelta(days=7)).strftime('%Y-%m-%d')}"
        ]
    )

async def handle_schedule_dates_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle date range input"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    from datetime import date, timedelta, datetime as dt
    
    if message.lower().strip() == "default":
        start_date = date.today()
        end_date = start_date + timedelta(days=14)
    else:
        try:
            # Parse date range
            dates = [d.strip() for d in message.split(',')]
            if len(dates) != 2:
                raise ValueError("Please provide both start and end dates")
            
            start_date = dt.strptime(dates[0], '%Y-%m-%d').date()
            end_date = dt.strptime(dates[1], '%Y-%m-%d').date()
            
            if start_date >= end_date:
                raise ValueError("End date must be after start date")
                
            if start_date < date.today():
                raise ValueError("Start date cannot be in the past")
                
        except ValueError as e:
            return ChatResponse(
                response=f"⚠️ Invalid date format. {str(e)}\n\nPlease use format: YYYY-MM-DD, YYYY-MM-DD\n\n*Example: 2024-01-15, 2024-01-29*",
                intent="create_schedule_flow",
                confidence=1.0,
                entities={},
                actions=[],
                conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                quick_actions=[
                    {"id": "default", "label": "📅 Use Default", "icon": "calendar", "message": "default", "color": "bg-blue-600 hover:bg-blue-700 text-white"}
                ],
                suggestions=["default"]
            )
    
    update_conversation_state(user_id, ConversationStep.CREATE_SCHEDULE_DAILY_HOURS, {
        **data, 
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat()
    })
    
    return ChatResponse(
        response=f"✅ Schedule dates: **{start_date} to {end_date}**\n\n**Step 4 of 6: Daily Study Hours**\n\nHow many hours per day would you like to study?\n\n*Recommended: 2-6 hours per day*",
        intent="create_schedule_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "2", "label": "2 hours", "icon": "clock", "message": "2", "color": "bg-green-600 hover:bg-green-700 text-white"},
            {"id": "4", "label": "4 hours", "icon": "clock", "message": "4", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
            {"id": "6", "label": "6 hours", "icon": "clock", "message": "6", "color": "bg-purple-600 hover:bg-purple-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=["2", "4", "6", "8"]
    )

async def handle_schedule_daily_hours_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle daily hours input"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    try:
        daily_hours = int(message.strip())
        if daily_hours < 1 or daily_hours > 12:
            raise ValueError("Hours must be between 1 and 12")
    except (ValueError, TypeError):
        return ChatResponse(
            response="⚠️ Please enter a valid number of hours (between 1 and 12):",
            intent="create_schedule_flow",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "4", "label": "4 hours", "icon": "clock", "message": "4", "color": "bg-blue-600 hover:bg-blue-700 text-white"}
            ],
            suggestions=["2", "4", "6"]
        )
    
    update_conversation_state(user_id, ConversationStep.CREATE_SCHEDULE_SESSION_DURATION, {**data, "daily_hours": daily_hours})
    
    return ChatResponse(
        response=f"✅ Daily study hours: **{daily_hours}**\n\n**Step 5 of 6: Session Duration**\n\nHow long should each study session be? (in minutes)\n\n*Recommended: 60-120 minutes with breaks*",
        intent="create_schedule_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "60", "label": "60 minutes", "icon": "clock", "message": "60", "color": "bg-green-600 hover:bg-green-700 text-white"},
            {"id": "90", "label": "90 minutes", "icon": "clock", "message": "90", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
            {"id": "120", "label": "120 minutes", "icon": "clock", "message": "120", "color": "bg-purple-600 hover:bg-purple-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=["60", "90", "120"]
    )

async def handle_schedule_session_duration_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle session duration input"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    try:
        session_duration = int(message.strip())
        if session_duration < 30 or session_duration > 240:
            raise ValueError("Session duration must be between 30 and 240 minutes")
    except (ValueError, TypeError):
        return ChatResponse(
            response="⚠️ Please enter a valid session duration (between 30 and 240 minutes):",
            intent="create_schedule_flow",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "90", "label": "90 minutes", "icon": "clock", "message": "90", "color": "bg-blue-600 hover:bg-blue-700 text-white"}
            ],
            suggestions=["60", "90", "120"]
        )
    
    update_conversation_state(user_id, ConversationStep.CREATE_SCHEDULE_PREFERRED_TIMES, {**data, "session_duration": session_duration})
    
    return ChatResponse(
        response=f"✅ Session duration: **{session_duration} minutes**\n\n**Step 6 of 6: Preferred Times**\n\nWhen do you prefer to study? Select one or more times:\n\n• **Morning** (6:00 AM - 12:00 PM)\n• **Afternoon** (12:00 PM - 6:00 PM)  \n• **Evening** (6:00 PM - 10:00 PM)\n\nType them separated by commas, or select from buttons below:",
        intent="create_schedule_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "morning", "label": "🌅 Morning", "icon": "sun", "message": "morning", "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
            {"id": "afternoon", "label": "☀️ Afternoon", "icon": "sun", "message": "afternoon", "color": "bg-orange-600 hover:bg-orange-700 text-white"},
            {"id": "evening", "label": "🌙 Evening", "icon": "moon", "message": "evening", "color": "bg-indigo-600 hover:bg-indigo-700 text-white"},
            {"id": "all-times", "label": "🕐 All Times", "icon": "clock", "message": "morning, afternoon, evening", "color": "bg-green-600 hover:bg-green-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=["morning", "afternoon", "evening", "morning, afternoon"]
    )

async def handle_schedule_preferred_times_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle preferred times input"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    # Parse preferred times
    valid_times = ["morning", "afternoon", "evening"]
    selected_times = []
    
    time_input = message.lower().strip().replace("and", ",")
    for time in time_input.split(","):
        time = time.strip()
        if time in valid_times and time not in selected_times:
            selected_times.append(time)
    
    if not selected_times:
        return ChatResponse(
            response="⚠️ Please select at least one valid time period (morning, afternoon, or evening):",
            intent="create_schedule_flow",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "morning", "label": "🌅 Morning", "icon": "sun", "message": "morning", "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
                {"id": "afternoon", "label": "☀️ Afternoon", "icon": "sun", "message": "afternoon", "color": "bg-orange-600 hover:bg-orange-700 text-white"}
            ],
            suggestions=["morning", "afternoon", "evening"]
        )
    
    final_data = {**data, "preferred_times": selected_times}
    update_conversation_state(user_id, ConversationStep.CREATE_SCHEDULE_CONFIRM, final_data)
    
    # Create schedule summary
    selected_subjects = final_data.get('selected_subjects', [])
    subject_names = ', '.join([s['name'] for s in selected_subjects])
    
    return ChatResponse(
        response=f"📋 **Schedule Summary - Please Confirm:**\n\n"
                f"**Name:** {final_data['name']}\n"
                f"**Subjects:** {subject_names}\n"
                f"**Duration:** {final_data['start_date']} to {final_data['end_date']}\n"
                f"**Daily Hours:** {final_data['daily_hours']} hours\n"
                f"**Session Length:** {final_data['session_duration']} minutes\n"
                f"**Preferred Times:** {', '.join(selected_times).title()}\n\n"
                f"Ready to generate your personalized study schedule?",
        intent="create_schedule_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "confirm", "label": "✅ Generate Schedule", "icon": "check", "message": "yes", "color": "bg-green-600 hover:bg-green-700 text-white"},
            {"id": "edit", "label": "✏️ Start Over", "icon": "edit", "message": "restart", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=["yes", "restart", "main menu"]
    )

async def handle_schedule_confirm_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle schedule creation confirmation"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    response_text = message.lower().strip()
    
    if response_text in ["restart", "start over", "no"]:
        return await start_create_schedule_flow(user_id, user_data)
    
    if response_text in ["yes", "confirm", "generate", "create"]:
        try:
            # Prepare schedule data for API
            schedule_data = {
                "name": data['name'],
                "startDate": data['start_date'],
                "endDate": data['end_date'],
                "subjectIds": data['selected_subject_ids'],
                "preferences": {
                    "dailyStudyHours": data['daily_hours'],
                    "preferredTimeSlots": data['preferred_times'],
                    "sessionDuration": data['session_duration'],
                    "breakDuration": 15  # Default break duration
                }
            }
            
            # Call the schedule generation API
            result = await backend_client.post(
                "/schedules/generate",
                data=schedule_data,
                headers={"Authorization": f"Bearer {user_data.get('token', '')}"}
            )
            
            clear_conversation_state(user_id)
            
            return ChatResponse(
                response=f"🎉 **Schedule Generated Successfully!**\n\n**{data['name']}** has been created with {len(data['selected_subjects'])} subjects!\n\nYour AI-powered study schedule is ready and optimized for your learning goals.\n\nWhat would you like to do next?",
                intent="schedule_created",
                confidence=1.0,
                entities={},
                actions=[{"type": "schedule_created", "schedule_id": result.get('schedule', {}).get('_id')}],
                conversation_id=f"success_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                quick_actions=[
                    {"id": "view-schedule", "label": "👁️ View Schedule", "icon": "eye", "message": "view my schedule", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                    {"id": "create-another", "label": "➕ Create Another", "icon": "plus", "message": "create another schedule", "color": "bg-green-600 hover:bg-green-700 text-white"},
                    {"id": "main-menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-purple-600 hover:bg-purple-700 text-white"}
                ],
                suggestions=[
                    "View my schedule",
                    "Create another schedule",
                    "Main menu"
                ]
            )
            
        except Exception as e:
            logger.error(f"Error creating schedule: {e}")
            return ChatResponse(
                response=f"❌ **Error Creating Schedule**\n\nThere was an error generating your schedule: {str(e)}\n\nWould you like to try again?",
                intent="schedule_error",
                confidence=1.0,
                entities={},
                actions=[],
                conversation_id=f"error_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                quick_actions=[
                    {"id": "retry", "label": "🔄 Try Again", "icon": "refresh", "message": "yes", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                    {"id": "main-menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
                ],
                suggestions=["Try again", "Main menu"]
            )
    
    # Invalid response
    return ChatResponse(
        response="⚠️ Please respond with 'yes' to generate the schedule, 'restart' to start over, or 'cancel' for main menu:",
        intent="create_schedule_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"create_schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "confirm", "label": "✅ Generate Schedule", "icon": "check", "message": "yes", "color": "bg-green-600 hover:bg-green-700 text-white"},
            {"id": "edit", "label": "✏️ Start Over", "icon": "edit", "message": "restart", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=["yes", "restart", "main menu"]
    )

# ================== PRIORITIZATION ENGINE API ENDPOINTS ==================

@app.post("/add_subject")
async def add_subject_with_prioritization(
    request: SubjectCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Enhanced subject creation with prioritization features"""
    try:
        user_id = current_user.get('user_id')
        
        # Validate difficulty and priority values
        if request.difficulty not in [1, 2, 3]:
            raise HTTPException(status_code=400, detail="Difficulty must be 1 (Beginner), 2 (Intermediate), or 3 (Advanced)")
        
        if request.priority not in [1, 2, 3]:
            raise HTTPException(status_code=400, detail="Priority must be 1 (Low), 2 (Medium), or 3 (High)")
        
        if request.estimated_hours <= 0:
            raise HTTPException(status_code=400, detail="Estimated hours must be positive")
        
        # Parse deadline if provided
        deadline_date = None
        if request.deadline:
            try:
                deadline_date = datetime.fromisoformat(request.deadline.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid deadline format. Use ISO format (YYYY-MM-DDTHH:MM:SS)")
        
        # Create subject data for backend
        subject_data = {
            "name": request.name,
            "description": request.description,
            "difficulty": ["beginner", "intermediate", "advanced"][request.difficulty - 1],
            "priority": ["low", "medium", "high"][request.priority - 1],
            "category": request.category,
            "estimatedHours": request.estimated_hours,
            "tags": request.tags or [],
            "deadline": request.deadline,
            "progress": 0,
            "isCompleted": False
        }
        
        # Create subject in backend
        result = await backend_client.post(
            "/subjects",
            data=subject_data,
            headers={"Authorization": f"Bearer {current_user.get('token', '')}"}
        )
        
        if not result.get('success', False):
            raise HTTPException(status_code=400, detail=result.get('message', 'Failed to create subject'))
        
        subject = result.get('subject', {})
        
        # Add subject to prioritization engine bandit
        prioritization_engine.bandit.add_arm(subject.get('_id'))
        
        return {
            "success": True,
            "message": "Subject created successfully with prioritization features",
            "subject": subject,
            "prioritization_enabled": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in add_subject_with_prioritization: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/generate_schedule")
async def generate_prioritized_schedule(
    request: ScheduleGenerationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate a prioritized schedule using AI models"""
    try:
        user_id = current_user.get('user_id')
        
        if request.user_id != user_id:
            raise HTTPException(status_code=403, detail="Cannot generate schedule for different user")
        
        # Fetch user's subjects
        subjects_response = await backend_client.get(
            "/subjects",
            headers={"Authorization": f"Bearer {current_user.get('token', '')}"}
        )
        
        all_subjects = subjects_response.get('subjects', [])
        
        # Filter to requested subjects
        if request.subject_ids:
            filtered_subjects = [s for s in all_subjects if s.get('_id') in request.subject_ids]
        else:
            filtered_subjects = all_subjects
        
        if not filtered_subjects:
            raise HTTPException(status_code=400, detail="No valid subjects found for scheduling")
        
        # Convert to SubjectFeatures for prioritization engine
        subject_features = []
        for subject in filtered_subjects:
            # Calculate days until deadline
            days_until_deadline = 30  # Default
            if subject.get('deadline'):
                try:
                    deadline = datetime.fromisoformat(subject['deadline'].replace('Z', '+00:00'))
                    days_until_deadline = max(1, (deadline - datetime.now()).days)
                except:
                    pass
            
            # Map difficulty and priority to numbers
            difficulty_map = {"beginner": 1, "intermediate": 2, "advanced": 3}
            priority_map = {"low": 1, "medium": 2, "high": 3}
            
            features = SubjectFeatures(
                subject_id=subject['_id'],
                name=subject['name'],
                difficulty=difficulty_map.get(subject.get('difficulty', 'beginner'), 1),
                priority=priority_map.get(subject.get('priority', 'medium'), 2),
                estimated_hours=subject.get('estimatedHours', 10),
                completion_rate=subject.get('progress', 0) / 100.0,
                focus_score=7.0,  # Default - will be updated from feedback
                days_until_deadline=days_until_deadline,
                progress_velocity=0.1,  # Default - will be calculated from history
                stress_level=5.0,  # Default - will be updated from feedback
                last_session_success=True  # Default optimistic
            )
            subject_features.append(features)
        
        # Generate prioritized recommendations
        recommendations = prioritization_engine.get_scheduling_recommendations(
            subject_features, 
            time_slots=min(10, len(subject_features))
        )
        
        # Create schedule sessions based on recommendations
        schedule_sessions = []
        start_date = datetime.fromisoformat(request.start_date.replace('Z', '+00:00'))
        session_duration_hours = request.session_duration / 60.0
        sessions_per_day = max(1, int(request.daily_hours / session_duration_hours))
        
        current_date = start_date
        end_date = datetime.fromisoformat(request.end_date.replace('Z', '+00:00'))
        session_counter = 0
        
        while current_date <= end_date and session_counter < len(recommendations):
            for time_slot in request.preferred_times:
                if session_counter >= len(recommendations):
                    break
                
                rec = recommendations[session_counter]
                
                # Map time slots to hours
                time_mapping = {
                    'morning': 9,
                    'afternoon': 14,
                    'evening': 19
                }
                
                start_hour = time_mapping.get(time_slot, 14)
                session_start = current_date.replace(hour=start_hour, minute=0, second=0, microsecond=0)
                session_end = session_start + timedelta(minutes=request.session_duration)
                
                session = {
                    "subjectId": rec['subject_id'],
                    "startTime": session_start.isoformat(),
                    "endTime": session_end.isoformat(),
                    "duration": request.session_duration,
                    "priority": rec['priority_score'],
                    "sessionType": "study",
                    "status": "scheduled",
                    "prioritizationReasoning": rec['reasoning'],
                    "methodUsed": rec['method_used']
                }
                
                schedule_sessions.append(session)
                session_counter += 1
            
            current_date += timedelta(days=1)
        
        # Create schedule in backend
        schedule_data = {
            "name": f"AI Prioritized Schedule - {start_date.strftime('%Y-%m-%d')}",
            "startDate": request.start_date,
            "endDate": request.end_date,
            "sessions": schedule_sessions,
            "scheduleType": "real",
            "preferences": {
                "dailyStudyHours": request.daily_hours,
                "preferredTimeSlots": request.preferred_times,
                "sessionDuration": request.session_duration,
                "breakDuration": 15
            },
            "metadata": {
                "generatedBy": "prioritization_engine",
                "modelUsed": "hybrid_bandit_selection",
                "totalRecommendations": len(recommendations)
            }
        }
        
        result = await backend_client.post(
            "/schedules",
            data=schedule_data,
            headers={"Authorization": f"Bearer {current_user.get('token', '')}"}
        )
        
        return {
            "success": True,
            "message": "Prioritized schedule generated successfully",
            "schedule": result.get('schedule', {}),
            "recommendations": recommendations,
            "prioritization_stats": {
                "subjects_analyzed": len(subject_features),
                "sessions_created": len(schedule_sessions),
                "method_used": "hybrid_bandit_selection"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in generate_prioritized_schedule: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate schedule: {str(e)}")

@app.post("/submit_feedback")
async def submit_session_feedback(
    request: FeedbackSubmissionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Submit feedback to update prioritization models"""
    try:
        # Validate feedback values
        if not (0.0 <= request.completion_rate <= 1.0):
            raise HTTPException(status_code=400, detail="Completion rate must be between 0.0 and 1.0")
        
        if not (1.0 <= request.focus_score <= 10.0):
            raise HTTPException(status_code=400, detail="Focus score must be between 1.0 and 10.0")
        
        if not (1.0 <= request.stress_level <= 10.0):
            raise HTTPException(status_code=400, detail="Stress level must be between 1.0 and 10.0")
        
        # Create feedback object
        feedback = SessionFeedback(
            subject_id=request.subject_id,
            completion_rate=request.completion_rate,
            focus_score=request.focus_score,
            stress_level=request.stress_level,
            session_duration=request.session_duration,
            actual_vs_planned_ratio=request.session_duration / max(request.planned_duration, 1),
            timestamp=datetime.now()
        )
        
        # Update prioritization models
        prioritization_engine.update_models(feedback)
        
        # Store feedback in MongoDB for future analysis
        feedback_data = {
            "userId": current_user.get('user_id'),
            "subjectId": request.subject_id,
            "completionRate": request.completion_rate,
            "focusScore": request.focus_score,
            "stressLevel": request.stress_level,
            "sessionDuration": request.session_duration,
            "plannedDuration": request.planned_duration,
            "actualVsPlannedRatio": feedback.actual_vs_planned_ratio,
            "timestamp": feedback.timestamp.isoformat()
        }
        
        # Store in backend (assuming feedback endpoint exists)
        try:
            await backend_client.post(
                "/feedback",
                data=feedback_data,
                headers={"Authorization": f"Bearer {current_user.get('token', '')}"}
            )
        except Exception as e:
            logger.warning(f"Failed to store feedback in backend: {e}")
        
        # Get updated bandit statistics
        bandit_stats = prioritization_engine.bandit.get_arm_statistics(request.subject_id)
        
        return {
            "success": True,
            "message": "Feedback submitted successfully",
            "updated_statistics": bandit_stats,
            "feedback_processed": {
                "subject_id": request.subject_id,
                "reward_calculated": prioritization_engine.bandit._calculate_reward(feedback),
                "timestamp": feedback.timestamp.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in submit_session_feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process feedback: {str(e)}")

@app.post("/get_optimal_subject")
async def get_optimal_subject_recommendation(
    request: OptimalSubjectRequest,
    current_user: dict = Depends(get_current_user)
):
    """Get the next optimal subject recommendation"""
    try:
        user_id = current_user.get('user_id')
        
        if request.user_id != user_id:
            raise HTTPException(status_code=403, detail="Cannot get recommendations for different user")
        
        # Fetch user's subjects
        subjects_response = await backend_client.get(
            "/subjects",
            headers={"Authorization": f"Bearer {current_user.get('token', '')}"}
        )
        
        all_subjects = subjects_response.get('subjects', [])
        
        # Filter to available subjects if specified
        if request.available_subject_ids:
            filtered_subjects = [s for s in all_subjects if s.get('_id') in request.available_subject_ids]
        else:
            # Filter out completed subjects
            filtered_subjects = [s for s in all_subjects if not s.get('isCompleted', False)]
        
        if not filtered_subjects:
            return {
                "success": False,
                "message": "No available subjects for recommendation",
                "recommendation": None
            }
        
        # Convert to SubjectFeatures
        subject_features = []
        for subject in filtered_subjects:
            days_until_deadline = 30
            if subject.get('deadline'):
                try:
                    deadline = datetime.fromisoformat(subject['deadline'].replace('Z', '+00:00'))
                    days_until_deadline = max(1, (deadline - datetime.now()).days)
                except:
                    pass
            
            difficulty_map = {"beginner": 1, "intermediate": 2, "advanced": 3}
            priority_map = {"low": 1, "medium": 2, "high": 3}
            
            features = SubjectFeatures(
                subject_id=subject['_id'],
                name=subject['name'],
                difficulty=difficulty_map.get(subject.get('difficulty', 'beginner'), 1),
                priority=priority_map.get(subject.get('priority', 'medium'), 2),
                estimated_hours=subject.get('estimatedHours', 10),
                completion_rate=subject.get('progress', 0) / 100.0,
                focus_score=7.0,
                days_until_deadline=days_until_deadline,
                progress_velocity=0.1,
                stress_level=5.0,
                last_session_success=True
            )
            subject_features.append(features)
        
        # Get optimal subject
        subject_id, score, method = prioritization_engine.select_optimal_subject(subject_features)
        
        # Find the recommended subject details
        recommended_subject = next(s for s in filtered_subjects if s.get('_id') == subject_id)
        
        # Get bandit statistics for the recommended subject
        bandit_stats = prioritization_engine.bandit.get_arm_statistics(subject_id)
        
        return {
            "success": True,
            "message": "Optimal subject recommendation generated",
            "recommendation": {
                "subject_id": subject_id,
                "subject_name": recommended_subject['name'],
                "priority_score": score,
                "method_used": method,
                "reasoning": prioritization_engine._generate_reasoning(
                    next(sf for sf in subject_features if sf.subject_id == subject_id), 
                    score
                ),
                "bandit_statistics": bandit_stats,
                "subject_details": {
                    "difficulty": recommended_subject.get('difficulty'),
                    "priority": recommended_subject.get('priority'),
                    "progress": recommended_subject.get('progress', 0),
                    "estimated_hours": recommended_subject.get('estimatedHours')
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_optimal_subject_recommendation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get recommendation: {str(e)}")

# ================== ENHANCED CONVERSATION FLOWS ==================

async def handle_subject_difficulty_step_enhanced(message: str, user_id: str, data: dict, user_data: dict):
    """Enhanced difficulty step with prioritization context"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    difficulty_map = {"1": "beginner", "2": "intermediate", "3": "advanced"}
    text_map = {"beginner": "beginner", "intermediate": "intermediate", "advanced": "advanced"}
    
    # Try to parse the difficulty
    difficulty_text = message.lower().strip()
    difficulty = None
    
    if difficulty_text in difficulty_map:
        difficulty = difficulty_map[difficulty_text]
    elif difficulty_text in text_map:
        difficulty = difficulty_text
    
    if not difficulty:
        return ChatResponse(
            response="⚠️ Please select a valid difficulty level (1-3 or beginner/intermediate/advanced):",
            intent="add_subject_flow",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "1", "label": "1️⃣ Beginner", "icon": "play", "message": "1", "color": "bg-green-600 hover:bg-green-700 text-white"},
                {"id": "2", "label": "2️⃣ Intermediate", "icon": "zap", "message": "2", "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
                {"id": "3", "label": "3️⃣ Advanced", "icon": "star", "message": "3", "color": "bg-red-600 hover:bg-red-700 text-white"}
            ],
            suggestions=["1", "2", "3", "beginner"]
        )
    
    # Store difficulty in data
    update_conversation_state(user_id, ConversationStep.ADD_SUBJECT_CATEGORY, {**data, "difficulty": difficulty})
    
    return ChatResponse(
        response=f"✅ Difficulty set to: **{difficulty.title()}**\n\n**Step 4 of 8: Subject Category**\n\nWhat category does this subject belong to?\n\n*This helps with prioritization and scheduling optimization.*",
        intent="add_subject_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "academic", "label": "🎓 Academic", "icon": "book", "message": "Academic", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
            {"id": "professional", "label": "💼 Professional", "icon": "briefcase", "message": "Professional", "color": "bg-purple-600 hover:bg-purple-700 text-white"},
            {"id": "personal", "label": "🌟 Personal", "icon": "user", "message": "Personal", "color": "bg-green-600 hover:bg-green-700 text-white"},
            {"id": "certification", "label": "🏆 Certification", "icon": "award", "message": "Certification", "color": "bg-orange-600 hover:bg-orange-700 text-white"}
        ],
        suggestions=["Academic", "Professional", "Personal", "Certification"]
    )

async def handle_subject_priority_step_enhanced(message: str, user_id: str, data: dict, user_data: dict):
    """Enhanced priority step with AI prioritization explanation"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    priority_map = {"1": "low", "2": "medium", "3": "high"}
    text_map = {"low": "low", "medium": "medium", "high": "high"}
    
    priority_text = message.lower().strip()
    priority = None
    
    if priority_text in priority_map:
        priority = priority_map[priority_text]
    elif priority_text in text_map:
        priority = priority_text
    
    if not priority:
        return ChatResponse(
            response="⚠️ Please select a valid priority level (1-3 or low/medium/high):\n\n**Priority affects AI scheduling:**\n• **High** - Scheduled first, more frequent sessions\n• **Medium** - Balanced scheduling approach\n• **Low** - Scheduled when time allows",
            intent="add_subject_flow",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "1", "label": "1️⃣ Low Priority", "icon": "circle", "message": "1", "color": "bg-gray-600 hover:bg-gray-700 text-white"},
                {"id": "2", "label": "2️⃣ Medium Priority", "icon": "target", "message": "2", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                {"id": "3", "label": "3️⃣ High Priority", "icon": "zap", "message": "3", "color": "bg-red-600 hover:bg-red-700 text-white"}
            ],
            suggestions=["1", "2", "3", "medium"]
        )
    
    update_conversation_state(user_id, ConversationStep.ADD_SUBJECT_DEADLINE, {**data, "priority": priority})
    
    return ChatResponse(
        response=f"✅ Priority set to: **{priority.title()}**\n\n**Step 7 of 8: Deadline (Optional)**\n\nDoes this subject have a deadline? Enter a date (YYYY-MM-DD) or type 'none' if no deadline.\n\n*Deadlines help the AI prioritize urgent subjects in your schedule.*\n\n*Example: 2024-03-15 or none*",
        intent="add_subject_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "none", "label": "📅 No Deadline", "icon": "calendar", "message": "none", "color": "bg-gray-600 hover:bg-gray-700 text-white"},
            {"id": "week", "label": "📅 Next Week", "icon": "calendar", "message": (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'), "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
            {"id": "month", "label": "📅 Next Month", "icon": "calendar", "message": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'), "color": "bg-blue-600 hover:bg-blue-700 text-white"}
        ],
        suggestions=[
            "none",
            (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),
            (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        ]
    )

async def handle_subject_deadline_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle deadline input step"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    deadline = None
    deadline_text = "No deadline"
    
    if message.lower().strip() != "none":
        try:
            # Try to parse date
            deadline_date = datetime.strptime(message.strip(), '%Y-%m-%d')
            if deadline_date < datetime.now():
                return ChatResponse(
                    response="⚠️ Deadline cannot be in the past. Please enter a future date (YYYY-MM-DD) or 'none':",
                    intent="add_subject_flow",
                    confidence=1.0,
                    entities={},
                    actions=[],
                    conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    quick_actions=[],
                    suggestions=["none", (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')]
                )
            deadline = deadline_date.isoformat()
            deadline_text = deadline_date.strftime('%B %d, %Y')
        except ValueError:
            return ChatResponse(
                response="⚠️ Invalid date format. Please use YYYY-MM-DD format or type 'none':\n\n*Example: 2024-03-15*",
                intent="add_subject_flow",
                confidence=1.0,
                entities={},
                actions=[],
                conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                quick_actions=[
                    {"id": "none", "label": "📅 No Deadline", "icon": "calendar", "message": "none", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
                ],
                suggestions=["none"]
            )
    
    update_conversation_state(user_id, ConversationStep.ADD_SUBJECT_TAGS, {**data, "deadline": deadline})
    
    return ChatResponse(
        response=f"✅ Deadline: **{deadline_text}**\n\n**Step 8 of 8: Tags (Optional)**\n\nAdd some tags to help organize **{data['name']}**. Separate multiple tags with commas.\n\n*Examples: calculus, derivatives, limits OR programming, python, algorithms*\n\nOr type 'skip' to skip this step.",
        intent="add_subject_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "none", "label": "🏷️ No Tags", "icon": "tag", "message": "none", "color": "bg-gray-600 hover:bg-gray-700 text-white"},
            {"id": "exam", "label": "🏷️ Exam", "icon": "tag", "message": "exam", "color": "bg-red-600 hover:bg-red-700 text-white"},
            {"id": "project", "label": "🏷️ Project", "icon": "tag", "message": "project", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
            {"id": "important", "label": "🏷️ Important", "icon": "tag", "message": "important", "color": "bg-orange-600 hover:bg-orange-700 text-white"}
        ],
        suggestions=["none", "exam", "project", "important", "midterm"]
    )

async def handle_study_recommendation_request(user_id: str, message: str, user_data: dict):
    """Handle AI study recommendation requests"""
    try:
        # Extract context from the message
        doc = nlp(message.lower())
        urgency_keywords = ["urgent", "deadline", "soon", "tomorrow", "exam", "test"]
        difficulty_keywords = ["hard", "difficult", "easy", "challenging", "complex"]
        
        urgency_mentioned = any(keyword in message.lower() for keyword in urgency_keywords)
        difficulty_mentioned = any(keyword in message.lower() for keyword in difficulty_keywords)
        
        # Prepare request for AI recommendation
        recommendation_request = {
            "user_preferences": {
                "prioritize_deadlines": urgency_mentioned,
                "consider_difficulty": difficulty_mentioned,
                "context": message.lower()
            }
        }
        
        # Call the optimal subject API
        response = requests.post(
            f"{BACKEND_URL}/api/ai/get_optimal_subject",
            json=recommendation_request,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            recommendation = response.json()
            subject = recommendation.get("subject", {})
            reasoning = recommendation.get("reasoning", "Based on your study patterns and priorities")
            confidence = recommendation.get("confidence_score", 0.0)
            
            if subject:
                response_text = f"🤖 **AI Study Recommendation**\n\n"
                response_text += f"📚 **{subject.get('name', 'Unknown Subject')}**\n"
                response_text += f"📊 **Confidence**: {confidence:.1%}\n\n"
                response_text += f"💡 **Why this subject?**\n{reasoning}\n\n"
                
                if subject.get('deadline'):
                    response_text += f"⏰ **Deadline**: {subject['deadline']}\n"
                if subject.get('difficulty'):
                    response_text += f"📈 **Difficulty**: {subject['difficulty'].title()}\n"
                if subject.get('estimated_hours'):
                    response_text += f"🕒 **Estimated Time**: {subject['estimated_hours']} hours\n\n"
                
                response_text += "Would you like to start a study session for this subject?"
                
                return ChatResponse(
                    response=response_text,
                    intent="study_recommendation",
                    confidence=confidence,
                    entities={"recommended_subject": subject},
                    actions=[{"type": "start_session"}, {"type": "get_different_recommendation"}],
                    conversation_id=f"recommendation_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    quick_actions=[
                        {"id": "start_session", "label": "▶️ Start Session", "icon": "play", "message": f"start session for {subject.get('name', 'this subject')}", "color": "bg-green-600 hover:bg-green-700 text-white"},
                        {"id": "different_rec", "label": "🔄 Different Suggestion", "icon": "refresh", "message": "suggest different subject", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                        {"id": "main_menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
                    ]
                )
            else:
                return ChatResponse(
                    response="🤖 I don't have enough information about your subjects to make a recommendation yet.\n\nWould you like to add some subjects first?",
                    intent="no_subjects_available",
                    confidence=1.0,
                    entities={},
                    actions=[{"type": "add_subject"}],
                    conversation_id=f"recommendation_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    quick_actions=[
                        {"id": "add_subject", "label": "➕ Add Subject", "icon": "plus", "message": "add subject", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                        {"id": "main_menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
                    ]
                )
        else:
            return ChatResponse(
                response="⚠️ I'm having trouble accessing the recommendation system right now. Please try again later.",
                intent="recommendation_error",
                confidence=1.0,
                entities={},
                actions=[{"type": "retry"}, {"type": "main_menu"}],
                conversation_id=f"recommendation_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                quick_actions=[
                    {"id": "retry", "label": "🔄 Try Again", "icon": "refresh", "message": "recommend subject", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                    {"id": "main_menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
                ]
            )
            
    except Exception as e:
        print(f"Error in study recommendation: {e}")
        return ChatResponse(
            response="⚠️ I encountered an error while processing your recommendation request. Please try again.",
            intent="recommendation_error",
            confidence=1.0,
            entities={},
            actions=[{"type": "retry"}, {"type": "main_menu"}],
            conversation_id=f"recommendation_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "retry", "label": "🔄 Try Again", "icon": "refresh", "message": "recommend subject", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                {"id": "main_menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
            ]
        )

async def handle_feedback_collection_request(user_id: str, message: str, user_data: dict):
    """Handle feedback collection for completed study sessions"""
    try:
        # Extract session details from the message
        doc = nlp(message.lower())
        
        # Look for subject name mentions
        subject_name = None
        for token in doc:
            if token.pos_ == "PROPN" or token.like_title:
                subject_name = token.text
                break
        
        # Look for focus and stress indicators in the message
        focus_keywords = {
            "high": ["focused", "concentrated", "good focus", "very focused", "excellent focus"],
            "medium": ["okay focus", "average focus", "decent focus", "some focus"],
            "low": ["distracted", "poor focus", "couldn't focus", "lost focus", "no focus"]
        }
        
        stress_keywords = {
            "high": ["stressed", "overwhelmed", "anxious", "difficult", "hard time"],
            "medium": ["okay", "manageable", "moderate", "some stress"],
            "low": ["easy", "relaxed", "comfortable", "stress-free", "calm"]
        }
        
        focus_score = 3  # Default medium
        stress_level = 3  # Default medium
        
        for level, keywords in focus_keywords.items():
            if any(keyword in message.lower() for keyword in keywords):
                focus_score = {"high": 5, "medium": 3, "low": 1}[level]
                break
        
        for level, keywords in stress_keywords.items():
            if any(keyword in message.lower() for keyword in keywords):
                stress_level = {"high": 5, "medium": 3, "low": 1}[level]
                break
        
        # Start feedback collection flow
        update_conversation_state(user_id, "feedback_collection", {
            "subject_name": subject_name,
            "focus_score": focus_score,
            "stress_level": stress_level,
            "original_message": message
        })
        
        response_text = "📝 **Session Feedback Collection**\n\n"
        if subject_name:
            response_text += f"Subject: **{subject_name}**\n\n"
        
        response_text += "Please rate your study session:\n\n"
        response_text += "**Focus Level** (1-5 scale):\n"
        response_text += "1 = Very distracted, 5 = Highly focused"
        
        return ChatResponse(
            response=response_text,
            intent="feedback_collection",
            confidence=1.0,
            entities={"subject_name": subject_name},
            actions=["collect_focus_rating"],
            conversation_id=f"feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "focus_1", "label": "1 - Very Distracted", "icon": "frown", "message": "1", "color": "bg-red-600 hover:bg-red-700 text-white"},
                {"id": "focus_2", "label": "2 - Somewhat Distracted", "icon": "meh", "message": "2", "color": "bg-orange-600 hover:bg-orange-700 text-white"},
                {"id": "focus_3", "label": "3 - Neutral", "icon": "smile", "message": "3", "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
                {"id": "focus_4", "label": "4 - Good Focus", "icon": "grin", "message": "4", "color": "bg-green-600 hover:bg-green-700 text-white"},
                {"id": "focus_5", "label": "5 - Excellent Focus", "icon": "star", "message": "5", "color": "bg-blue-600 hover:bg-blue-700 text-white"}
            ]
        )
        
    except Exception as e:
        print(f"Error in feedback collection: {e}")
        return ChatResponse(
            response="⚠️ I encountered an error while setting up feedback collection. Please try again.",
            intent="feedback_error",
            confidence=1.0,
            entities={},
            actions=["retry", "main_menu"],
            conversation_id=f"feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "retry", "label": "🔄 Try Again", "icon": "refresh", "message": "session feedback", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                {"id": "main_menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
            ]
        )

async def handle_feedback_focus_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle focus score input for feedback"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    try:
        focus_score = int(message.strip())
        if focus_score < 1 or focus_score > 5:
            raise ValueError("Focus score must be between 1 and 5")
    except (ValueError, TypeError):
        return ChatResponse(
            response="⚠️ Please enter a valid focus score (1-5):",
            intent="feedback_collection",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "focus_1", "label": "1", "icon": "frown", "message": "1", "color": "bg-red-600 hover:bg-red-700 text-white"},
                {"id": "focus_2", "label": "2", "icon": "meh", "message": "2", "color": "bg-orange-600 hover:bg-orange-700 text-white"},
                {"id": "focus_3", "label": "3", "icon": "smile", "message": "3", "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
                {"id": "focus_4", "label": "4", "icon": "grin", "message": "4", "color": "bg-green-600 hover:bg-green-700 text-white"},
                {"id": "focus_5", "label": "5", "icon": "star", "message": "5", "color": "bg-blue-600 hover:bg-blue-700 text-white"}
            ]
        )
    
    update_conversation_state(user_id, "feedback_stress", {**data, "focus_score": focus_score})
    
    return ChatResponse(
        response=f"✅ Focus Score: **{focus_score}/5**\n\n**Stress Level** (1-5 scale):\n1 = Very stressed/overwhelmed, 5 = Very relaxed/comfortable",
        intent="feedback_collection",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "stress_1", "label": "1 - Very Stressed", "icon": "frown", "message": "1", "color": "bg-red-600 hover:bg-red-700 text-white"},
            {"id": "stress_2", "label": "2 - Somewhat Stressed", "icon": "meh", "message": "2", "color": "bg-orange-600 hover:bg-orange-700 text-white"},
            {"id": "stress_3", "label": "3 - Neutral", "icon": "smile", "message": "3", "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
            {"id": "stress_4", "label": "4 - Comfortable", "icon": "grin", "message": "4", "color": "bg-green-600 hover:bg-green-700 text-white"},
            {"id": "stress_5", "label": "5 - Very Relaxed", "icon": "star", "message": "5", "color": "bg-blue-600 hover:bg-blue-700 text-white"}
        ]
    )

async def handle_feedback_stress_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle stress level input for feedback"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    try:
        stress_level = int(message.strip())
        if stress_level < 1 or stress_level > 5:
            raise ValueError("Stress level must be between 1 and 5")
    except (ValueError, TypeError):
        return ChatResponse(
            response="⚠️ Please enter a valid stress level (1-5):",
            intent="feedback_collection",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "stress_1", "label": "1", "icon": "frown", "message": "1", "color": "bg-red-600 hover:bg-red-700 text-white"},
                {"id": "stress_2", "label": "2", "icon": "meh", "message": "2", "color": "bg-orange-600 hover:bg-orange-700 text-white"},
                {"id": "stress_3", "label": "3", "icon": "smile", "message": "3", "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
                {"id": "stress_4", "label": "4", "icon": "grin", "message": "4", "color": "bg-green-600 hover:bg-green-700 text-white"},
                {"id": "stress_5", "label": "5", "icon": "star", "message": "5", "color": "bg-blue-600 hover:bg-blue-700 text-white"}
            ]
        )
    
    update_conversation_state(user_id, "feedback_completion", {**data, "stress_level": stress_level})
    
    return ChatResponse(
        response=f"✅ Stress Level: **{stress_level}/5**\n\n**How much of the session did you complete?**\nPlease enter a percentage (0-100):",
        intent="feedback_collection",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "complete_25", "label": "25%", "icon": "percent", "message": "25", "color": "bg-red-600 hover:bg-red-700 text-white"},
            {"id": "complete_50", "label": "50%", "icon": "percent", "message": "50", "color": "bg-orange-600 hover:bg-orange-700 text-white"},
            {"id": "complete_75", "label": "75%", "icon": "percent", "message": "75", "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
            {"id": "complete_100", "label": "100%", "icon": "percent", "message": "100", "color": "bg-green-600 hover:bg-green-700 text-white"}
        ]
    )

async def handle_feedback_completion_step(message: str, user_id: str, data: dict, user_data: dict):
    """Handle completion percentage and submit feedback"""
    if message.lower().strip() in ["cancel", "main menu", "stop"]:
        clear_conversation_state(user_id)
        return show_main_menu()
    
    try:
        completion_percentage = float(message.strip())
        if completion_percentage < 0 or completion_percentage > 100:
            raise ValueError("Completion percentage must be between 0 and 100")
    except (ValueError, TypeError):
        return ChatResponse(
            response="⚠️ Please enter a valid completion percentage (0-100):",
            intent="feedback_collection",
            confidence=1.0,
            entities={},
            actions=[],
            conversation_id=f"feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "complete_25", "label": "25%", "icon": "percent", "message": "25", "color": "bg-red-600 hover:bg-red-700 text-white"},
                {"id": "complete_50", "label": "50%", "icon": "percent", "message": "50", "color": "bg-orange-600 hover:bg-orange-700 text-white"},
                {"id": "complete_75", "label": "75%", "icon": "percent", "message": "75", "color": "bg-yellow-600 hover:bg-yellow-700 text-white"},
                {"id": "complete_100", "label": "100%", "icon": "percent", "message": "100", "color": "bg-green-600 hover:bg-green-700 text-white"}
            ]
        )
    
    # Submit feedback to the prioritization system
    try:
        feedback_data = {
            "subject_name": data.get("subject_name"),
            "focus_score": data.get("focus_score"),
            "stress_level": data.get("stress_level"),
            "completion_percentage": completion_percentage,
            "session_date": datetime.now().isoformat(),
            "user_id": user_id
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/ai/submit_feedback",
            json=feedback_data,
            headers={"Content-Type": "application/json"}
        )
        
        clear_conversation_state(user_id)
        
        if response.status_code == 200:
            return ChatResponse(
                response=f"✅ **Feedback Submitted Successfully!**\n\n📊 **Session Summary:**\n• Focus Score: **{data.get('focus_score')}/5**\n• Stress Level: **{data.get('stress_level')}/5**\n• Completion: **{completion_percentage}%**\n\n🤖 This feedback helps improve your future study recommendations!",
                intent="feedback_submitted",
                confidence=1.0,
                entities={},
                actions=["main_menu", "get_recommendation"],
                conversation_id=f"feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                quick_actions=[
                    {"id": "recommendation", "label": "🤖 Get Study Recommendation", "icon": "brain", "message": "recommend study subject", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                    {"id": "main_menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
                ]
            )
        else:
            return ChatResponse(
                response=f"⚠️ Feedback collected but couldn't sync with AI system. Your data:\n• Focus: {data.get('focus_score')}/5\n• Stress: {data.get('stress_level')}/5\n• Completion: {completion_percentage}%",
                intent="feedback_partial",
                confidence=1.0,
                entities={},
                actions=["main_menu"],
                conversation_id=f"feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                quick_actions=[
                    {"id": "main_menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
                ]
            )
            
    except Exception as e:
        print(f"Error submitting feedback: {e}")
        clear_conversation_state(user_id)
        return ChatResponse(
            response="⚠️ Error submitting feedback. Please try again later.",
            intent="feedback_error",
            confidence=1.0,
            entities={},
            actions=["main_menu"],
            conversation_id=f"feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            quick_actions=[
                {"id": "main_menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-gray-600 hover:bg-gray-700 text-white"}
            ]
        )

# ================== ANALYTICS ENDPOINT ==================

@app.get("/analytics/chatbot")
async def get_chatbot_analytics():
    """Get chatbot usage analytics for dashboard integration"""
    try:
        # Get conversation statistics
        total_conversations = len(conversation_states)
        active_conversations = sum(1 for state in conversation_states.values() 
                                 if (datetime.now() - state.get('last_activity', datetime.now())).seconds < 3600)
        
        # Calculate simple metrics (in a real implementation, these would come from a database)
        analytics_data = {
            "total_interactions": total_conversations,
            "active_conversations": active_conversations,
            "average_response_time": 1.2,  # Simulated response time in seconds
            "user_engagement_score": min(1.0, total_conversations / 50),  # Engagement out of 1.0
            "popular_intents": [
                {"intent": "get_schedule", "count": 25},
                {"intent": "add_subject", "count": 18},
                {"intent": "create_schedule", "count": 12},
                {"intent": "study_recommendation", "count": 30}
            ],
            "session_completion_rate": 0.75,  # 75% of conversations reach completion
            "last_updated": datetime.now().isoformat(),
            "server_status": "healthy"
        }
        
        return {
            "success": True,
            "analytics": analytics_data,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting chatbot analytics: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Update the conversation step enum to include deadline step
class ConversationStep:
    # Subject Addition Flow
    ADD_SUBJECT_NAME = "add_subject_name"
    ADD_SUBJECT_DESCRIPTION = "add_subject_description"
    ADD_SUBJECT_DIFFICULTY = "add_subject_difficulty"
    ADD_SUBJECT_CATEGORY = "add_subject_category"
    ADD_SUBJECT_HOURS = "add_subject_hours"
    ADD_SUBJECT_PRIORITY = "add_subject_priority"
    ADD_SUBJECT_DEADLINE = "add_subject_deadline"  # New step
    ADD_SUBJECT_TAGS = "add_subject_tags"
    ADD_SUBJECT_CONFIRM = "add_subject_confirm"
    
    # Schedule Creation Flow
    CREATE_SCHEDULE_START = "create_schedule_start"
    CREATE_SCHEDULE_NAME = "create_schedule_name"
    CREATE_SCHEDULE_SUBJECTS = "create_schedule_subjects"
    CREATE_SCHEDULE_DATES = "create_schedule_dates"
    CREATE_SCHEDULE_DAILY_HOURS = "create_schedule_daily_hours"
    CREATE_SCHEDULE_SESSION_DURATION = "create_schedule_session_duration"
    CREATE_SCHEDULE_PREFERRED_TIMES = "create_schedule_preferred_times"
    CREATE_SCHEDULE_CONFIRM = "create_schedule_confirm"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host=os.getenv('CHATBOT_HOST', '0.0.0.0'), 
        port=int(os.getenv('CHATBOT_PORT', 8000)),
        reload=os.getenv('CHATBOT_DEBUG', 'False').lower() == 'true'
    )
