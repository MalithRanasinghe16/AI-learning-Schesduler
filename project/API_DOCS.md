# API Documentation

This document provides comprehensive documentation for the AI Learning Scheduler API endpoints.

## 📋 Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Authentication Endpoints](#authentication-endpoints)
- [Subject Management](#subject-management)
- [Schedule Management](#schedule-management)
- [Session Management](#session-management)
- [Analytics Endpoints](#analytics-endpoints)
- [Health Check](#health-check)
- [SDKs and Examples](#sdks-and-examples)

## 🌐 Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## 🔐 Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Token Lifecycle
- **Expiration**: 7 days (configurable)
- **Refresh**: Automatic refresh on valid requests
- **Storage**: Store securely (httpOnly cookies recommended for production)

## 📦 Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details"
  },
  "timestamp": "2025-01-16T10:30:00.000Z"
}
```

## ⚠️ Error Handling

### HTTP Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful GET, PUT, PATCH requests |
| 201 | Created | Successful POST requests |
| 204 | No Content | Successful DELETE requests |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Codes

| Error Code | Description |
|------------|-------------|
| `INVALID_CREDENTIALS` | Invalid login credentials |
| `TOKEN_EXPIRED` | JWT token has expired |
| `VALIDATION_ERROR` | Request validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `DUPLICATE_RESOURCE` | Resource already exists |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |

## 🚦 Rate Limiting

- **Window**: 15 minutes
- **Limit**: 100 requests per IP
- **Headers**: 
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## 🔑 Authentication Endpoints

### Register User

```http
POST /auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "60d5ec49f8b4c85a8c8b4567",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login User

```http
POST /auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "_id": "60d5ec49f8b4c85a8c8b4567",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "_id": "60d5ec49f8b4c85a8c8b4567",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "learningPreferences": {
      "dailyStudyGoal": 120,
      "preferredTimeSlots": ["morning", "evening"],
      "difficultyLevel": "intermediate"
    }
  }
}
```

### Update User Preferences

```http
PATCH /auth/preferences
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "dailyStudyGoal": 180,
  "preferredTimeSlots": ["morning", "afternoon"],
  "difficultyLevel": "advanced"
}
```

## 📚 Subject Management

### Get All Subjects

```http
GET /subjects
Authorization: Bearer <token>
```

**Response:**
```json
{
  "subjects": [
    {
      "_id": "60d5ec49f8b4c85a8c8b4568",
      "name": "React Development",
      "description": "Learn React.js fundamentals and advanced concepts",
      "estimatedHours": 40,
      "priority": "high",
      "difficulty": "intermediate",
      "progress": 75,
      "category": "Programming",
      "tags": ["javascript", "frontend", "react"],
      "isCompleted": false,
      "userId": "60d5ec49f8b4c85a8c8b4567",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-16T08:45:00.000Z"
    }
  ]
}
```

### Create Subject

```http
POST /subjects
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Node.js Backend Development",
  "description": "Learn server-side development with Node.js",
  "estimatedHours": 35,
  "priority": "high",
  "difficulty": "intermediate",
  "category": "Programming",
  "tags": ["javascript", "backend", "nodejs"]
}
```

**Response:**
```json
{
  "message": "Subject created successfully",
  "subject": {
    "_id": "60d5ec49f8b4c85a8c8b4569",
    "name": "Node.js Backend Development",
    "description": "Learn server-side development with Node.js",
    "estimatedHours": 35,
    "priority": "high",
    "difficulty": "intermediate",
    "progress": 0,
    "category": "Programming",
    "tags": ["javascript", "backend", "nodejs"],
    "isCompleted": false,
    "userId": "60d5ec49f8b4c85a8c8b4567",
    "createdAt": "2025-01-16T10:30:00.000Z",
    "updatedAt": "2025-01-16T10:30:00.000Z"
  }
}
```

### Update Subject

```http
PUT /subjects/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Advanced React Development",
  "estimatedHours": 50,
  "priority": "medium"
}
```

### Update Subject Progress

```http
PATCH /subjects/:id/progress
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "progress": 85
}
```

### Delete Subject

```http
DELETE /subjects/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Subject deleted successfully"
}
```

## 📅 Schedule Management

### Get All Schedules

```http
GET /schedules
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `completed`, `paused`)
- `type` (optional): Filter by type (`real`, `demo`, `template`)

**Response:**
```json
{
  "schedules": [
    {
      "_id": "60d5ec49f8b4c85a8c8b456a",
      "name": "January Learning Plan",
      "description": "Comprehensive learning schedule for January",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-01-31T23:59:59.000Z",
      "status": "active",
      "scheduleType": "real",
      "totalSessions": 20,
      "completedSessions": 12,
      "preferences": {
        "dailyStudyHours": 2,
        "preferredTimeSlots": ["morning", "evening"],
        "sessionDuration": 90,
        "breakDuration": 15
      },
      "userId": "60d5ec49f8b4c85a8c8b4567",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-16T10:30:00.000Z"
    }
  ]
}
```

### Generate AI Schedule

```http
POST /schedules/generate
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "subjectIds": [
    "60d5ec49f8b4c85a8c8b4568",
    "60d5ec49f8b4c85a8c8b4569"
  ],
  "preferences": {
    "dailyStudyHours": 3,
    "preferredTimeSlots": ["morning", "evening"],
    "sessionDuration": 120,
    "breakDuration": 20
  },
  "startDate": "2025-01-20",
  "endDate": "2025-02-20",
  "name": "February Learning Schedule"
}
```

**Response:**
```json
{
  "message": "Schedule generated successfully",
  "schedule": {
    "_id": "60d5ec49f8b4c85a8c8b456b",
    "name": "February Learning Schedule",
    "totalSessions": 25,
    "estimatedCompletionDate": "2025-02-18T00:00:00.000Z"
  }
}
```

### Get Schedule Sessions

```http
GET /schedules/:id/sessions
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (optional): Filter sessions from date
- `endDate` (optional): Filter sessions to date
- `status` (optional): Filter by session status

**Response:**
```json
{
  "sessions": [
    {
      "_id": "60d5ec49f8b4c85a8c8b456c",
      "scheduleId": "60d5ec49f8b4c85a8c8b456a",
      "subjectId": {
        "_id": "60d5ec49f8b4c85a8c8b4568",
        "name": "React Development",
        "category": "Programming"
      },
      "title": "React Hooks Deep Dive",
      "description": "Understanding useEffect and custom hooks",
      "startTime": "2025-01-17T09:00:00.000Z",
      "endTime": "2025-01-17T10:30:00.000Z",
      "duration": 90,
      "status": "scheduled",
      "priority": 8,
      "notes": "",
      "tags": ["hooks", "useEffect"],
      "userId": "60d5ec49f8b4c85a8c8b4567"
    }
  ]
}
```

## 🎯 Session Management

### Get All Sessions

```http
GET /sessions
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (optional): Filter from date (ISO format)
- `endDate` (optional): Filter to date (ISO format)
- `status` (optional): Filter by status
- `subjectId` (optional): Filter by subject

### Start Session

```http
PATCH /sessions/:id/start
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Session started successfully",
  "session": {
    "_id": "60d5ec49f8b4c85a8c8b456c",
    "status": "in-progress",
    "actualStartTime": "2025-01-17T09:05:00.000Z"
  }
}
```

### Complete Session

```http
PATCH /sessions/:id/complete
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "focusScore": 8,
  "difficultyRating": 7,
  "notes": "Great session! Understood hooks concept clearly."
}
```

**Response:**
```json
{
  "message": "Session completed successfully",
  "session": {
    "_id": "60d5ec49f8b4c85a8c8b456c",
    "status": "completed",
    "actualEndTime": "2025-01-17T10:35:00.000Z",
    "actualDuration": 90,
    "focusScore": 8,
    "difficultyRating": 7,
    "notes": "Great session! Understood hooks concept clearly."
  }
}
```

### Update Session Status

```http
PATCH /schedule-sessions/:id/status
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "completed"
}
```

## 📊 Analytics Endpoints

### Get Dashboard Analytics

```http
GET /analytics/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "analytics": {
    "totalStudyTime": 2400,
    "completionRate": 78.5,
    "dailyAverage": 95,
    "subjectProgress": [
      {
        "subjectId": "60d5ec49f8b4c85a8c8b4568",
        "subjectName": "React Development",
        "progress": 75,
        "timeSpent": 1800,
        "sessionsCompleted": 12
      }
    ],
    "weeklyProgress": [
      {
        "week": "2025-W03",
        "studyTime": 480,
        "sessionsCompleted": 8
      }
    ],
    "streakDays": 7,
    "totalSessions": 45,
    "completedSessions": 35
  }
}
```

### Get Schedule Analytics

```http
GET /analytics/schedule/:scheduleId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "analytics": {
    "scheduleId": "60d5ec49f8b4c85a8c8b456a",
    "completionRate": 75.5,
    "sessionsCompleted": 15,
    "totalSessions": 20,
    "totalStudyTime": 1350,
    "dailyAverage": 85,
    "subjectBreakdown": [
      {
        "subjectId": "60d5ec49f8b4c85a8c8b4568",
        "subjectName": "React Development",
        "sessionsCompleted": 8,
        "totalSessions": 10,
        "completionRate": 80,
        "timeSpent": 720
      }
    ],
    "performanceTrends": [
      {
        "date": "2025-01-15",
        "sessionsCompleted": 2,
        "averageFocusScore": 8.5,
        "studyTime": 180
      }
    ]
  }
}
```

### Get Today's Sessions

```http
GET /analytics/sessions/today
Authorization: Bearer <token>
```

**Response:**
```json
{
  "sessions": [
    {
      "_id": "60d5ec49f8b4c85a8c8b456c",
      "title": "React Hooks Practice",
      "subjectName": "React Development",
      "startTime": "2025-01-17T14:00:00.000Z",
      "duration": 90,
      "status": "scheduled"
    }
  ],
  "summary": {
    "totalSessions": 3,
    "completedSessions": 1,
    "scheduledSessions": 2,
    "totalPlannedTime": 270
  }
}
```

## 🏥 Health Check

### Server Health

```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-17T10:30:00.000Z",
  "environment": "development",
  "mongodb": "Connected",
  "uptime": 3600,
  "version": "1.0.0"
}
```

## 📱 SDKs and Examples

### JavaScript/TypeScript SDK

```typescript
import axios from 'axios';

