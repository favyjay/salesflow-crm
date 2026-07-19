import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Encrypts a plain-text password using bcryptjs.
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

/**
 * Compares a plain-text login password against a hashed database password.
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};