import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secure_jwt_secret_key';
const JWT_EXPIRES_IN = '7d';

/**
 * Signs a JWT payload containing the User's ID.
 */
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
};

/**
 * Decodes and verifies a JWT token.
 */
export const verifyToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};