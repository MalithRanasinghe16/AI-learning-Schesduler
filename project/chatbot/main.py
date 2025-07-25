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

def show_main_menu():
    """Show main menu options"""
    return ChatResponse(
        response="🎯 **Welcome to your AI Learning Scheduler!** How can I help you today?\n\nChoose one of the main options below:",
        intent="main_menu",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"main_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
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
            "How much progress have I made?"
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
    
    # Check for main menu triggers
    if any(keyword in message.lower() for keyword in ["main menu", "start over", "help", "what can you do"]):
        clear_conversation_state(user_id)
        return show_main_menu()
    
    # Check for specific action triggers
    if any(keyword in message.lower() for keyword in ["add subject", "new subject", "create subject"]):
        return await start_add_subject_flow(user_id, user_data)
    
    if any(keyword in message.lower() for keyword in ["create schedule", "new schedule", "generate schedule"]):
        return await start_create_schedule_flow(user_id, user_data)
    
    # Handle different intents if no specific flow detected
    if intent == 'create_schedule':
        return await start_create_schedule_flow(user_id, user_data)
    elif intent == 'add_subject':
        return await start_add_subject_flow(user_id, user_data)
    elif intent == 'get_schedule':
        return await handle_get_schedule_intent(entities, user_data, conversation_id, confidence)
    elif intent == 'general_question':
        return await handle_general_question_intent(message, user_data, conversation_id, confidence)
    else:
        # Show main menu for unclear requests
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
        return await handle_subject_difficulty_step(message, user_id, data, user_data)
    elif step == ConversationStep.ADD_SUBJECT_CATEGORY:
        return await handle_subject_category_step(message, user_id, data, user_data)
    elif step == ConversationStep.ADD_SUBJECT_HOURS:
        return await handle_subject_hours_step(message, user_id, data, user_data)
    elif step == ConversationStep.ADD_SUBJECT_PRIORITY:
        return await handle_subject_priority_step(message, user_id, data, user_data)
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
    
    # Fallback to main menu
    clear_conversation_state(user_id)
    return show_main_menu()

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
    
    update_conversation_state(user_id, ConversationStep.ADD_SUBJECT_TAGS, {**data, "priority": priority})
    
    return ChatResponse(
        response=f"✅ Priority: **{priority.title()}**\n\n**Step 7 of 7: Tags (Optional)**\n\nAdd some tags to help organize **{data['name']}**. Separate multiple tags with commas.\n\n*Examples: calculus, derivatives, limits OR programming, python, algorithms*\n\nOr type 'skip' to skip this step.",
        intent="add_subject_flow",
        confidence=1.0,
        entities={},
        actions=[],
        conversation_id=f"add_subject_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        quick_actions=[
            {"id": "skip", "label": "⏭️ Skip Tags", "icon": "skip", "message": "skip", "color": "bg-gray-600 hover:bg-gray-700 text-white"},
            {"id": "cancel", "label": "❌ Cancel", "icon": "x", "message": "main menu", "color": "bg-red-600 hover:bg-red-700 text-white"}
        ],
        suggestions=["skip", "programming, python", "calculus, math", "chemistry, lab"]
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
        # Create the subject using backend API
        try:
            subject_data = {
                "name": data['name'],
                "description": data.get('description', ''),
                "difficulty": data['difficulty'],
                "category": data['category'],
                "estimatedHours": data['estimatedHours'],
                "priority": data['priority'],
                "tags": data.get('tags', []),
                "progress": 0,
                "isCompleted": False
            }
            
            # Call backend to create subject
            result = await backend_client.post(
                f"/subjects",
                data=subject_data,
                headers={"Authorization": f"Bearer {user_data.get('token', '')}"}
            )
            
            clear_conversation_state(user_id)
            
            return ChatResponse(
                response=f"🎉 **Subject Created Successfully!**\n\n**{data['name']}** has been added to your profile!\n\nWhat would you like to do next?",
                intent="subject_created",
                confidence=1.0,
                entities={},
                actions=[{"type": "subject_created", "subject_id": result.get('subject', {}).get('_id')}],
                conversation_id=f"success_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                quick_actions=[
                    {"id": "add-another", "label": "➕ Add Another Subject", "icon": "plus", "message": "add another subject", "color": "bg-blue-600 hover:bg-blue-700 text-white"},
                    {"id": "create-schedule", "label": "📅 Create Schedule", "icon": "calendar", "message": "create schedule", "color": "bg-green-600 hover:bg-green-700 text-white"},
                    {"id": "main-menu", "label": "🏠 Main Menu", "icon": "home", "message": "main menu", "color": "bg-purple-600 hover:bg-purple-700 text-white"}
                ],
                suggestions=[
                    "Add another subject",
                    "Create a study schedule", 
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host=os.getenv('CHATBOT_HOST', '0.0.0.0'), 
        port=int(os.getenv('CHATBOT_PORT', 8000)),
        reload=os.getenv('CHATBOT_DEBUG', 'False').lower() == 'true'
    )
