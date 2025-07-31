# Project Structure Documentation

## 📁 Project Organization

### Root Directory

```
project/
├── 📁 config/          # Configuration files
├── 📁 docs/            # Project documentation
├── 📁 scripts/         # Utility scripts (start_all.bat, etc.)
├── 📁 src/             # Frontend source code
├── 📁 server/          # Backend source code
├── 📁 chatbot/         # Python chatbot service
├── 📁 dist/            # Built frontend files
└── 📁 node_modules/    # Dependencies
```

### Frontend Structure (`src/`)

```
src/
├── 📁 components/      # Reusable UI components
│   ├── Auth/          # Authentication components
│   ├── Chat/          # Chat-related components
│   ├── Common/        # Shared components
│   ├── Dashboard/     # Dashboard-specific components
│   └── Layout/        # Layout components (Navbar, etc.)
├── 📁 contexts/       # React contexts for state management
├── 📁 constants/      # App constants and configuration
├── 📁 hooks/          # Custom React hooks
├── 📁 pages/          # Main page components
├── 📁 services/       # API services and external integrations
├── 📁 types/          # TypeScript type definitions
│   ├── api/          # API-related types
│   └── components/   # Component-specific types
└── 📁 utils/          # Utility functions
```

### Backend Structure (`server/`)

```
server/
├── 📁 config/         # Database and app configuration
├── 📁 middleware/     # Express middleware
├── 📁 models/         # Database models (MongoDB/Mongoose)
├── 📁 routes/         # API route handlers
└── 📁 services/       # Business logic services
```

### Chatbot Structure (`chatbot/`)

```
chatbot/
├── 📁 models/         # AI/ML models
├── 📁 __pycache__/    # Python cache
├── 📁 chatbot_env/    # Virtual environment
├── 🐍 *.py           # Python modules
├── 📄 requirements.txt # Python dependencies
└── 🦇 *.bat          # Startup scripts
```

## 🔄 Data Flow

### Frontend → Backend

1. User interactions in React components
2. API calls through services layer
3. Express routes handle requests
4. Business logic in services
5. Database operations through models

### Frontend → Chatbot

1. Chat component sends messages
2. Python FastAPI receives requests
3. NLP processing and intent classification
4. Response generation and prioritization
5. Results sent back to frontend

### Backend → Chatbot

1. Backend requests AI scheduling
2. Chatbot processes subject priorities
3. Schedule generation with optimization
4. Results returned to backend
5. Stored in database and sent to frontend

## 📋 File Naming Conventions

### Frontend

- **Components**: PascalCase (e.g., `DashboardPage.tsx`)
- **Services**: camelCase (e.g., `analyticsService.ts`)
- **Types**: camelCase with descriptive names (e.g., `index.ts`)
- **Constants**: UPPER_SNAKE_CASE for values (e.g., `API_BASE_URL`)

### Backend

- **Routes**: kebab-case (e.g., `schedule-sessions.ts`)
- **Models**: PascalCase (e.g., `ScheduleSession.ts`)
- **Services**: camelCase (e.g., `scheduleGenerator.ts`)

### Chatbot

- **Modules**: snake_case (e.g., `intent_classifier.py`)
- **Classes**: PascalCase (e.g., `PrioritizationEngine`)

## 🔧 Key Design Patterns

### Frontend

- **Component Composition**: Breaking down complex UI into smaller components
- **Context Pattern**: Managing global state (Auth, Schedule)
- **Service Layer**: Abstracting API calls and external services
- **Custom Hooks**: Reusable stateful logic

### Backend

- **MVC Pattern**: Models, Routes (Controllers), Services
- **Middleware Pattern**: Authentication, validation, error handling
- **Repository Pattern**: Database abstraction through models

### Chatbot

- **Strategy Pattern**: Different prioritization strategies
- **Factory Pattern**: Creating different types of schedules
- **Observer Pattern**: Event-driven responses

## 🚀 Getting Started

### Development Setup

1. Install dependencies: `npm install`
2. Setup chatbot: `cd chatbot && pip install -r requirements.txt`
3. Start all services: `scripts/start_all.bat`

### Available Scripts

- `npm run dev` - Start frontend development server
- `npm run server` - Start backend server
- `npm run dev:chatbot` - Start chatbot service
- `scripts/start_all.bat` - Start all services together

## 📝 Notes

- All working functionality has been preserved during restructuring
- New folder structure improves maintainability and scalability
- Constants file centralizes configuration for easier management
- Documentation helps new developers understand the project quickly
