# 🤖 AI Learning Scheduler - Chatbot Service

FastAPI-based chatbot service with NLP capabilities for the AI Learning Scheduler.

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Start the service
.\run_chatbot.bat
```

## 🔧 Features

- **Natural Language Processing**: spaCy-powered intent recognition
- **JWT Authentication**: Secure user verification
- **Smart Responses**: Context-aware study assistance
- **Quick Actions**: Predefined user options

## 🛠️ Tech Stack

- **Framework**: FastAPI
- **NLP**: spaCy (en_core_web_sm)
- **Auth**: JWT tokens
- **ML**: scikit-learn

## 📚 API Endpoints

- `POST /chat` - Process chat messages
- `GET /docs` - API documentation
- `GET /health` - Health check

## 🔗 Integration

The chatbot integrates with the main backend on port 5000 for user authentication and data access.
