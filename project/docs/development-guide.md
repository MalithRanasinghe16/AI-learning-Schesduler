# Development Guide

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- Python (v3.8+)
- MongoDB Atlas account
- Git

### Setup Instructions

1. **Clone and Navigate**

   ```bash
   git clone <repository-url>
   cd AI-learning-Scheduler/project
   ```

2. **Install Dependencies**

   ```bash
   npm run setup
   ```

3. **Environment Configuration**

   - Copy `.env.example` to `.env`
   - Copy `chatbot/.env.example` to `chatbot/.env`
   - Fill in your MongoDB and other credentials

4. **Start Development**
   ```bash
   npm run start:all
   ```

## 🔧 Development Workflow

### Running Individual Services

```bash
# Frontend only
npm run dev

# Backend only
npm run server

# Chatbot only
npm run dev:chatbot

# All services together
npm run start:all
```

### Available Commands

```bash
# Development
npm run dev          # Start frontend dev server
npm run dev:server   # Start backend with hot reload
npm run dev:chatbot  # Start chatbot with hot reload

# Production
npm run build        # Build frontend for production
npm run start        # Start production backend

# Utilities
npm run lint         # Run ESLint
npm run clean        # Clean build artifacts
npm run docs         # Open project documentation
```

## 📁 Working with the Structure

### Adding New Components

```
src/components/
├── YourFeature/
│   ├── YourComponent.tsx
│   ├── YourComponent.types.ts (if needed)
│   └── index.ts (barrel export)
```

### Adding New API Routes

```
server/routes/
└── your-feature.ts
```

### Adding New Types

```
src/types/
├── api/
│   └── your-feature.types.ts
└── components/
    └── your-component.types.ts
```

### Adding Constants

Update `src/constants/index.ts` with new constants.

## 🔄 Data Flow Patterns

### Frontend State Management

1. **Local State**: `useState` for component-specific data
2. **Global State**: Context API for app-wide state
3. **Server State**: Services layer for API data

### API Integration

1. Create types in `src/types/api/`
2. Add service functions in `src/services/`
3. Use in components through hooks or direct calls

### Backend Development

1. Define model in `server/models/`
2. Create routes in `server/routes/`
3. Add business logic in `server/services/`

## 🧪 Testing Strategy

### Frontend Testing

- Component testing with React Testing Library
- Integration testing for key user flows
- E2E testing for critical paths

### Backend Testing

- Unit tests for services and utilities
- Integration tests for API endpoints
- Database integration tests

### Chatbot Testing

- Unit tests for NLP components
- Integration tests for API endpoints
- Performance tests for ML models

## 📦 Deployment

### Frontend (Vite Build)

```bash
npm run build
# Deploy dist/ folder to your hosting service
```

### Backend (Node.js)

```bash
npm run start
# Use PM2 or similar for production process management
```

### Chatbot (FastAPI)

```bash
cd chatbot
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 🔍 Debugging

### Frontend Debug Tools

- React Developer Tools
- Network tab for API calls
- Console for errors and logs

### Backend Debug Tools

- Node.js debugger
- MongoDB Compass for database inspection
- Postman for API testing

### Chatbot Debug Tools

- FastAPI automatic docs at `/docs`
- Python debugger (pdb)
- Logging configuration

## 📋 Code Standards

### TypeScript/JavaScript

- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for formatting

### Python

- Follow PEP 8 style guide
- Use type hints where possible
- Document functions with docstrings

### Git Workflow

- Feature branches for new development
- Descriptive commit messages
- Pull requests for code review

## 🔧 Troubleshooting

### Common Issues

1. **Port conflicts**: Check if ports 3000, 5000, 8000 are free
2. **Environment variables**: Ensure all .env files are configured
3. **Database connection**: Verify MongoDB Atlas connection string
4. **Python environment**: Ensure virtual environment is activated

### Getting Help

- Check logs in browser console and terminal
- Review error messages carefully
- Consult project documentation
- Check GitHub issues for similar problems
