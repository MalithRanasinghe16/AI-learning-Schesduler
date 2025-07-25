import { Request, Response, NextFunction } from 'express';

interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'enum';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: string[];
  message?: string;
}

export const validate = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = req.body[rule.field];

      // Required check
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      // Skip further validation if field is not provided and not required
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Type validation
      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`${rule.field} must be a string`);
        continue;
      }

      if (rule.type === 'number' && typeof value !== 'number') {
        errors.push(`${rule.field} must be a number`);
        continue;
      }

      if (rule.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`${rule.field} must be a valid email`);
          continue;
        }
      }

      // String length validation
      if (rule.type === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${rule.field} must be at most ${rule.maxLength} characters`);
        }
      }

      // Number range validation
      if (rule.type === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${rule.field} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${rule.field} must be at most ${rule.max}`);
        }
      }

      // Enum validation
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${rule.field} must be one of: ${rule.enum.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

export const validateSubject = validate([
  { field: 'name', required: true, type: 'string', minLength: 2, maxLength: 100 },
  { field: 'category', required: true, type: 'string', minLength: 1, maxLength: 50 },
  { field: 'difficulty', required: true, enum: ['beginner', 'intermediate', 'advanced'] },
  { field: 'estimatedHours', required: true, type: 'number', min: 0.5, max: 1000 },
  { field: 'priority', enum: ['low', 'medium', 'high'] },
  { field: 'progress', type: 'number', min: 0, max: 100 }
]);

export const validateUser = validate([
  { field: 'email', required: true, type: 'email' },
  { field: 'password', required: true, type: 'string', minLength: 6 },
  { field: 'firstName', required: true, type: 'string', minLength: 2, maxLength: 50 },
  { field: 'lastName', required: true, type: 'string', minLength: 2, maxLength: 50 }
]);

export const validateSession = validate([
  { field: 'subjectId', required: true, type: 'string' },
  { field: 'scheduledDate', required: true, type: 'string' },
  { field: 'plannedDuration', required: true, type: 'number', min: 15, max: 480 }
]);
