# 🤖 AI Learning Scheduler

An intelligent learning scheduler that uses AI to optimize study sessions and track progress.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (3.8 or higher)
- **MongoDB** (Atlas or local)

### 1. Install Dependencies

```bash
npm install
cd chatbot
pip install -r requirements.txt
```

### 2. Environment Setup

Create `.env` files with your MongoDB URI and JWT secrets (see `.env.example`).

### 3. Start Services

```bash
# Terminal 1: Backend (Port 5000)
npm run dev:server

# Terminal 2: Chatbot (Port 8000)
cd chatbot
.\run_chatbot.bat

# Terminal 3: Frontend (Port 5173)
npm run dev
```

### 4. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Chatbot API**: http://localhost:8000

## 🏗️ Architecture

```
project/
├── src/              # React frontend
├── server/           # Node.js/Express backend
├── chatbot/          # Python FastAPI chatbot
└── package.json      # Project dependencies
```

## 🤖 Features

- **Smart Scheduling**: AI-powered study session optimization
- **Interactive Chatbot**: Natural language scheduling assistance
- **Progress Tracking**: Analytics and performance insights
- **User Authentication**: Secure JWT-based login system

## 🛠️ Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB
- **Chatbot**: Python + FastAPI + spaCy NLP
- **Database**: MongoDB Atlas

## 📚 API Documentation

- **Backend**: http://localhost:5000/api/docs
- **Chatbot**: http://localhost:8000/docs

## 🔧 Development

```bash
# Install new dependencies
npm install <package>
pip install <package>

# Linting
npm run lint

# Build for production
npm run build
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.
