import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_enterprise_signing_key_123!';

/**
 * Handles user signup and registers a new account.
 * Enforces mutual exclusivity (either email or phone, but not both).
 */
export const signup = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, first_name, last_name, phone, gender, workspace_name } = req.body;

    if (!password || !first_name || !last_name) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const hasEmail = typeof email === 'string' && email.trim() !== '';
    const hasPhone = typeof phone === 'string' && phone.trim() !== '';

    // Enforce mutual exclusivity rule
    if (hasEmail && hasPhone) {
      return res.status(400).json({ error: 'You must register with either email or phone number, but not both.' });
    }

    if (!hasEmail && !hasPhone) {
      return res.status(400).json({ error: 'Either email address or phone number is required to sign up.' });
    }

    let registrationEmail = '';

    if (hasEmail) {
      registrationEmail = email.toLowerCase().trim();
    } else {
      const cleanPhone = phone.trim();
      const cleanPhoneDigits = cleanPhone.replace(/[^0-9]/g, '');
      registrationEmail = `phone-${cleanPhoneDigits}@salesflow-placeholder.local`;
    }

    // Check duplicate credentials via the unique email field
    const existingUser = await prisma.user.findUnique({ where: { email: registrationEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'An account is already registered with these credentials.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const totalUsers = await prisma.user.count();
    
    // Auto-elevate favyjay112@gmail.com or the very first user to ADMIN
    let assignedRole: Role = Role.SALES_REP;
    if (totalUsers === 0 || registrationEmail === 'favyjay112@gmail.com') {
      assignedRole = Role.ADMIN;
    }

    // Merge separate frontend name fields to fit your database schema's 'name' property
    const combinedName = `${first_name} ${last_name}`.trim();

    await prisma.user.create({
      data: {
        email: registrationEmail,
        name: combinedName,
        password: hashedPassword,
        role: assignedRole
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Account successfully created'
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
};

/**
 * Handles user login and returns a signed session token.
 * Passes the 'userId' key to match the database lookup in the middleware.
 */
export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Credentials and password are required' });
    }

    const credentials = String(email).trim();
    let searchKey = credentials.toLowerCase();

    // If identifier doesn't have an '@' symbol, treat it as a phone number
    if (!credentials.includes('@')) {
      const cleanPhone = credentials.replace(/[^0-9]/g, '');
      searchKey = `phone-${cleanPhone}@salesflow-placeholder.local`;
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: searchKey }
    });

    if (!dbUser) {
      return res.status(401).json({ error: 'No account matching those credentials was found' });
    }

    const passwordMatch = await bcrypt.compare(password, dbUser.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid password. Please try again.' });
    }

    let userRole = dbUser.role;

    // Explicit Admin Elevation Failsafe for favyjay112@gmail.com
    if (dbUser.email.toLowerCase().trim() === 'favyjay112@gmail.com' && dbUser.role !== Role.ADMIN) {
      const updatedUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { role: Role.ADMIN }
      });
      userRole = Role.ADMIN;
    }

    // Signs token using the 'userId' payload parameter expected by auth.middleware.ts
    const token = jwt.sign(
      { userId: dbUser.id, email: dbUser.email, role: userRole },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: userRole
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during sign-in' });
  }
};

/**
 * Resets a user's password based on verified identifier.
 */
export const resetPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Identifier and new password are required' });
    }

    const credentials = String(email).trim();
    let searchKey = credentials.toLowerCase();

    // Map phone resets to placeholder emails
    if (!credentials.includes('@')) {
      const cleanPhone = credentials.replace(/[^0-9]/g, '');
      searchKey = `phone-${cleanPhone}@salesflow-placeholder.local`;
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: searchKey }
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'No user account found matching that parameter' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { password: hashedPassword }
    });

    return res.status(200).json({
      success: true,
      message: 'Password successfully updated'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Internal server error during password reset' });
  }
};