# Deployment Guide

This guide provides comprehensive instructions for deploying the AI Learning Scheduler application to various production environments.

## 📋 Table of Contents

- [Pre-deployment Checklist](#pre-deployment-checklist)
- [Environment Configuration](#environment-configuration)
- [Build Process](#build-process)
- [Database Deployment](#database-deployment)
- [Server Deployment](#server-deployment)
- [Frontend Deployment](#frontend-deployment)
- [Cloud Platform Deployment](#cloud-platform-deployment)
- [Docker Deployment](#docker-deployment)
- [Security Considerations](#security-considerations)
- [Monitoring and Logging](#monitoring-and-logging)
- [Maintenance](#maintenance)

## ✅ Pre-deployment Checklist

### Code Quality
- [ ] All tests pass (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] Code reviewed and approved
- [ ] Dependencies updated and verified
- [ ] Environment variables configured
- [ ] Database migrations completed

### Security
- [ ] JWT secret changed from default
- [ ] Database credentials secured
- [ ] CORS origins configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Error messages sanitized
- [ ] HTTPS certificates ready

### Performance
- [ ] Database indexes optimized
- [ ] Bundle size analyzed and optimized
- [ ] Image assets optimized
- [ ] Caching strategies implemented
- [ ] CDN configured (if applicable)

## 🔧 Environment Configuration

### Production Environment Variables

Create `.env.production`:

```env
# Production Environment
NODE_ENV=production

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-learning-scheduler-prod?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secure-production-jwt-secret-at-least-64-characters-long
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000

# CORS Configuration
CORS_ORIGIN=https://your-domain.com
FRONTEND_URL=https://your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-for-additional-security

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn-for-error-tracking
NEW_RELIC_LICENSE_KEY=your-new-relic-key
```

### Environment-specific Configuration

```bash
# Copy production environment
cp .env.production .env

# Verify configuration
npm run config:verify
```

## 🏗️ Build Process

### Frontend Build

```bash
# Install dependencies
npm ci --only=production

# Build frontend
npm run build

# Verify build
ls -la dist/
```

### Backend Preparation

```bash
# Compile TypeScript
npm run build:server

# Verify server build
node dist/server.js --version
```

### Production Bundle

```bash
# Create production bundle
npm run bundle:production

# Contents should include:
# - dist/ (frontend build)
# - server/ (backend source)
# - package.json
# - package-lock.json
# - .env.production
```

## 🗄️ Database Deployment

### MongoDB Atlas (Recommended)

1. **Create Production Cluster**
   ```bash
   # Create cluster via MongoDB Atlas UI
   # Choose appropriate tier (M10+ for production)
   # Select preferred region
   # Configure cluster name: ai-scheduler-prod
   ```

2. **Configure Database Access**
   ```bash
   # Create database user with read/write permissions
   # Use strong password (generate random 32+ characters)
   # Restrict to specific databases
   ```

3. **Network Security**
   ```bash
   # Configure IP whitelist
   # Add specific server IPs (not 0.0.0.0/0)
   # Enable VPC peering if using cloud providers
   ```

4. **Backup Configuration**
   ```bash
   # Enable automated backups
   # Configure backup retention policy
   # Set up backup alerts
   ```

### Self-hosted MongoDB

```bash
# Install MongoDB on server
sudo apt update
sudo apt install -y mongodb-org

# Configure MongoDB
sudo nano /etc/mongod.conf

# Security configuration
security:
  authorization: enabled

# Network configuration
net:
  bindIp: 127.0.0.1,<server-ip>
  port: 27017

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create admin user
mongosh admin
db.createUser({
  user: "admin",
  pwd: "secure-password",
  roles: ["userAdminAnyDatabase"]
})

# Create application user
use ai-learning-scheduler
db.createUser({
  user: "app-user",
  pwd: "app-password",
  roles: ["readWrite"]
})
```

## 🖥️ Server Deployment

### Traditional Server (VPS/Dedicated)

1. **Server Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Create application user
   sudo useradd -m -s /bin/bash app-user
   sudo su - app-user
   ```

2. **Application Deployment**
   ```bash
   # Clone repository
   git clone https://github.com/your-username/ai-learning-scheduler.git
   cd ai-learning-scheduler
   
   # Install dependencies
   npm ci --only=production
   
   # Build application
   npm run build
   
   # Configure environment
   cp .env.production .env
   nano .env
   ```

3. **PM2 Configuration**
   
   Create `ecosystem.config.js`:
   ```javascript
   module.exports = {
     apps: [{
       name: 'ai-learning-scheduler',
       script: 'server/server.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'development'
       },
       env_production: {
         NODE_ENV: 'production',
         PORT: 5000
       },
       error_file: './logs/err.log',
       out_file: './logs/out.log',
       log_file: './logs/combined.log',
       time: true,
       max_memory_restart: '1G',
       restart_delay: 4000
     }]
   };
   ```

4. **Start Application**
   ```bash
   # Start with PM2
   pm2 start ecosystem.config.js --env production
   
   # Save PM2 configuration
   pm2 save
   
   # Enable PM2 startup
   pm2 startup
   sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u app-user --hp /home/app-user
   ```

### Nginx Reverse Proxy

1. **Install Nginx**
   ```bash
   sudo apt install -y nginx
   ```

2. **Configure Nginx**
   
   Create `/etc/nginx/sites-available/ai-learning-scheduler`:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com www.your-domain.com;
       
       # Redirect HTTP to HTTPS
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name your-domain.com www.your-domain.com;
       
       # SSL Configuration
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
       ssl_prefer_server_ciphers off;
       
       # Security Headers
       add_header X-Frame-Options DENY;
       add_header X-Content-Type-Options nosniff;
       add_header X-XSS-Protection "1; mode=block";
       add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
       
       # Serve static files
       location / {
           root /home/app-user/ai-learning-scheduler/dist;
           try_files $uri $uri/ /index.html;
           
           # Cache static assets
           location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
               expires 1y;
               add_header Cache-Control "public, immutable";
           }
       }
       
       # API proxy
       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
       
       # Gzip compression
       gzip on;
       gzip_vary on;
       gzip_min_length 1024;
       gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
   }
   ```

3. **Enable Site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/ai-learning-scheduler /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **SSL Certificate (Let's Encrypt)**
   ```bash
   # Install Certbot
   sudo apt install -y certbot python3-certbot-nginx
   
   # Obtain certificate
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   
   # Auto-renewal
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

## 🌐 Frontend Deployment

### Static Site Hosting

#### Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   # Build frontend
   npm run build
   
   # Deploy to Vercel
   vercel --prod
   ```

3. **Environment Variables**
   ```bash
   # Set environment variables in Vercel dashboard
   VITE_API_URL=https://api.your-domain.com
   VITE_APP_NAME=AI Learning Scheduler
   ```

#### Netlify Deployment

1. **Build Configuration**
   
   Create `netlify.toml`:
   ```toml
   [build]
     publish = "dist"
     command = "npm run build"
   
   [build.environment]
     NODE_VERSION = "18"
   
   [[redirects]]
     from = "/api/*"
     to = "https://api.your-domain.com/api/:splat"
     status = 200
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Deploy**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Deploy
   netlify deploy --prod
   ```

## ☁️ Cloud Platform Deployment

### Heroku Deployment

1. **Prepare for Heroku**
   
   Create `Procfile`:
   ```
   web: node server/server.js
   ```
   
   Update `package.json`:
   ```json
   {
     "scripts": {
       "start": "node server/server.js",
       "heroku-postbuild": "npm run build"
     },
     "engines": {
       "node": "18.x",
       "npm": "8.x"
     }
   }
   ```

2. **Deploy to Heroku**
   ```bash
   # Install Heroku CLI
   # Create Heroku app
   heroku create ai-learning-scheduler-prod
   
   # Set environment variables
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your-mongodb-uri
   heroku config:set JWT_SECRET=your-jwt-secret
   
   # Deploy
   git push heroku main
   
   # Open application
   heroku open
   ```

### Railway Deployment

1. **Connect Repository**
   - Visit [Railway](https://railway.app)
   - Connect GitHub repository
   - Configure deployment settings

2. **Environment Variables**
   ```bash
   # Set in Railway dashboard
   NODE_ENV=production
   MONGODB_URI=your-mongodb-uri
   JWT_SECRET=your-jwt-secret
   PORT=5000
   ```

### AWS Deployment

#### EC2 Deployment

1. **Launch EC2 Instance**
   ```bash
   # Choose Ubuntu Server 22.04 LTS
   # Instance type: t3.small or larger
   # Configure security groups (HTTP, HTTPS, SSH)
   ```

2. **Server Setup**
   ```bash
   # Connect to instance
   ssh -i your-key.pem ubuntu@your-instance-ip
   
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js, Nginx, PM2
   # Follow traditional server deployment steps
   ```

#### Elastic Beanstalk

1. **Prepare Application**
   ```bash
   # Install EB CLI
   pip install awsebcli
   
   # Initialize EB application
   eb init
   
   # Create environment
   eb create production
   
   # Deploy
   eb deploy
   ```

## 🐳 Docker Deployment

### Docker Configuration

Create `Dockerfile`:
```dockerfile
# Multi-stage build
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "server/server.js"]
```

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
    networks:
      - app-network
    depends_on:
      - mongodb

  mongodb:
    image: mongo:6.0
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    restart: unless-stopped
    networks:
      - app-network
    depends_on:
      - app

volumes:
  mongodb_data:

networks:
  app-network:
    driver: bridge
```

### Deploy with Docker

```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Scale application
docker-compose up -d --scale app=3
```

## 🔒 Security Considerations

### Environment Security

```bash
# Secure environment files
chmod 600 .env.production

# Use secrets management
# AWS Secrets Manager, Azure Key Vault, etc.
```

### Database Security

```bash
# Enable MongoDB authentication
# Use connection string with credentials
# Configure IP whitelisting
# Enable encryption at rest
# Regular security updates
```

### Application Security

```bash
# Security headers (Helmet.js)
# Rate limiting
# Input validation
# SQL injection prevention
# XSS protection
# CSRF protection
```

### SSL/TLS Configuration

```bash
# Strong cipher suites
# HSTS headers
# Certificate pinning
# OCSP stapling
```

## 📊 Monitoring and Logging

### Application Monitoring

1. **PM2 Monitoring**
   ```bash
   # Install PM2 Plus
   pm2 install pm2-server-monit
   
   # Monitor processes
   pm2 monit
   ```

2. **Error Tracking (Sentry)**
   ```javascript
   // Install Sentry
   npm install @sentry/node
   
   // Configure in server
   import * as Sentry from '@sentry/node';
   
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV
   });
   ```

3. **Performance Monitoring (New Relic)**
   ```bash
   # Install New Relic
   npm install newrelic
   
   # Configure newrelic.js
   ```

### Log Management

```bash
# Centralized logging with Winston
npm install winston

# Log rotation
sudo apt install logrotate

# Configure log rotation
sudo nano /etc/logrotate.d/ai-learning-scheduler
```

### Health Checks

```javascript
// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version,
    database: 'Unknown',
    memory: process.memoryUsage()
  };

  try {
    await mongoose.connection.db.admin().ping();
    health.database = 'Connected';
  } catch (error) {
    health.database = 'Disconnected';
    health.status = 'ERROR';
  }

  res.status(health.status === 'OK' ? 200 : 503).json(health);
});
```

## 🔧 Maintenance

### Regular Maintenance Tasks

1. **Daily**
   - Monitor application logs
   - Check system resources
   - Verify backup completion

2. **Weekly**
   - Review performance metrics
   - Update dependencies (security)
   - Database optimization

3. **Monthly**
   - Security audit
   - Performance review
   - Capacity planning

### Backup Strategy

```bash
# Database backups
mongodump --uri="mongodb+srv://..." --out=/backups/$(date +%Y-%m-%d)

# Application backups
tar -czf app-backup-$(date +%Y-%m-%d).tar.gz /path/to/app

# Automated backups
crontab -e
# 0 2 * * * /path/to/backup-script.sh
```

### Update Process

```bash
# Update dependencies
npm audit fix
npm update

# Test updates
npm test
npm run build

# Deploy updates
pm2 reload ecosystem.config.js
```

## 🚨 Disaster Recovery

### Backup Verification

```bash
# Test database restore
mongorestore --uri="mongodb://..." /backup/path

# Test application recovery
# Deploy to staging environment
# Verify functionality
```

### Rollback Procedures

```bash
# PM2 rollback
pm2 reload ecosystem.config.js --update-env

# Database rollback
mongorestore --drop --uri="mongodb://..." /backup/previous

# Frontend rollback
# Deploy previous version
```

---

## 📞 Support

For deployment issues:
1. Check application logs
2. Verify environment variables
3. Test database connectivity
4. Review monitoring dashboards
5. Contact support team

Remember to test all deployment procedures in a staging environment before production deployment.
