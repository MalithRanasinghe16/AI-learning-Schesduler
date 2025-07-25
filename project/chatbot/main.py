from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
import logging
from datetime import datetime

# Load environment variables
load_dotenv()

# Import our modules
from nlp_processor import NLPProcessor
from intent_classifier import IntentClassifier
from schedule_parser import ScheduleParser
from backend_client import BackendClient
from auth_manager import AuthManager

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

# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        user_data = auth_manager.verify_token(credentials.credentials)
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
    
    intent = intent_result['intent']
    confidence = intent_result['confidence']
    entities = processed_message.get('entities', {})
    
    # Generate conversation ID if not provided
    if not conversation_id:
        conversation_id = f"conv_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user_data['user_id']}"
    
    # Handle different intents
    if intent == 'create_schedule':
        return await handle_create_schedule_intent(
            entities, user_data, conversation_id, confidence
        )
    elif intent == 'modify_schedule':
        return await handle_modify_schedule_intent(
            entities, user_data, conversation_id, confidence
        )
    elif intent == 'get_schedule':
        return await handle_get_schedule_intent(
            entities, user_data, conversation_id, confidence
        )
    elif intent == 'general_question':
        return await handle_general_question_intent(
            message, user_data, conversation_id, confidence
        )
    else:
        return ChatResponse(
            response="I'm sorry, I didn't understand that. Could you please rephrase your request?",
            intent=intent,
            confidence=confidence,
            entities=entities,
            actions=[],
            conversation_id=conversation_id,
            quick_actions=[
                {"id": "create-schedule", "label": "Create Schedule", "icon": "calendar", "message": "Create a new study schedule", "color": "bg-blue-500"},
                {"id": "view-schedule", "label": "View Schedule", "icon": "eye", "message": "Show my current schedule", "color": "bg-green-500"},
                {"id": "help", "label": "Help", "icon": "help", "message": "How does this work?", "color": "bg-purple-500"}
            ],
            suggestions=[
                "Create schedule for math and physics",
                "Show my schedule for today",
                "What subjects do I have?",
                "How do I add a new subject?"
            ]
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

async def handle_get_schedule_intent(entities, user_data, conversation_id, confidence):
    """Handle schedule retrieval requests"""
    try:
        # Get user's current schedules
        schedules = await backend_client.get_user_schedules(user_data['user_id'])
        
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
        
        active_schedules = [s for s in schedules if s.get('status') == 'active']
        
        if active_schedules:
            schedule_info = f"You have {len(active_schedules)} active schedule(s). "
            if len(active_schedules) == 1:
                schedule_info += f"Your current schedule '{active_schedules[0]['name']}' has {len(active_schedules[0].get('sessions', []))} study sessions."
            
            return ChatResponse(
                response=schedule_info + " Would you like me to show you the details?",
                intent='get_schedule',
                confidence=confidence,
                entities=entities,
                actions=[{'type': 'show_schedule_details', 'schedules': active_schedules}],
                conversation_id=conversation_id
            )
        
    except Exception as e:
        logger.error(f"Error fetching schedules: {e}")
    
    return ChatResponse(
        response="Let me check your current schedules for you.",
        intent='get_schedule',
        confidence=confidence,
        entities=entities,
        actions=[{'type': 'fetch_schedules'}],
        conversation_id=conversation_id
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host=os.getenv('CHATBOT_HOST', '0.0.0.0'), 
        port=int(os.getenv('CHATBOT_PORT', 8000)),
        reload=os.getenv('CHATBOT_DEBUG', 'False').lower() == 'true'
    )
