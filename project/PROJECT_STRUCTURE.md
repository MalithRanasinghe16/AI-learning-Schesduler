# AI Learning Scheduler - Project Structure

## 📁 Project Overview

```
project/
├── 📂 src/                    # Frontend React application
│   ├── 📂 components/         # React components
│   │   ├── 📂 Auth/          # Login/Register components
│   │   ├── 📂 Chat/          # AI Chatbot widget
│   │   ├── 📂 Dashboard/     # Main dashboard components
│   │   ├── 📂 Layout/        # Navigation and layout
│   │   └── 📂 Schedule/      # Schedule management UI
│   ├── 📂 contexts/          # React context providers
│   ├── 📂 services/          # API service layer
│   └── 📂 types/             # TypeScript type definitions
├── 📂 server/                 # Backend Node.js application
│   ├── 📂 config/            # Database configuration
│   ├── 📂 middleware/        # Express middleware
│   ├── 📂 models/            # MongoDB schemas
│   ├── 📂 routes/            # API endpoints
│   └── 📂 services/          # Business logic
├── 📂 chatbot/               # Python AI chatbot service
│   ├── main.py               # FastAPI application
│   ├── nlp_processor.py      # Natural language processing
│   ├── intent_classifier.py  # Intent classification
│   ├── schedule_parser.py    # Schedule parsing logic
│   ├── backend_client.py     # API client for Node.js backend
│   └── auth_manager.py       # Authentication handling
└── 📄 Configuration files    # Package.json, tsconfig, etc.
```

## 🚀 Quick Start

1. **Install Dependencies**

   ```bash
   npm install
   cd chatbot && pip install -r requirements.txt
   ```

2. **Start Development**

   ```bash
   # Terminal 1: Start backend
   npm run dev:server

   # Terminal 2: Start frontend
   npm run dev

   # Terminal 3: Start chatbot
   cd chatbot && python main.py
   ```

3. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Chatbot API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 🔧 Key Technologies

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, MongoDB
- **AI/ML**: Python, FastAPI, spaCy, scikit-learn
- **Authentication**: JWT tokens
- **Build Tools**: Vite, tsx

## 📝 Essential Files

- `README.md` - Complete project documentation
- `SETUP.md` - Detailed setup instructions
- `API_DOCS.md` - API endpoint documentation
- `package.json` - Node.js dependencies and scripts
- `chatbot/requirements.txt` - Python dependencies
