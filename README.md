# 🧠 AI Learning Scheduler

An intelligent study scheduling application that uses AI to optimize learning plans based on subject priorities, deadlines, and personal preferences. Features an intelligent chatbot that understands natural language for seamless interaction.

## ✨ Features

- **🤖 Intelligent Chatbot**: Natural language processing for intuitive interaction
- **🧠 AI-Powered Scheduling**: Smart schedule generation with priority-based optimization
- **📊 Interactive Dashboard**: Real-time analytics with daily/weekly views
- **📚 Subject Management**: Comprehensive subject tracking with progress monitoring
- **⏱️ Session Management**: Complete/mark sessions, track study time and focus scores
- **📈 Smart Analytics**: Detailed insights into study patterns and performance
- **📱 Responsive Design**: Modern, clean interface that works on all devices
- **🎯 Contextual Suggestions**: AI provides personalized study recommendations

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

**Windows:**

```bash
# Clone the repository
git clone https://github.com/MalithRanasinghe16/AI-learning-Schesduler.git
cd AI-learning-Schesduler/project

# Run automated setup
setup.bat
```

**macOS/Linux:**

```bash
# Clone the repository
git clone https://github.com/MalithRanasinghe16/AI-learning-Schesduler.git
cd AI-learning-Schesduler/project

# Make setup script executable and run
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

#### Prerequisites

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.9 or higher) - [Download](https://python.org/)
- **MongoDB** - [Local](https://www.mongodb.com/try/download/community) or [Atlas](https://www.mongodb.com/atlas)

#### Step-by-step Installation

1. **Clone and navigate**

   ```bash
   git clone https://github.com/MalithRanasinghe16/AI-learning-Schesduler.git
   cd AI-learning-Schesduler/project
   ```

2. **Install Node.js dependencies**

   ```bash
   npm install
   ```

3. **Setup Python environment**

   **Windows:**

   ```bash
   cd chatbot
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   cd ..
   ```

   **macOS/Linux:**

   ```bash
   cd chatbot
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   cd ..
   ```

4. **Configure environment variables**

   Create `server/.env`:

   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ai-learning-scheduler
   JWT_SECRET=your-super-secret-jwt-key-here
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   ```

   Create `chatbot/.env`:

   ```env
   BACKEND_URL=http://localhost:5000
   LOG_LEVEL=INFO
   SECRET_KEY=your-chatbot-secret-key
   ```

5. **Start the application**

   **Option A: All services together**

   ```bash
   npm run start:all
   ```

   **Option B: Individual terminals**

   ```bash
   # Terminal 1 - Frontend
   npm run dev

   # Terminal 2 - Backend
   npm run dev:server

   # Terminal 3 - Chatbot
   npm run dev:chatbot  # Windows
   npm run dev:chatbot:unix  # macOS/Linux
   ```

## 📁 Project Structure

```
AI-learning-Scheduler/
├── project/
│   ├── src/                     # React frontend
│   │   ├── components/          # UI components
│   │   ├── contexts/           # React contexts
│   │   ├── services/           # API services
│   │   └── types/              # TypeScript types
│   ├── server/                 # Node.js backend
│   │   ├── config/             # Database config
│   │   ├── middleware/         # Express middleware
│   │   ├── models/             # Database models
│   │   ├── routes/             # API routes
│   │   └── services/           # Business logic
│   ├── chatbot/                # Python chatbot service
│   │   ├── models/             # AI models
│   │   ├── main.py             # FastAPI application
│   │   ├── requirements.txt    # Python dependencies
│   │   └── .venv/              # Python virtual environment
│   ├── package.json            # Node.js dependencies
│   ├── SETUP.md               # Detailed setup guide
│   ├── setup.bat              # Windows setup script
│   └── setup.sh               # macOS/Linux setup script
```

## 🌐 Application URLs

Once running, access the application at:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Chatbot API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 💬 Using the Chatbot

The AI chatbot understands natural language! Try these examples:

- _"Schedule 2 hours of math study for tomorrow"_
- _"What should I study next?"_
- _"Show my progress in physics"_
- _"Add a new subject called Chemistry"_
- _"Create a study schedule for this week"_

For structured options, simply type: **"show menu"**

## 📁 Project Structure

\`\`\`
project/
├── 📁 config/ # Configuration files
├── 📁 docs/ # Documentation
├── 📁 scripts/ # Utility scripts
├── 📁 src/ # Frontend (React + TypeScript)
├── 📁 server/ # Backend (Node.js + Express)
├── 📁 chatbot/ # AI Service (Python + FastAPI)
└── 📁 dist/ # Production build
\`\`\`

## 🛠️ Development

### Available Scripts

\`\`\`bash

# Development

npm run dev # Start frontend dev server
npm run dev:server # Start backend with hot reload
npm run dev:chatbot # Start chatbot service
npm run start:all # Start all services together

# Production

npm run build # Build for production
npm run start # Start production server

# Utilities

npm run lint # Run ESLint
npm run clean # Clean build artifacts
npm run docs # Open documentation
\`\`\`

### Tech Stack

**Frontend:**

- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- Chart.js for analytics visualization

**Backend:**

- Node.js with Express
- TypeScript
- MongoDB with Mongoose
- JWT authentication
- RESTful API design

**AI Service:**

- Python with FastAPI
- Natural Language Processing
- Priority-based scheduling algorithms
- Machine learning for optimization

## 📖 Documentation

- [Project Structure](docs/project-structure.md) - Detailed project organization
- [Development Guide](docs/development-guide.md) - Development workflows and standards
- [Chatbot Implementation](docs/chatbot-prioritization.md) - AI scheduling details

## 🎯 Key Features Explained

### Smart Scheduling

The AI chatbot analyzes your subjects, deadlines, and preferences to create optimized study schedules that maximize learning efficiency.

### Real-Time Analytics

Track your progress with comprehensive analytics including:

- Daily/weekly study time
- Session completion rates
- Focus scores and trends
- Subject-wise progress tracking

### Interactive Dashboard

- Clean, modern interface
- Keyboard shortcuts for power users
- Responsive design for all devices
- Real-time data updates

### Session Management

- Mark sessions as completed
- Track actual study time vs planned
- Monitor focus and productivity scores
- View detailed session history

## 🔧 Configuration

### Environment Variables

**Main Application (.env):**
\`\`\`
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
\`\`\`

**Chatbot Service (chatbot/.env):**
\`\`\`
BACKEND_URL=http://localhost:5000
MONGODB_URI=your_mongodb_connection_string
\`\`\`

## 🚦 API Documentation

The backend provides RESTful APIs for:

- Authentication (\`/api/auth\`)
- Subjects management (\`/api/subjects\`)
- Schedule management (\`/api/schedules\`)
- Session tracking (\`/api/schedule-sessions\`)
- Analytics (\`/api/analytics\`)

API documentation is available at \`http://localhost:5000/api/docs\` when running the server.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by the need for intelligent study planning
- Powered by AI for optimal learning outcomes

---

**Happy Learning! 🎓**
