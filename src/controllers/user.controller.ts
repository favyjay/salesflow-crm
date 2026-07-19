import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../database/prisma';
import { Role } from '@prisma/client';

/**
 * Fetches all registered users. Restricted to ADMIN and SALES_MANAGER.
 */
export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    // Restrict user listing to elevated roles for security
    const userRole = req.user.role;
    if (userRole !== 'ADMIN' && userRole !== 'SALES_MANAGER') {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view users' });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ error: 'Internal server error fetching users' });
  }
};

/**
 * Updates a user's role. Restricted strictly to ADMIN.
 */
export const updateUserRole = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    // Only ADMINs can modify user roles
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can modify user roles' });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(Role).includes(role as Role)) {
      return res.status(400).json({ error: 'Valid role is required (ADMIN, SALES_MANAGER, or SALES_REP)' });
    }

    // Prevent admin from demoting themselves (failsafe)
    if (id === req.user.id && role !== 'ADMIN') {
      return res.status(400).json({ error: 'Failsafe: You cannot demote yourself from the Administrator role' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
      select: { id: true, name: true, role: true }
    });

    return res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user role error:', error);
    return res.status(500).json({ error: 'Internal server error updating user role' });
  }
};