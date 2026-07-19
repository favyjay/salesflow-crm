import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../database/prisma';

/**
 * Fetches all converted customers/contacts. Scope is automatically filtered by user role.
 */
export const getCustomers = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Filter rule: Admin and Sales Managers can see all customers.
    // Sales Representatives can only see customers assigned specifically to them.
    const isElevatedRole = userRole === 'ADMIN' || userRole === 'SALES_MANAGER';
    const filter = isElevatedRole ? {} : { assignedRepId: userId };

    const customers = await prisma.customer.findMany({
      where: filter,
      include: {
        assignedRep: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map database fields to properties expected by the frontend contacts view
    const mappedContacts = customers.map(customer => {
      const nameParts = customer.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        id: customer.id,
        firstName,
        lastName,
        companyName: customer.company || '',
        email: customer.email || '',
        phone: customer.phone || '',
        assignedRep: customer.assignedRep
      };
    });

    return res.status(200).json({ success: true, contacts: mappedContacts });
  } catch (error) {
    console.error('Fetch customers error:', error);
    return res.status(500).json({ error: 'Internal server error fetching customers' });
  }
};

/**
 * Fetches an individual customer profile with full details and history.
 */
export const getCustomerProfile = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const isElevatedRole = userRole === 'ADMIN' || userRole === 'SALES_MANAGER';

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        assignedRep: {
          select: { id: true, name: true, email: true }
        },
        deals: true,
        tasks: true,
        notes: true,
        emailLogs: true,
        activities: true
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Role safety guard
    if (!isElevatedRole && customer.assignedRepId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this profile' });
    }

    return res.status(200).json({
      success: true,
      customer
    });
  } catch (error) {
    console.error('Fetch customer profile error:', error);
    return res.status(500).json({ error: 'Internal server error fetching customer details' });
  }
};