# 🤖 AI Learning Scheduler

An intelligent learning scheduler with AI-powered chatbot assistance for optimizing study sessions and tracking progress.

## ⚡ Quick Start

```bash
# One command to start everything
.\start_all.bat
```

## 🏗️ Project Structure

```
AI-learning-Scheduler/
├── 📄 README.md           # Project documentation
├── 🚀 start_all.bat       # One-click startup
├── 📦 package.json        # Node.js dependencies
├── 🔧 .env               # Environment variables
│
├── 📂 src/               # React Frontend (Port 5173)
│   ├── components/       # UI components
│   ├── contexts/         # React contexts
│   └── services/         # API services
│
├── 📂 server/            # Node.js Backend (Port 5000)
│   ├── models/           # Database models
│   ├── routes/           # API endpoints
│   └── middleware/       # Auth & validation
│
└── � chatbot/           # Python AI Service (Port 8000)
    ├── main.py           # FastAPI app
    ├── �🚀 run_chatbot.ps1 # Quick start script
    └── requirements.txt  # Python dependencies
```

## 🚀 Manual Setup (if needed)

### Prerequisites

- **Node.js** (v18+)
- **Python** (3.8+)
- **MongoDB** (Atlas or local)

### 1. Install Dependencies

```bash
npm install
cd chatbot && pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update with your MongoDB URI.

### 3. Start Services

```bash
# Start all services with one command
.\start_all.bat

# OR start individually:
npm run dev:server    # Backend
npm run dev          # Frontend
cd chatbot && .\run_chatbot.ps1  # Chatbot
```

## 🌟 Features

- **Smart Scheduling**: AI-powered study session optimization
- **Interactive Chatbot**: Natural language scheduling with quick actions
- **Progress Analytics**: Study performance insights and tracking
- **User Authentication**: Secure JWT-based authentication
- **Real-time Updates**: Live sync across all services

## 🛠️ Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB
- **Chatbot**: Python + FastAPI + spaCy NLP
- **Database**: MongoDB Atlas

## 📚 API Endpoints

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Chatbot API**: http://localhost:8000/docs

## 🔧 Development

```bash
# Install new dependencies
npm install <package>              # Frontend/Backend
cd chatbot && pip install <package> # Chatbot

# Code quality
npm run lint                       # Linting
npm run build                      # Production build
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.
