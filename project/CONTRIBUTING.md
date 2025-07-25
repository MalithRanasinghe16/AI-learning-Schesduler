# Contributing to AI Learning Scheduler

We welcome contributions to the AI Learning Scheduler project! This document provides guidelines for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)

## 🤝 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive experience for all contributors, regardless of age, body size, disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Unacceptable Behavior

Examples of unacceptable behavior include:

- The use of sexualized language or imagery and unwelcome sexual attention or advances
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

## 🚀 Getting Started

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn package manager
- MongoDB (local or cloud)
- Git for version control
- Basic knowledge of React, TypeScript, and Express.js

### Setting Up Development Environment

1. **Fork the Repository**
   ```bash
   git clone https://github.com/your-username/ai-learning-scheduler.git
   cd ai-learning-scheduler
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1: Backend
   npm run dev:server
   
   # Terminal 2: Frontend
   npm run dev
   ```

5. **Verify Setup**
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:5000`

## 🔄 Development Process

### Branching Strategy

We use a simplified Git flow:

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/feature-name`: Individual feature branches
- `bugfix/bug-name`: Bug fix branches
- `hotfix/issue-name`: Critical fixes for production

### Workflow Steps

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Development**
   - Write code following our coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new scheduling algorithm"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat: add drag-and-drop session rescheduling
fix: resolve authentication token expiration issue
docs: update API documentation for schedule endpoints
style: fix ESLint warnings in Dashboard component
refactor: optimize database queries for analytics
test: add unit tests for AI scheduler service
chore: update dependencies to latest versions
```

## 🔍 Pull Request Process

### Before Submitting

1. **Code Quality Checks**
   ```bash
   npm run lint        # Check code style
   npm run type-check  # Check TypeScript types
   npm run test        # Run tests
   ```

2. **Update Documentation**
   - Update README.md if needed
   - Add/update API documentation
   - Update component documentation

3. **Test Your Changes**
   - Ensure all existing tests pass
   - Add tests for new functionality
   - Test manually in development environment

### PR Requirements

- [ ] **Descriptive Title**: Clear and concise title describing the changes
- [ ] **Detailed Description**: Explain what changes were made and why
- [ ] **Issue Reference**: Link to related issues using `Fixes #123` or `Closes #123`
- [ ] **Testing Information**: Describe how the changes were tested
- [ ] **Screenshots**: Include screenshots for UI changes
- [ ] **Breaking Changes**: Clearly document any breaking changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Fixes #(issue number)

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project coding standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Review Process

1. **Automated Checks**: All PRs must pass automated checks (CI/CD)
2. **Code Review**: At least one team member must review and approve
3. **Testing**: Changes must be thoroughly tested
4. **Documentation**: Documentation must be updated for new features

## 📝 Issue Guidelines

### Bug Reports

When reporting bugs, please include:

- **Bug Description**: Clear description of the issue
- **Steps to Reproduce**: Detailed steps to reproduce the bug
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Environment**: OS, browser, Node.js version, etc.
- **Screenshots**: If applicable
- **Error Messages**: Full error messages and stack traces

### Feature Requests

When requesting features, please include:

- **Feature Description**: Clear description of the proposed feature
- **Use Case**: Why is this feature needed?
- **Proposed Solution**: How should this feature work?
- **Alternatives**: Any alternative solutions considered
- **Additional Context**: Any other relevant information

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `priority: high`: High priority issue
- `priority: medium`: Medium priority issue
- `priority: low`: Low priority issue

## 💻 Coding Standards

### TypeScript/JavaScript

- **Strict Type Checking**: Use TypeScript strict mode
- **Interface Definitions**: Define interfaces for all data structures
- **Error Handling**: Implement comprehensive error handling
- **Async/Await**: Use async/await over promises when possible

### React Components

- **Functional Components**: Use functional components with hooks
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Props Interface**: Define TypeScript interfaces for all props
- **Performance**: Use React.memo, useCallback, useMemo when needed

### Backend Development

- **RESTful APIs**: Follow REST principles for API design
- **Error Responses**: Consistent error response format
- **Validation**: Validate all input data
- **Security**: Follow security best practices

### Code Style

- **ESLint**: Follow ESLint configuration
- **Prettier**: Use Prettier for code formatting
- **Naming Conventions**: Use camelCase for variables and functions, PascalCase for components
- **File Organization**: Keep files focused and well-organized

## 🧪 Testing Guidelines

### Testing Types

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test API endpoints and data flow
3. **End-to-End Tests**: Test complete user workflows

### Testing Best Practices

- **Test Coverage**: Aim for high test coverage (80%+)
- **Test Names**: Use descriptive test names
- **Test Data**: Use meaningful test data
- **Mocking**: Mock external dependencies appropriately

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testNamePattern="Dashboard"
```

## 📖 Documentation

### Code Documentation

- **Comments**: Write clear comments for complex logic
- **JSDoc**: Use JSDoc for function documentation
- **README Updates**: Keep README.md up to date
- **API Documentation**: Document all API endpoints

### Component Documentation

```typescript
/**
 * Dashboard component displaying user analytics and today's sessions
 * 
 * @param props - Component props
 * @param props.scheduleId - ID of the selected schedule
 * @returns JSX element representing the dashboard
 */
interface DashboardProps {
  scheduleId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ scheduleId }) => {
  // Component implementation
};
```

## 🎯 Development Priorities

### Current Focus Areas

1. **Performance Optimization**: Improve application performance
2. **Mobile Responsiveness**: Enhance mobile user experience
3. **Accessibility**: Improve accessibility features
4. **AI Improvements**: Enhance scheduling algorithms
5. **Testing Coverage**: Increase test coverage

### Future Roadmap

- Mobile application development
- Advanced AI features
- Calendar integration
- Team collaboration features
- Advanced analytics

## 🆘 Getting Help

### Community Support

- **GitHub Issues**: For bug reports and feature requests
- **Discussions**: For questions and general discussion
- **Documentation**: Check existing documentation first

### Contact Information

- **Project Maintainers**: Create an issue for direct contact
- **Community**: Join our discussion forums

## 📜 License

By contributing to AI Learning Scheduler, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to AI Learning Scheduler! 🎓✨
