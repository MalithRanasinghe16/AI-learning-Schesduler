# AI Learning Scheduler - Setup Guide

This guide will help you set up the AI Learning Scheduler project on a new device.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.9 or higher) - [Download here](https://python.org/)
- **MongoDB** - [Download here](https://www.mongodb.com/try/download/community) or use MongoDB Atlas (cloud)
- **Git** - [Download here](https://git-scm.com/)

## Project Structure

```
AI-learning-Scheduler/
├── project/
│   ├── src/                 # React frontend
│   ├── server/              # Node.js backend
│   ├── chatbot/             # Python chatbot service
│   ├── package.json         # Node.js dependencies
│   └── ...
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/MalithRanasinghe16/AI-learning-Schesduler.git
cd AI-learning-Schesduler/project
```

### 2. Frontend & Backend Setup (Node.js)

```bash
# Install Node.js dependencies
npm install

# Create environment file for backend
cp server/.env.example server/.env
```

Edit `server/.env` with your configuration:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-learning-scheduler
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### 3. Chatbot Setup (Python)

#### Option A: Using Virtual Environment (Recommended)

**On Windows:**

```bash
# Navigate to chatbot directory
cd chatbot

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Download spaCy language model
python -m spacy download en_core_web_sm

# Create environment file
copy .env.example .env
```

**On macOS/Linux:**

```bash
# Navigate to chatbot directory
cd chatbot

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Download spaCy language model
python -m spacy download en_core_web_sm

# Create environment file
cp .env.example .env
```

#### Option B: Using Conda (Alternative)

```bash
# Create conda environment
conda create -n ai-scheduler python=3.9

# Activate environment
conda activate ai-scheduler

# Navigate to chatbot directory
cd chatbot

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm
```

### 4. Configure Chatbot Environment

Edit `chatbot/.env` with your settings:

```env
BACKEND_URL=http://localhost:5000
LOG_LEVEL=INFO
SECRET_KEY=your-chatbot-secret-key
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
```

### 5. Database Setup

#### Option A: Local MongoDB

1. Install and start MongoDB locally
2. The database will be created automatically when you first run the application

#### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster and get the connection string
3. Update `MONGODB_URI` in your `server/.env` file

### 6. Running the Application

You have several options to run the application:

#### Option 1: Run All Services Together (Recommended)

```bash
# From the project root directory
npm run start:all
```

#### Option 2: Run Services Individually

**Terminal 1 - Frontend:**

```bash
npm run dev
```

**Terminal 2 - Backend:**

```bash
npm run dev:server
```

**Terminal 3 - Chatbot:**

```bash
# Windows
npm run dev:chatbot

# Or manually:
cd chatbot
.venv\Scripts\activate
python -m uvicorn main:app --reload --port 8000
```

**macOS/Linux - Chatbot:**

```bash
cd chatbot
source .venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

### 7. Verify Installation

Once all services are running, you should be able to access:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Chatbot API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Troubleshooting

### Common Issues

#### 1. Node.js Version Issues

```bash
# Check Node.js version
node --version

# Should be v18 or higher
```

#### 2. Python Virtual Environment Issues

```bash
# If virtual environment doesn't activate:
# Windows
.venv\Scripts\activate.bat

# macOS/Linux
source .venv/bin/activate
```

#### 3. spaCy Model Download Issues

```bash
# If the English model fails to download:
python -m spacy download en_core_web_sm --user
```

#### 4. MongoDB Connection Issues

- Ensure MongoDB is running if using local installation
- Check connection string format for MongoDB Atlas
- Verify network connectivity and firewall settings

#### 5. Port Conflicts

If ports are already in use, you can change them:

- Frontend: Modify `vite.config.ts`
- Backend: Change `PORT` in `server/.env`
- Chatbot: Use `--port` flag with uvicorn

### Development Commands

```bash
# Install new Node.js dependency
npm install package-name

# Install new Python dependency (with venv activated)
pip install package-name
pip freeze > requirements.txt

# Run tests
npm test

# Build for production
npm run build

# Clean cache and dependencies
npm run clean
```

## Environment Variables Summary

### Backend (.env)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-learning-scheduler
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Chatbot (.env)

```env
BACKEND_URL=http://localhost:5000
LOG_LEVEL=INFO
SECRET_KEY=your-chatbot-secret-key
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
```

## Production Deployment

For production deployment, additional steps are required:

1. Set `NODE_ENV=production` in backend
2. Configure proper database with authentication
3. Set up reverse proxy (nginx)
4. Use process manager (PM2)
5. Configure SSL certificates
6. Set up monitoring and logging

## Getting Help

If you encounter issues:

1. Check the logs in each service terminal
2. Ensure all environment variables are set correctly
3. Verify all services are running on their respective ports
4. Check the GitHub issues page for known problems

## Quick Start Script

For convenience, you can create this script to automate the setup:

**setup.sh (macOS/Linux):**

```bash
#!/bin/bash
echo "Setting up AI Learning Scheduler..."

# Install Node.js dependencies
npm install

# Setup chatbot virtual environment
cd chatbot
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Create environment files if they don't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created chatbot/.env - please configure it"
fi

cd ../server
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created server/.env - please configure it"
fi

echo "Setup complete! Configure your .env files and run 'npm run start:all'"
```

**setup.bat (Windows):**

```batch
@echo off
echo Setting up AI Learning Scheduler...

REM Install Node.js dependencies
npm install

REM Setup chatbot virtual environment
cd chatbot
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

REM Create environment files if they don't exist
if not exist .env copy .env.example .env

cd ..\server
if not exist .env copy .env.example .env

echo Setup complete! Configure your .env files and run 'npm run start:all'
pause
```
