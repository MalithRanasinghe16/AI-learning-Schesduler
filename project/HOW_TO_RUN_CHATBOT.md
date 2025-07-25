# 🚀 How to Run Your AI Learning Scheduler Chatbot

## 📋 **Prerequisites**

Make sure you have:

- ✅ **Node.js** (v16 or higher)
- ✅ **Python** (v3.8 or higher)
- ✅ **MongoDB** running (local or cloud)
- ✅ **Git** for version control

## 🏗️ **Project Architecture**

Your AI Learning Scheduler has **3 services** that need to run:

1. **📱 Frontend** (React + Vite) → Port 5173
2. **🔧 Backend** (Node.js + Express) → Port 5000
3. **🤖 Chatbot** (Python + FastAPI) → Port 8000

## 🚀 **Step-by-Step Setup**

### **Step 1: Install Dependencies**

#### **📦 Install Node.js Dependencies**

```bash
cd "C:\Users\T.M.Malith Sandeepa\OneDrive\Desktop\Projects\AI-learning-Schesduler\project"
npm install
```

#### **🐍 Setup Python Virtual Environment**

```bash
cd chatbot

# Create virtual environment (if not exists)
python -m venv chatbot_env

# Activate virtual environment
chatbot_env\Scripts\activate

# Install Python packages
pip install -r requirements.txt

# Download spaCy language model
python -m spacy download en_core_web_sm
```

### **Step 2: Configure Environment Variables**

#### **📄 Create .env files**

**Main Project .env** (`project/.env`):

```env
# Database
MONGODB_URI=mongodb://localhost:27017/ai-learning-scheduler
DB_NAME=ai-learning-scheduler

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
```

**Chatbot .env** (`project/chatbot/.env`):

```env
# FastAPI Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=true
LOG_LEVEL=INFO

# JWT Configuration (must match main project)
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_ALGORITHM=HS256

# Backend API
BACKEND_API_URL=http://localhost:5000/api
BACKEND_TIMEOUT=30

# NLP Configuration
SPACY_MODEL=en_core_web_sm
CONFIDENCE_THRESHOLD=0.7
```

### **Step 3: Start the Services**

You need **3 separate terminals**:

#### **🖥️ Terminal 1: Start Backend (Node.js)**

```bash
cd "C:\Users\T.M.Malith Sandeepa\OneDrive\Desktop\Projects\AI-learning-Schesduler\project"
npm run dev:server
```

**Expected Output:**

```
🚀 Server running on port 5000
📊 Database connected successfully
✅ All routes loaded
```

#### **🖥️ Terminal 2: Start Frontend (React)**

```bash
cd "C:\Users\T.M.Malith Sandeepa\OneDrive\Desktop\Projects\AI-learning-Schesduler\project"
npm run dev
```

**Expected Output:**

```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  ready in 1.2s
```

#### **🖥️ Terminal 3: Start Chatbot (Python)**

```bash
cd "C:\Users\T.M.Malith Sandeepa\OneDrive\Desktop\Projects\AI-learning-Schesduler\project\chatbot"

# Activate virtual environment
chatbot_env\Scripts\activate

# Start chatbot service
python main.py
```

**Expected Output:**

```
INFO:     Will watch for changes in these directories: ['/path/to/chatbot']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

## 🔍 **Verify Everything is Running**

### **✅ Check Service Health**

1. **Backend Health Check:**

   ```bash
   curl http://localhost:5000/api/health
   # Expected: {"status":"healthy","timestamp":"..."}
   ```

2. **Chatbot Health Check:**

   ```bash
   curl http://localhost:8000/health
   # Expected: {"status":"healthy","services":{"nlp_processor":"ready"...}}
   ```

3. **Frontend:** Open browser → http://localhost:5173

### **🧪 Test the Complete Flow**

1. **Open Frontend:** http://localhost:5173
2. **Register/Login** with test credentials
3. **Click Chat Icon** (blue chat button in bottom-right)
4. **Try Quick Actions:**
   - Click "Create Schedule"
   - Click "View Schedule"
   - Try typing: "Create schedule for math and physics"

## 🚨 **Troubleshooting Common Issues**

### **❌ "Cannot connect to chatbot service"**

```bash
# Check if chatbot is running
curl http://localhost:8000/health

# If not running, start it:
cd chatbot
chatbot_env\Scripts\activate
python main.py
```

### **❌ "Database connection failed"**

```bash
# Check if MongoDB is running
net start MongoDB
# OR start MongoDB Compass/Service
```

### **❌ "ModuleNotFoundError: No module named 'spacy'"**

```bash
cd chatbot
chatbot_env\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### **❌ "Port already in use"**

```bash
# Kill processes on ports
netstat -ano | findstr :5000
netstat -ano | findstr :8000
netstat -ano | findstr :5173

# Kill process (replace PID with actual number)
taskkill /PID <PID> /F
```

### **❌ "Authentication error"**

Make sure JWT_SECRET is the same in both `.env` files:

- `project/.env`
- `project/chatbot/.env`

## 📱 **Using the Chatbot**

### **🎯 Quick Actions Available:**

- 🗓️ **Create Schedule** → Creates new study schedules
- 👁️ **View Schedule** → Shows current schedules
- ➕ **Add Subject** → Adds new subjects
- 📊 **View Progress** → Shows analytics

### **💬 Example Conversations:**

```
User: [Clicks "Create Schedule"]
Bot: "Which subjects would you like to include?"
     [My Subjects] [Add Subject]

User: [Clicks "My Subjects"]
Bot: "Here are your subjects: Math, Physics..."
     [This Week] [Next Week]

User: [Clicks "This Week"]
Bot: "Great! I'll create a schedule for this week."
     [View Schedule] [Modify]
```

## 🔄 **Development Workflow**

### **For Active Development:**

```bash
# Terminal 1: Backend with auto-reload
npm run dev:server

# Terminal 2: Frontend with hot reload
npm run dev

# Terminal 3: Chatbot with auto-reload
cd chatbot
chatbot_env\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### **For Production:**

```bash
# Build frontend
npm run build

# Start backend
npm start

# Start chatbot
cd chatbot
python main.py
```

## 📊 **Service URLs**

| Service         | URL                        | Purpose                       |
| --------------- | -------------------------- | ----------------------------- |
| **Frontend**    | http://localhost:5173      | Main web interface            |
| **Backend API** | http://localhost:5000/api  | REST API endpoints            |
| **Chatbot API** | http://localhost:8000      | AI chatbot service            |
| **API Docs**    | http://localhost:8000/docs | Interactive API documentation |

## 🎉 **Success! Your Chatbot is Running**

When everything is working:

- ✅ Frontend loads at http://localhost:5173
- ✅ You can login/register users
- ✅ Blue chat icon appears in bottom-right
- ✅ Clicking chat icon opens chatbot widget
- ✅ Quick action buttons work
- ✅ Bot responds to messages with "Thinking..." then actual responses
- ✅ Suggestions and contextual actions appear

Your AI Learning Scheduler with chatbot is now fully operational! 🚀🤖
