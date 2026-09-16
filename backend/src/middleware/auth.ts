import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  // In a real app, this should be configured with a service account
  // initializeApp({ credential: admin.credential.cert(serviceAccount) });
  initializeApp();
}

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const token = authHeader.split('Bearer ')[1] || '';
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
};

export const authenticateStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const token = authHeader.split('Bearer ')[1] || '';
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    // In a real app, verify staff role here
    // if (!decodedToken.staff) throw new Error('Not staff');
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
};

export const authenticateStudentOrStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const token = authHeader.split('Bearer ')[1] || '';
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
};
