import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../database/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP';
    company?: string | null;
  };
}

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized, no token provided' });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Fetch user including company field
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, company: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Not authorized, user not found' });
    }

    // Attach user information to the request object
    req.user = user as any;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(401).json({ error: 'Not authorized, invalid token' });
  }
};

export const authorizeRoles = (...roles: ('ADMIN' | 'SALES_MANAGER' | 'SALES_REP')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to access this resource' });
    }
    next();
  };
};