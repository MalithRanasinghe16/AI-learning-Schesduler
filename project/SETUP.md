# Development Setup Guide

This guide provides detailed instructions for setting up the AI Learning Scheduler development environment on different operating systems and configurations.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Application Setup](#application-setup)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [VS Code Configuration](#vs-code-configuration)
- [Docker Development](#docker-development)

## 🔧 Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | ≥16.0.0 | JavaScript runtime |
| npm | ≥8.0.0 | Package manager |
| Git | Latest | Version control |
| MongoDB | ≥4.4 | Database (local) |
| VS Code | Latest | Code editor (recommended) |

### System Requirements

- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: 5GB free space
- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)

## 🌍 Environment Setup

### Windows Setup

1. **Install Node.js**
   ```powershell
   # Download from https://nodejs.org/
   # Or use Chocolatey
   choco install nodejs
   
   # Verify installation
   node --version
   npm --version
   ```

2. **Install Git**
   ```powershell
   # Download from https://git-scm.com/
   # Or use Chocolatey
   choco install git
   
   # Verify installation
   git --version
   ```

3. **Install MongoDB Community Edition**
   ```powershell
   # Download from https://www.mongodb.com/try/download/community
   # Or use Chocolatey
   choco install mongodb
   
   # Start MongoDB service
   net start MongoDB
   ```

### macOS Setup

1. **Install Homebrew (if not installed)**
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Node.js**
   ```bash
   # Using Homebrew
   brew install node
   
   # Verify installation
   node --version
   npm --version
   ```

3. **Install MongoDB**
   ```bash
   # Install MongoDB Community Edition
   brew tap mongodb/brew
   brew install mongodb-community
   
   # Start MongoDB
   brew services start mongodb/brew/mongodb-community
   ```

### Linux (Ubuntu) Setup

1. **Update Package Index**
   ```bash
   sudo apt update
   ```

2. **Install Node.js**
   ```bash
   # Install Node.js 18.x
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Verify installation
   node --version
   npm --version
   ```

3. **Install MongoDB**
   ```bash
   # Import MongoDB public key
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
   
   # Add MongoDB repository
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   
   # Update package index
   sudo apt update
   
   # Install MongoDB
   sudo apt install -y mongodb-org
   
   # Start MongoDB
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

## 🗄️ Database Setup

### Option 1: Local MongoDB

1. **Start MongoDB Service**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS
   brew services start mongodb/brew/mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

2. **Verify MongoDB Connection**
   ```bash
   # Connect using MongoDB shell
   mongosh
   
   # In MongoDB shell
   show dbs
   use ai-learning-scheduler
   exit
   ```

3. **Environment Configuration**
   ```env
   MONGODB_URI=mongodb://localhost:27017/ai-learning-scheduler
   ```

### Option 2: MongoDB Atlas (Cloud)

1. **Create MongoDB Atlas Account**
   - Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for free account
   - Create new project

2. **Create Cluster**
   - Choose free tier (M0)
   - Select preferred region
   - Create cluster (takes 3-5 minutes)

3. **Configure Database Access**
   - Go to Database Access
   - Add new user with read/write permissions
   - Note username and password

4. **Configure Network Access**
   - Go to Network Access
   - Add IP address (0.0.0.0/0 for development)
   - **Note**: Use specific IPs for production

5. **Get Connection String**
   - Go to Clusters
   - Click "Connect"
   - Choose "Connect your application"
   - Copy connection string

6. **Environment Configuration**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-learning-scheduler?retryWrites=true&w=majority
   ```

## 🚀 Application Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-username/ai-learning-scheduler.git
cd ai-learning-scheduler

# Or if using SSH
git clone git@github.com:your-username/ai-learning-scheduler.git
cd ai-learning-scheduler
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
# Windows
notepad .env

# macOS/Linux
nano .env
# or
code .env
```

**Required Environment Variables:**
```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ai-learning-scheduler

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-complex
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### 4. Database Initialization

```bash
# Start the backend server (this will create database collections)
npm run dev:server

# The server will automatically create necessary collections on first run
```

### 5. Start Development Servers

Open **two terminal windows**:

**Terminal 1 - Backend:**
```bash
npm run dev:server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 6. Verify Setup

1. **Backend Health Check**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Frontend Access**
   - Open browser to `http://localhost:5173`
   - You should see the login page

3. **Create Test Account**
   - Click "Register"
   - Fill out registration form
   - Verify successful login

## 🔄 Development Workflow

### Daily Development Routine

1. **Start Development Environment**
   ```bash
   # Start MongoDB (if local)
   # Windows: net start MongoDB
   # macOS: brew services start mongodb/brew/mongodb-community
   # Linux: sudo systemctl start mongod
   
   # Start development servers
   npm run dev:server  # Terminal 1
   npm run dev         # Terminal 2
   ```

2. **Code Quality Checks**
   ```bash
   # Run linting
   npm run lint
   
   # Fix linting issues
   npm run lint -- --fix
   
   # Type checking
   npm run type-check
   ```

3. **Testing**
   ```bash
   # Run tests (when implemented)
   npm test
   
   # Run tests in watch mode
   npm run test:watch
   ```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/your-feature-name

# Create pull request on GitHub
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:**
```bash
# Find process using port
# Windows
netstat -ano | findstr :5000

# macOS/Linux
lsof -ti:5000

# Kill process
# Windows
taskkill /PID <PID> /F

# macOS/Linux
kill -9 <PID>
```

#### 2. MongoDB Connection Failed

**Error:** `MongoServerError: bad auth`

**Solutions:**
- Check username/password in connection string
- Verify network access in MongoDB Atlas
- Ensure MongoDB service is running locally

#### 3. Module Not Found

**Error:** `Module not found: Error: Can't resolve...`

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 4. Permission Denied (Linux/macOS)

**Error:** `EACCES: permission denied`

**Solution:**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

#### 5. TypeScript Compilation Errors

**Solution:**
```bash
# Clean TypeScript cache
rm -rf dist/
npm run build
```

### Debug Mode

Enable debug logging:

```bash
# Backend debugging
DEBUG=app:* npm run dev:server

# Frontend debugging (add to .env)
VITE_DEBUG=true
```

## 💻 VS Code Configuration

### Recommended Extensions

Install these VS Code extensions for optimal development:

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "mongodb.mongodb-vscode",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "typescript",
    "typescriptreact": "typescriptreact"
  }
}
```

### Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/server.ts",
      "runtimeArgs": ["-r", "tsx/cjs"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "sourceMaps": true
    }
  ]
}
```