class AISchedulerAPI {
  private baseURL = 'http://localhost:5000/api';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` })
    };
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await axios.post(`${this.baseURL}/auth/login`, {
      email,
      password
    });
    this.setToken(response.data.token);
    return response.data;
  }

  // Subjects
  async getSubjects() {
    const response = await axios.get(`${this.baseURL}/subjects`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async createSubject(subjectData: any) {
    const response = await axios.post(`${this.baseURL}/subjects`, subjectData, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // Analytics
  async getDashboardAnalytics() {
    const response = await axios.get(`${this.baseURL}/analytics/dashboard`, {
      headers: this.getHeaders()
    });
    return response.data;
  }
}

// Usage
const api = new AISchedulerAPI();

async function example() {
  try {
    // Login
    const authResponse = await api.login('user@example.com', 'password');
    console.log('Logged in:', authResponse.user);

    // Get subjects
    const subjects = await api.getSubjects();
    console.log('Subjects:', subjects);

    // Get analytics
    const analytics = await api.getDashboardAnalytics();
    console.log('Analytics:', analytics);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
  }
}
```

### Python Example

```python
import requests
import json

class AISchedulerAPI:
    def __init__(self, base_url="http://localhost:5000/api"):
        self.base_url = base_url
        self.token = None
    
    def set_token(self, token):
        self.token = token
    
    def get_headers(self):
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    def login(self, email, password):
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()
        data = response.json()
        self.set_token(data["token"])
        return data
    
    def get_subjects(self):
        response = requests.get(
            f"{self.base_url}/subjects",
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()

# Usage
api = AISchedulerAPI()
try:
    # Login
    auth_data = api.login("user@example.com", "password")
    print(f"Logged in: {auth_data['user']}")
    
    # Get subjects
    subjects = api.get_subjects()
    print(f"Subjects: {subjects}")
    
except requests.exceptions.RequestException as e:
    print(f"API Error: {e}")
```

### cURL Examples

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get subjects (replace TOKEN with actual token)
curl -X GET http://localhost:5000/api/subjects \
  -H "Authorization: Bearer TOKEN"

# Create subject
curl -X POST http://localhost:5000/api/subjects \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Python Programming",
    "estimatedHours": 30,
    "priority": "high",
    "difficulty": "intermediate"
  }'

# Get dashboard analytics
curl -X GET http://localhost:5000/api/analytics/dashboard \
  -H "Authorization: Bearer TOKEN"
```

## 🔗 Webhooks (Future Feature)

### Planned Webhook Events

- `session.started` - When a study session begins
- `session.completed` - When a study session is completed
- `schedule.generated` - When a new schedule is created
- `subject.completed` - When a subject reaches 100% progress

### Webhook Payload Example

```json
{
  "event": "session.completed",
  "timestamp": "2025-01-17T10:30:00.000Z",
  "data": {
    "sessionId": "60d5ec49f8b4c85a8c8b456c",
    "userId": "60d5ec49f8b4c85a8c8b4567",
    "subjectId": "60d5ec49f8b4c85a8c8b4568",
    "duration": 90,
    "focusScore": 8
  }
}
```

---

For additional support or questions about the API, please refer to the main [README.md](./README.md) or create an issue in the GitHub repository.
