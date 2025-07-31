# 🧠 AI Learning Scheduler

An intelligent study scheduling application that uses AI to optimize learning plans based on subject priorities, deadlines, and personal preferences.

## ✨ Features

- **AI-Powered Scheduling**: Intelligent schedule generation with priority-based optimization
- **Interactive Dashboard**: Real-time analytics with daily/weekly views
- **Subject Management**: Comprehensive subject tracking with progress monitoring
- **Session Management**: Complete/mark sessions, track study time and focus scores
- **Smart Analytics**: Detailed insights into study patterns and performance
- **Responsive Design**: Modern, clean interface that works on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Python (v3.8 or higher)
- MongoDB Atlas account

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <your-repo-url>
   cd AI-learning-Scheduler/project
   \`\`\`

2. **Install all dependencies**
   \`\`\`bash
   npm run setup
   \`\`\`

3. **Configure environment variables**

   - Copy \`.env.example\` to \`.env\`
   - Copy \`chatbot/.env.example\` to \`chatbot/.env\`
   - Fill in your MongoDB connection string and other credentials

4. **Start all services**
   \`\`\`bash
   npm run start:all
   \`\`\`

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Chatbot API: http://localhost:8000

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