## 🐳 Docker Development

### Docker Setup

Create `docker-compose.dev.yml`:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6.0
    container_name: ai-scheduler-mongo
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: ai-learning-scheduler
    volumes:
      - mongodb_data:/data/db

  backend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: ai-scheduler-backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongodb:27017/ai-learning-scheduler
      - JWT_SECRET=your-jwt-secret
    volumes:
      - ./server:/app/server
      - ./package.json:/app/package.json
    depends_on:
      - mongodb
    command: npm run dev:server

volumes:
  mongodb_data:
```

Create `Dockerfile.dev`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev:server"]
```

### Run with Docker

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop environment
docker-compose -f docker-compose.dev.yml down
```

## 📚 Additional Resources

### Learning Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

### Development Tools

- [Postman](https://www.postman.com/) - API testing
- [MongoDB Compass](https://www.mongodb.com/products/compass) - Database GUI
- [React Developer Tools](https://reactjs.org/blog/2019/08/15/new-react-devtools.html) - Browser extension

### Community

- [GitHub Issues](https://github.com/your-username/ai-learning-scheduler/issues)
- [Discussions](https://github.com/your-username/ai-learning-scheduler/discussions)

---

If you encounter any issues not covered in this guide, please check the [troubleshooting section](./README.md#troubleshooting) in the main README or create an issue in the GitHub repository.
