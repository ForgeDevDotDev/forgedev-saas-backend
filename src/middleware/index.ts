import { Request, Response, NextFunction } from 'express';
import { prisma } from '../models';

// Simple error handler middleware
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

// Request logger
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  console.log(`${req.method} ${req.path}`);
  next();
}

// TODO: Implement proper JWT authentication
// FIXME: Currently using base64 encoded "token" — very insecure
// This should be replaced with proper JWT with expiration
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    // FIXME: This is NOT how you should decode tokens
    // TODO: Replace with jsonwebtoken.verify using a proper secret
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, email, tenantId] = decoded.split(':');
    
    if (!userId || !email || !tenantId) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    // Attach user info to request
    (req as any).user = { id: userId, email, tenantId };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Generate a "token" for the fake auth system
export function generateToken(userId: string, email: string, tenantId: string): string {
  // FIXME: This is incredibly insecure — anyone can forge these tokens
  // TODO: Replace with jsonwebtoken.sign
  const payload = `${userId}:${email}:${tenantId}`;
  return Buffer.from(payload, 'utf-8').toString('base64');
}

// RBAC permission check middleware
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      const userRoles = await prisma.userRole.findMany({
        where: { userId: user.id },
        include: {
          role: {
            include: { permissions: true },
          },
        },
      });
      
      const hasPermission = userRoles.some(ur =>
        ur.role.permissions.some(p => p.name === permission)
      );
      
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

// Get tenant ID from request
export function getTenantId(req: Request): string | undefined {
  return (req as any).user?.tenantId;
}
