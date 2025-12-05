import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types';

export type AuthRequest = any; // Simplifying type to avoid Express/Global conflicts

export const verifyToken = (req: AuthRequest, res: any, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && typeof authHeader === 'string' ? authHeader.split(' ')[1] : undefined; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET not configured");
    
    const decoded = jwt.verify(token, secret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token.' });
  }
};

export const checkRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: any, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    // Special check for PENDING_ASSIGNMENT
    if (req.user.role === UserRole.PENDING_ASSIGNMENT) {
      return res.status(403).json({ 
        message: 'Your account is pending assignment. Please contact an administrator.' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};