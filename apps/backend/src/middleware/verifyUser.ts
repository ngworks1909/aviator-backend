import { NextFunction, Response, Request } from 'express';
import jwt from 'jsonwebtoken'

type UserToken = {
  userId: string
}

export type UserRequest = Request & {user?: UserToken}

export function authenticateToken(req: UserRequest, res: Response, next: NextFunction) {
  const token = req.headers['authorization'] // Assuming Bearer token format

  if (!token) {
    return res.status(401).send('Unauthorized token'); // Unauthorized
  }
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 13) {
    console.error("ERROR: JWT_SECRET must be configured with a secure random string of at least 13 characters");
    process.exit(1);
  }
  jwt.verify(token, secret, (err: any, user: any) => {
    if (err) {
      return res.status(403).send('Forbidden error'); // Forbidden
    }
    req.user = user; // Save user information for use in the next middleware
    next(); // Proceed to the next middleware
  });

  
}


export const verifyAdmin = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization'] ; // Get token from the 'Authorization' header

  if (!token) {
    return res.status(403).send('No token provided.');
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET || "secret", (err, decoded) => {
    if (!decoded || err) {
      return res.status(403).send('Failed to authenticate token.');
    }

    // Check if the user is an admin
    if (decoded && typeof decoded === 'object' && 'role' in decoded) {
  
        // Check if the user is an admin
        if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
          return res.status(403).send('Access denied. Admins only.');
        }
  
        // Proceed to the next middleware if the user is admin
        next();
      } else {
        return res.status(403).send('Invalid token payload.');
      }
  });
}