import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';

/**
 * Handles new user registration/seeding.
 */
export const signup = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, first_name, last_name, workspace_name } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'Missing required registration fields' });
    }

    // Standardize email casing
    const sanitizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash the password using our bcrypt utility
    const hashedPassword = await hashPassword(password);
    const fullName = `${first_name.trim()} ${last_name.trim()}`;

    // Set the first registered user in the database as ADMIN, others as SALES_REP
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'SALES_REP';

    // Save to your PostgreSQL database
    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: sanitizedEmail,
        password: hashedPassword,
        role,
        company: workspace_name || 'SalesFlow CRM',
      },
    });

    // Generate authenticated JWT
    const token = generateToken(user.id);

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration/Seeding error:', error);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
};

/**
 * Handles user login and password verification.
 */
export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const sanitizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify hash match using bcrypt
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate authenticated JWT
    const token = generateToken(user.id);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
};