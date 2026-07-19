import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../database/prisma';

/**
 * Logs a manual email conversation linked to a customer.
 */
export const createEmailLog = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const { subject, message, customerId } = req.body;

    if (!subject || !message || !customerId) {
      return res.status(400).json({ error: 'Subject, message body, and customer ID are required' });
    }

    // Create the email log in PostgreSQL using the named prisma client
    const newEmail = await prisma.emailLog.create({
      data: {
        subject,
        message,
        customerId,
        senderId: req.user.id
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Email conversation logged successfully',
      email: newEmail
    });
  } catch (error) {
    console.error('Create email log error:', error);
    return res.status(500).json({ error: 'Internal server error logging email' });
  }
};

/**
 * Fetches manual email logs. Scope is automatically filtered by user role.
 */
export const getEmailLogs = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Filter rule: Admin and Sales Managers can see all email logs.
    // Sales Representatives can only see emails they sent.
    const isElevatedRole = userRole === 'ADMIN' || userRole === 'SALES_MANAGER';
    const filter = isElevatedRole ? {} : { senderId: userId };

    const emails = await prisma.emailLog.findMany({
      where: filter,
      include: {
        customer: {
          select: { name: true }
        }
      },
      orderBy: { sentDate: 'desc' }
    });

    // Map database fields to properties expected by the frontend email log view
    const mappedEmails = emails.map(email => ({
      id: email.id,
      subject: email.subject,
      message: email.message,
      date: email.sentDate.toLocaleDateString(),
      clientName: email.customer?.name || 'Unlinked Client'
    }));

    return res.status(200).json({ success: true, emails: mappedEmails });
  } catch (error) {
    console.error('Fetch email logs error:', error);
    return res.status(500).json({ error: 'Internal server error fetching email logs' });
  }
};