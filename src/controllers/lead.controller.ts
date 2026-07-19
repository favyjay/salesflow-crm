import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../database/prisma';

/**
 * Creates a new lead in the CRM database.
 */
export const createLead = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const { firstName, lastName, companyName, email, value, source, assignedRepId } = req.body;

    if (!firstName || !lastName || !companyName) {
      return res.status(400).json({ error: 'First name, last name, and company name are required' });
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // Create the lead in PostgreSQL using the named prisma client
    const newLead = await prisma.lead.create({
      data: {
        name: fullName,
        company: companyName,
        email: email || null,
        value: value ? parseFloat(value) : 0.0,
        source: source || 'Other',
        assignedRepId: assignedRepId || req.user.id, // Defaults to the creator if not specified
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      lead: newLead,
    });
  } catch (error) {
    console.error('Create lead error:', error);
    return res.status(500).json({ error: 'Internal server error during lead creation' });
  }
};

/**
 * Fetches all leads. Scope is automatically filtered by user role.
 */
export const getLeads = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Filter rule: Admin and Sales Managers can see all leads.
    // Sales Representatives can only see leads assigned specifically to them.
    const isElevatedRole = userRole === 'ADMIN' || userRole === 'SALES_MANAGER';
    const filter = isElevatedRole ? {} : { assignedRepId: userId };

    const leads = await prisma.lead.findMany({
      where: filter,
      include: {
        assignedRep: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map database fields to camelCase properties expected by the frontend
    const mappedLeads = leads.map(lead => {
      const nameParts = lead.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        id: lead.id,
        firstName,
        lastName,
        companyName: lead.company,
        status: lead.status.toLowerCase(), // Frontend checks against lowercase 'converted'
        assignedRep: lead.assignedRep
      };
    });

    return res.status(200).json({ success: true, leads: mappedLeads });
  } catch (error) {
    console.error('Fetch leads error:', error);
    return res.status(500).json({ error: 'Internal server error fetching leads' });
  }
};

/**
 * Converts a lead to a Customer inside a safe relational database transaction.
 */
export const convertLead = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const { id } = req.params;

    // Find the lead first
    const lead = await prisma.lead.findUnique({
      where: { id }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (lead.status === 'CONVERTED') {
      return res.status(400).json({ error: 'Lead is already converted' });
    }

    // Convert lead inside a database transaction to prevent partial saves
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create a Customer record
      const customer = await tx.customer.create({
        data: {
          name: lead.name,
          email: lead.email || `${lead.name.replace(/\s+/g, '').toLowerCase()}_unlinked@salesflow.com`,
          phone: lead.phone,
          company: lead.company,
          assignedRepId: lead.assignedRepId,
          convertedFromLeadId: lead.id
        }
      });

      // 2. Update the Lead status to CONVERTED
      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: { status: 'CONVERTED' }
      });

      return { customer, lead: updatedLead };
    });

    return res.status(200).json({
      success: true,
      message: 'Lead successfully converted to customer',
      data: result
    });
  } catch (error) {
    console.error('Lead conversion error:', error);
    return res.status(500).json({ error: 'Internal server error converting lead' });
  }
};

/**
 * Deletes a lead record from the database.
 */
export const deleteLead = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verify ownership if user is not ADMIN or SALES_MANAGER
    const isElevatedRole = userRole === 'ADMIN' || userRole === 'SALES_MANAGER';
    
    const lead = await prisma.lead.findUnique({
      where: { id }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (!isElevatedRole && lead.assignedRepId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this record' });
    }

    await prisma.lead.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: 'Lead successfully deleted'
    });
  } catch (error) {
    console.error('Delete lead error:', error);
    return res.status(500).json({ error: 'Internal server error deleting lead' });
  }
};