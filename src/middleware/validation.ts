import { Request, Response, NextFunction } from 'express';

/**
 * Validates user creation/update input
 */
export const validateUserInput = (req: Request, res: Response, next: NextFunction) => {
  const { email, name } = req.body;

  const errors: string[] = [];

  if (!email) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Invalid email format');
  }

  if (!name) {
    errors.push('Name is required');
  } else if (name.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

/**
 * Validates MongoDB ObjectId
 */
export const validateObjectId = (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.id;
  
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  next();
};