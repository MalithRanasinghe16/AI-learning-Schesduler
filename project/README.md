# AI Learning Scheduler

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.3.1-blue.svg)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Frontend Components](#frontend-components)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [AI Scheduling Engine](#ai-scheduling-engine)
- [Analytics & Progress Tracking](#analytics--progress-tracking)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## 🎯 Overview

The **AI Learning Scheduler** is an intelligent study planning application that leverages artificial intelligence to create personalized study schedules for students and learners. The application analyzes user preferences, subject priorities, estimated study hours, and learning goals to generate optimized study sessions that maximize learning efficiency.

### Key Objectives

- **Personalized Learning**: Create custom study schedules based on individual learning preferences
- **AI-Powered Optimization**: Use intelligent algorithms to optimize study session timing and distribution
- **Progress Tracking**: Monitor learning progress with detailed analytics and insights
- **Adaptive Scheduling**: Dynamically adjust schedules based on performance and completion rates
- **User-Friendly Interface**: Provide an intuitive and responsive web interface

## ✨ Features

### 🎓 Core Learning Features

- **Smart Schedule Generation**: AI-powered algorithm creates optimized study schedules
- **Subject Management**: Add, edit, and prioritize subjects with estimated study hours
- **Session Tracking**: Track study session status (scheduled, in-progress, completed, missed)
- **Progress Analytics**: Detailed progress tracking with completion rates and study time analytics
- **Adaptive Recommendations**: AI adjusts future schedules based on performance patterns

### 📊 Analytics & Insights

- **Dashboard Analytics**: Comprehensive overview of study progress and performance
- **Schedule-Specific Metrics**: Track completion rates, study time, and daily averages per schedule
- **Visual Progress Charts**: Interactive charts showing study patterns and trends
- **Session Reminders**: Smart notifications for upcoming study sessions
- **Performance Insights**: AI-generated insights to improve study efficiency

### 🔧 Technical Features

- **Real-time Updates**: Live session status updates and progress tracking
- **Responsive Design**: Mobile-friendly interface that works on all devices
- **Secure Authentication**: JWT-based authentication with password encryption
- **Context Management**: Global state management for seamless user experience
- **Health Monitoring**: Backend health checks and status indicators

## 🛠 Technology Stack

### Frontend
- **React 18.3.1**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development with full TypeScript support
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Vite**: Fast build tool and development server
- **React Router**: Client-side routing for single-page application
- **Context API**: Global state management for user data and schedules
- **Lucide React**: Beautiful and consistent icon library
- **React Toastify**: Elegant toast notifications
- **Recharts**: Interactive charts and data visualization
- **Date-fns**: Modern date utility library

### Backend
- **Node.js**: JavaScript runtime for server-side development
- **Express.js**: Fast and minimal web framework
- **TypeScript**: Type-safe backend development
- **MongoDB**: NoSQL database for flexible data storage
- **Mongoose**: Elegant MongoDB object modeling
- **JWT**: Secure token-based authentication
- **bcryptjs**: Password hashing and security
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security middleware for Express
- **Rate Limiting**: API rate limiting for security

### Development Tools
- **ESLint**: Code linting and quality assurance
- **Prettier**: Code formatting and consistency
- **tsx**: TypeScript execution for development
- **Autoprefixer**: CSS vendor prefixing
- **PostCSS**: CSS processing and optimization

## 🏗 Architecture

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (React/TS)    │◄──►│   (Node/Express)│◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • Authentication│    │ • Users         │
│ • Schedule View │    │ • API Routes    │    │ • Subjects      │
│ • Analytics     │    │ • AI Scheduler  │    │ • Schedules     │
│ • Subject Mgmt  │    │ • Middleware    │    │ • Sessions      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Architecture

```
src/
├── components/
│   ├── Auth/              # Authentication components
│   ├── Dashboard/         # Dashboard and analytics
│   ├── Schedule/          # Schedule management
│   ├── Layout/           # Layout and navigation
│   └── Common/           # Shared components
├── contexts/             # React Context providers
├── services/            # API and external services
├── types/              # TypeScript type definitions
└── utils/             # Utility functions
```

### Backend Architecture

```
server/
├── routes/             # API route handlers
├── models/            # Database models (Mongoose)
├── services/          # Business logic and AI engine
├── middleware/        # Express middleware
├── config/           # Configuration files
└── server.ts         # Main server file
```

## ⚙️ Installation

### Prerequisites

- **Node.js** 16.0.0 or higher
- **npm** or **yarn** package manager
- **MongoDB** database (local or cloud)
- **Git** for version control

### Step-by-Step Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/ai-learning-scheduler.git
   cd ai-learning-scheduler
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```

4. **Configure Environment Variables** (See [Configuration](#configuration))

5. **Start MongoDB**
   ```bash
   # For local MongoDB
   mongod
   
   # Or use MongoDB Atlas (cloud)
   ```

6. **Start the Application**
   ```bash
   # Development mode (frontend + backend)
   npm run dev        # Frontend (Vite dev server)
   npm run dev:server # Backend (Express server)
   
   # Production mode
   npm run build
   npm start
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ai-learning-scheduler
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/dbname

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# AI Scheduler Configuration
AI_SCHEDULER_ENABLED=true
DEFAULT_SESSION_DURATION=90
DEFAULT_BREAK_DURATION=15
```

### Database Configuration

The application supports both local MongoDB and MongoDB Atlas:

**Local MongoDB:**
```env
MONGODB_URI=mongodb://localhost:27017/ai-learning-scheduler
```

**MongoDB Atlas (Cloud):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-learning-scheduler
```

## 🚀 Usage

### 1. User Registration & Authentication

1. **Register**: Create a new account with email and password
2. **Login**: Authenticate using registered credentials
3. **Profile Setup**: Configure learning preferences and goals

### 2. Subject Management

1. **Add Subjects**: Create subjects with names, descriptions, and priority levels
2. **Set Estimates**: Define estimated study hours for each subject
3. **Prioritize**: Assign priority levels (High, Medium, Low)
4. **Track Progress**: Monitor completion percentage for each subject

### 3. Schedule Generation

1. **Select Subjects**: Choose subjects to include in the schedule
2. **Set Preferences**: Configure daily study hours, session duration, and preferred times
3. **Generate Schedule**: Let the AI create an optimized study schedule
4. **Review & Adjust**: Review generated sessions and make manual adjustments

### 4. Study Session Management

1. **View Schedule**: See daily, weekly, or monthly schedule views
2. **Start Sessions**: Mark sessions as started when beginning study
3. **Complete Sessions**: Mark sessions as completed when finished
4. **Track Time**: Monitor actual time spent vs. planned time
5. **Session Notes**: Add notes and feedback for each session

### 5. Analytics & Progress Tracking

1. **Dashboard Overview**: View overall progress and statistics
2. **Schedule Analytics**: Analyze performance for specific schedules
3. **Progress Charts**: Visualize study patterns and trends
4. **Performance Insights**: Get AI-powered recommendations for improvement

## 📡 API Documentation

### Authentication Endpoints

```typescript
POST /api/auth/register
// Register a new user
{
  firstName: string,
  lastName: string,
  email: string,
  password: string
}

POST /api/auth/login
// Login user
{
  email: string,
  password: string
}

GET /api/auth/user
// Get current user profile
Authorization: Bearer <token>

POST /api/auth/logout
// Logout user
Authorization: Bearer <token>
```

### Subject Management

```typescript
GET /api/subjects
// Get all subjects for authenticated user
Authorization: Bearer <token>

POST /api/subjects
// Create a new subject
{
  name: string,
  description?: string,
  estimatedHours: number,
  priority: 'high' | 'medium' | 'low',
  tags?: string[]
}

PUT /api/subjects/:id
// Update subject
{
  name?: string,
  description?: string,
  estimatedHours?: number,
  priority?: string,
  progress?: number
}

DELETE /api/subjects/:id
// Delete subject
Authorization: Bearer <token>
```

### Schedule Management

```typescript
GET /api/schedules
// Get all schedules for user
Authorization: Bearer <token>

POST /api/schedules/generate
// Generate new AI schedule
{
  subjectIds: string[],
  preferences: {
    dailyStudyHours: number,
    preferredTimeSlots: string[],
    sessionDuration: number,
    breakDuration: number
  },
  startDate: string,
  endDate: string
}

GET /api/schedules/:id/sessions
// Get sessions for specific schedule
Authorization: Bearer <token>

PATCH /api/schedule-sessions/:id/status
// Update session status
{
  status: 'scheduled' | 'in-progress' | 'completed' | 'missed'
}
```

### Analytics

```typescript
GET /api/analytics/dashboard
// Get dashboard analytics
Authorization: Bearer <token>

GET /api/analytics/schedule/:scheduleId
// Get analytics for specific schedule
Authorization: Bearer <token>

GET /api/analytics/sessions/today
// Get today's sessions
Authorization: Bearer <token>
```

## 🧩 Frontend Components

### Core Components

#### 1. Dashboard Component
```typescript
// Location: src/components/Dashboard/Dashboard.tsx
// Purpose: Main dashboard with analytics and session overview
// Features:
// - Schedule-specific analytics
// - Today's sessions management
// - Progress tracking
// - Start/Complete session actions
```

#### 2. SchedulePage Component
```typescript
// Location: src/components/Schedule/SchedulePage.tsx
// Purpose: Schedule management and generation
// Features:
// - Schedule selection dropdown
// - AI schedule generation modal
// - Session reminders
// - Analytics toggle
```

#### 3. SimpleScheduleView Component
```typescript
// Location: src/components/Schedule/SimpleScheduleView.tsx
// Purpose: Display and interact with schedule sessions
// Features:
// - Daily session view
// - Session status management
// - Drag-and-drop rescheduling
// - Session details modal
```

#### 4. Subjects Component
```typescript
// Location: src/components/Dashboard/Subjects.tsx
// Purpose: Subject management interface
// Features:
// - Add/edit/delete subjects
// - Progress tracking
// - Priority management
// - Subject analytics
```

### Context Providers

#### AuthContext
```typescript
// Location: src/contexts/AuthContext.tsx
// Purpose: Global authentication state management
// Features:
// - User authentication
// - Login/logout functionality
// - Token management
// - Protected route handling
```

#### ScheduleContext
```typescript
// Location: src/contexts/ScheduleContext.tsx
// Purpose: Global schedule state management
// Features:
// - Selected schedule tracking
// - Cross-component schedule sharing
// - Local storage persistence
// - Schedule synchronization
```

## 💾 Database Schema

### User Model
```typescript
{
  _id: ObjectId,
  firstName: string,
  lastName: string,
  email: string,
  password: string, // Hashed with bcrypt
  learningPreferences: {
    dailyStudyGoal: number,
    preferredTimeSlots: string[],
    difficultyLevel: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Subject Model
```typescript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to User
  name: string,
  description: string,
  estimatedHours: number,
  priority: 'high' | 'medium' | 'low',
  tags: string[],
  progress: number, // 0-100
  createdAt: Date,
  updatedAt: Date
}
```

### Schedule Model
```typescript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to User
  name: string,
  description: string,
  startDate: Date,
  endDate: Date,
  status: 'active' | 'completed' | 'paused',
  scheduleType: 'real' | 'demo' | 'template',
  preferences: {
    dailyStudyHours: number,
    preferredTimeSlots: string[],
    sessionDuration: number,
    breakDuration: number
  },
  totalSessions: number,
  completedSessions: number,
  createdAt: Date,
  updatedAt: Date
}
```

### ScheduleSession Model
```typescript
{
  _id: ObjectId,
  scheduleId: ObjectId, // Reference to Schedule
  subjectId: ObjectId, // Reference to Subject
  userId: ObjectId, // Reference to User
  title: string,
  description: string,
  startTime: Date,
  endTime: Date,
  duration: number, // in minutes
  status: 'scheduled' | 'in-progress' | 'completed' | 'missed',
  priority: number,
  actualDuration: number,
  notes: string,
  tags: string[],
  createdAt: Date,
  updatedAt: Date
}
```

## 🔐 Authentication

### JWT Implementation

The application uses JSON Web Tokens (JWT) for secure authentication:

1. **Token Generation**: Upon successful login, server generates JWT with user ID
2. **Token Storage**: Frontend stores token in localStorage
3. **Request Authorization**: Token sent in Authorization header for protected routes
4. **Token Validation**: Middleware validates token on each protected request
5. **Token Expiration**: Tokens expire after 7 days (configurable)

### Security Features

- **Password Hashing**: bcryptjs with salt rounds for secure password storage
- **Rate Limiting**: API requests limited to prevent abuse
- **CORS Protection**: Configured CORS policies for secure cross-origin requests
- **Helmet Security**: Security headers protection
- **Input Validation**: Request validation middleware

### Protected Routes

All API endpoints except authentication routes require valid JWT:
- `/api/subjects/*`
- `/api/schedules/*`
- `/api/schedule-sessions/*`
- `/api/analytics/*`

## 🤖 AI Scheduling Engine

### Algorithm Overview

The AI Scheduling Engine uses intelligent algorithms to create optimized study schedules:

#### 1. Input Analysis
- **Subject Properties**: Priority, estimated hours, current progress
- **User Preferences**: Daily study goals, preferred time slots, session duration
- **Constraints**: Start/end dates, break requirements, daily limits

#### 2. Optimization Strategy
```typescript
// Core optimization factors:
- Subject priority weighting
- Spaced repetition principles
- Optimal learning time distribution
- Break and rest period scheduling
- Workload balancing across days
```

#### 3. Session Generation
```typescript
interface SessionGenerationParams {
  subjects: Subject[];
  preferences: UserPreferences;
  timeConstraints: TimeConstraints;
  optimizationGoals: OptimizationGoals;
}
```

#### 4. Adaptive Learning
- **Performance Tracking**: Monitor completion rates and study effectiveness
- **Dynamic Adjustment**: Modify future schedules based on performance patterns
- **Difficulty Balancing**: Adjust session difficulty and frequency
- **Time Optimization**: Learn optimal study times for individual users

### Scheduling Features

- **Smart Distribution**: Evenly distribute subjects across available time
- **Priority Handling**: High-priority subjects get optimal time slots
- **Break Management**: Automatic break insertion between sessions
- **Conflict Resolution**: Intelligent handling of scheduling conflicts
- **Flexibility**: Support for manual adjustments and rescheduling

## 📈 Analytics & Progress Tracking

### Dashboard Analytics

#### 1. Overall Progress Metrics
- **Total Study Time**: Accumulated hours across all sessions
- **Completion Rate**: Percentage of completed vs. scheduled sessions
- **Daily Average**: Average study time per day
- **Subject Progress**: Individual subject completion percentages

#### 2. Schedule-Specific Analytics
```typescript
interface ScheduleAnalytics {
  completionRate: number;
  sessionsCompleted: number;
  totalSessions: number;
  totalStudyTime: number; // in minutes
  dailyAverage: number; // minutes per day
  subjectBreakdown: SubjectProgress[];
  performanceTrends: PerformanceTrend[];
}
```

#### 3. Visual Analytics
- **Progress Charts**: Interactive charts showing study patterns
- **Time Distribution**: Visual breakdown of time spent per subject
- **Completion Trends**: Progress tracking over time
- **Performance Heatmaps**: Visual representation of study intensity

### Performance Insights

#### AI-Generated Recommendations
- **Optimal Study Times**: Identify most productive time periods
- **Subject Rotation**: Suggest optimal subject switching patterns
- **Break Optimization**: Recommend ideal break durations and timing
- **Difficulty Progression**: Suggest progression from easier to harder topics

## 👨‍💻 Development

### Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd ai-learning-scheduler
   npm install
   ```

2. **Start Development Servers**
   ```bash
   # Terminal 1: Backend
   npm run dev:server
   
   # Terminal 2: Frontend
   npm run dev
   ```

3. **Access Application**
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:5000`

### Development Scripts

```bash
# Frontend Development
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Backend Development
npm run server       # Start Express server
npm run dev:server   # Start with auto-reload

# Code Quality
npm run lint         # ESLint code checking
npm run type-check   # TypeScript type checking
```

### Code Structure Guidelines

#### Frontend Structure
```
src/
├── components/
│   ├── Auth/              # Authentication components
│   ├── Dashboard/         # Dashboard and analytics
│   ├── Schedule/          # Schedule management
│   ├── Layout/           # Navigation and layout
│   └── Common/           # Shared components
├── contexts/             # React Context providers
├── services/            # API services and utilities
├── types/              # TypeScript type definitions
├── utils/             # Helper functions
└── assets/           # Static assets
```

#### Backend Structure
```
server/
├── routes/             # Express route handlers
├── models/            # Mongoose database models
├── services/          # Business logic services
├── middleware/        # Express middleware
├── config/           # Configuration files
└── utils/           # Server utilities
```

### Coding Standards

#### TypeScript Usage
- **Strict Type Checking**: All components must be properly typed
- **Interface Definitions**: Define interfaces for all data structures
- **Generic Types**: Use generics for reusable components
- **Type Guards**: Implement type guards for runtime type checking

#### React Best Practices
- **Functional Components**: Use function components with hooks
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Error Boundaries**: Implement error boundaries for error handling
- **Performance Optimization**: Use memo, useCallback, useMemo appropriately

#### Code Quality
- **ESLint Configuration**: Follow ESLint rules for code consistency
- **Prettier Formatting**: Use Prettier for code formatting
- **Component Documentation**: Document component props and usage
- **Error Handling**: Implement comprehensive error handling

## 🧪 Testing

### Testing Strategy

#### Unit Testing
- **Component Testing**: Test individual React components
- **Service Testing**: Test API service functions
- **Utility Testing**: Test helper functions and utilities
- **Model Testing**: Test database models and validation

#### Integration Testing
- **API Testing**: Test API endpoints and data flow
- **Authentication Testing**: Test login/logout functionality
- **Schedule Generation Testing**: Test AI scheduling algorithms
- **Database Integration**: Test database operations

#### End-to-End Testing
- **User Workflows**: Test complete user journeys
- **Schedule Creation**: Test full schedule creation process
- **Session Management**: Test session tracking and updates
- **Analytics Flow**: Test analytics data generation and display

### Test Setup

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Run tests
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Test Examples

#### Component Testing
```typescript
// Example: Dashboard component test
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

test('renders dashboard with analytics', () => {
  render(<Dashboard />);
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
  expect(screen.getByText('Schedule Progress')).toBeInTheDocument();
});
```

#### API Testing
```typescript
// Example: API service test
import { apiService } from './api';

test('creates new subject successfully', async () => {
  const subjectData = {
    name: 'Test Subject',
    estimatedHours: 10,
    priority: 'high'
  };
  
  const result = await apiService.createSubject(subjectData);
  expect(result.subject.name).toBe('Test Subject');
});
```

## 🚀 Deployment

### Production Build

```bash
# Build frontend
npm run build

# Start production server
npm start
```

### Environment Configuration

#### Production Environment Variables
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/prod-db
JWT_SECRET=production-secret-key
PORT=5000
CORS_ORIGIN=https://your-domain.com
```

### Deployment Options

#### 1. Traditional Server Deployment
```bash
# On your server
git clone <repository-url>
cd ai-learning-scheduler
npm install
npm run build
npm start
```

#### 2. Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

#### 3. Cloud Platform Deployment

**Heroku:**
```bash
# Install Heroku CLI
heroku create your-app-name
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret
git push heroku main
```

**Vercel (Frontend):**
```bash
# Install Vercel CLI
vercel --prod
```

**Railway/Render (Full-stack):**
- Connect GitHub repository
- Configure environment variables
- Deploy automatically on push

### Database Deployment

#### MongoDB Atlas Setup
1. Create MongoDB Atlas account
2. Create new cluster
3. Configure network access and database user
4. Get connection string
5. Update MONGODB_URI in environment variables

### Security Considerations

#### Production Security
- **HTTPS**: Use SSL certificates for secure connections
- **Environment Variables**: Never commit sensitive data to version control
- **Database Security**: Use strong passwords and IP whitelisting
- **Rate Limiting**: Implement appropriate rate limits for production
- **Error Handling**: Don't expose internal errors to users
- **CORS**: Configure CORS for specific domains only

## 🤝 Contributing

### Contributing Guidelines

We welcome contributions to the AI Learning Scheduler! Please follow these guidelines:

#### 1. Fork and Clone
```bash
git clone https://github.com/your-username/ai-learning-scheduler.git
cd ai-learning-scheduler
git remote add upstream https://github.com/original-owner/ai-learning-scheduler.git
```

#### 2. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

#### 3. Development Process
- Follow coding standards and guidelines
- Write tests for new functionality
- Update documentation as needed
- Ensure all tests pass

#### 4. Submit Pull Request
- Create detailed PR description
- Reference related issues
- Include screenshots for UI changes
- Ensure CI/CD checks pass

### Code Review Process

1. **Automated Checks**: All PRs must pass automated tests and linting
2. **Peer Review**: At least one team member must review and approve
3. **Testing**: New features must include appropriate tests
4. **Documentation**: Update documentation for new features or changes

### Issue Reporting

#### Bug Reports
- Use the bug report template
- Include steps to reproduce
- Provide system information
- Include error messages and logs

#### Feature Requests
- Use the feature request template
- Describe the problem being solved
- Provide detailed requirements
- Include mockups or examples if applicable

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Error: MongoServerError: bad auth
# Solution: Check MongoDB credentials and network access

# Error: connection timeout
# Solution: Verify MongoDB URI and network connectivity
```

#### 2. Authentication Problems
```bash
# Error: jwt malformed
# Solution: Check JWT_SECRET configuration

# Error: 401 Unauthorized
# Solution: Verify token is being sent in Authorization header
```

#### 3. Build Issues
```bash
# Error: Module not found
# Solution: Run npm install to ensure all dependencies are installed

# Error: TypeScript compilation errors
# Solution: Check type definitions and imports
```

#### 4. Development Server Issues
```bash
# Error: Port already in use
# Solution: Kill existing processes or use different port

# Error: CORS policy error
# Solution: Check CORS_ORIGIN configuration in backend
```

### Performance Optimization

#### Frontend Optimization
- **Code Splitting**: Implement lazy loading for routes
- **Bundle Analysis**: Use webpack-bundle-analyzer to identify large dependencies
- **Caching**: Implement proper caching strategies
- **Image Optimization**: Optimize images and use appropriate formats

#### Backend Optimization
- **Database Indexing**: Add appropriate database indexes
- **Query Optimization**: Optimize database queries
- **Caching**: Implement Redis caching for frequently accessed data
- **Connection Pooling**: Configure proper database connection pooling

### Monitoring and Logging

#### Production Monitoring
- **Error Tracking**: Implement error tracking service (e.g., Sentry)
- **Performance Monitoring**: Monitor API response times and database performance
- **Health Checks**: Implement comprehensive health check endpoints
- **Logging**: Use structured logging for better debugging

#### Debug Mode
```bash
# Enable debug mode
DEBUG=app:* npm run dev:server

# Frontend debugging
VITE_DEBUG=true npm run dev
```

## 📝 License

### MIT License

```
MIT License

Copyright (c) 2024 AI Learning Scheduler

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 📞 Support

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Issues**: Create an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and community support
- **Email**: Contact the development team at support@ai-learning-scheduler.com

### Community

- **GitHub**: [https://github.com/your-username/ai-learning-scheduler](https://github.com/your-username/ai-learning-scheduler)
- **Discord**: Join our community Discord server
- **Twitter**: Follow us [@AISchedulerApp](https://twitter.com/AISchedulerApp)

---

## 📊 Project Status

- **Version**: 1.0.0
- **Status**: Active Development
- **Last Updated**: July 2025
- **Maintainers**: Development Team

### Roadmap

#### Upcoming Features (v1.1.0)
- [ ] Mobile application (React Native)
- [ ] Advanced AI recommendations
- [ ] Integration with calendar applications
- [ ] Team collaboration features
- [ ] Advanced analytics and reporting

#### Future Enhancements (v2.0.0)
- [ ] Machine learning model improvements
- [ ] Gamification features
- [ ] Social learning features
- [ ] Integration with learning management systems
- [ ] Advanced scheduling algorithms

---

**Built with ❤️ by the AI Learning Scheduler Team**

*Making learning more efficient, one schedule at a time.*
