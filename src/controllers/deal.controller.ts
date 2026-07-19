import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../database/prisma';
import { DealStage } from '@prisma/client';

// Map frontend casing to your PostgreSQL database enums
const STAGE_MAP: { [key: string]: DealStage } = {
  'Prospecting': DealStage.PROSPECTING,
  'Demo Scheduled': DealStage.DEMO_SCHEDULED,
  'Proposal Sent': DealStage.PROPOSAL_SENT,
  'Negotiation': DealStage.NEGOTIATION,
  'Won': DealStage.WON,
  'Lost': DealStage.LOST
};

/**
 * Creates a new deal opportunity linked to an active Customer.
 */
export const createDeal = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const { title, value, stage, customerId, expectedCloseDate } = req.body;

    if (!title || !customerId) {
      return res.status(400).json({ error: 'Deal title and customer ID are required' });
    }

    // Translate the incoming stage or default to Prospecting
    const dbStage = STAGE_MAP[stage] || DealStage.PROSPECTING;

    const newDeal = await prisma.deal.create({
      data: {
        title,
        value: value ? parseFloat(value) : 0.0,
        stage: dbStage,
        customerId,
        ownerId: req.user.id,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Deal opportunity created successfully',
      deal: newDeal
    });
  } catch (error) {
    console.error('Create deal error:', error);
    return res.status(500).json({ error: 'Internal server error creating deal' });
  }
};

/**
 * Updates a deal's sales stage when dragged and dropped on the Kanban board.
 */
export const updateDealStage = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const { id } = req.params;
    const { stage } = req.body;

    if (!stage) {
      return res.status(400).json({ error: 'New pipeline stage is required' });
    }

    // Convert frontend string to PostgreSQL database enum
    const dbStage = STAGE_MAP[stage];
    if (!dbStage) {
      return res.status(400).json({ error: 'Invalid pipeline stage value' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Check ownership unless user is ADMIN or SALES_MANAGER
    const isElevatedRole = userRole === 'ADMIN' || userRole === 'SALES_MANAGER';

    const deal = await prisma.deal.findUnique({
      where: { id }
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal opportunity not found' });
    }

    if (!isElevatedRole && deal.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to modify this opportunity' });
    }

    // Update the stage in PostgreSQL
    const updatedDeal = await prisma.deal.update({
      where: { id },
      data: { stage: dbStage }
    });

    return res.status(200).json({
      success: true,
      message: 'Pipeline stage updated successfully',
      deal: updatedDeal
    });
  } catch (error) {
    console.error('Update deal stage error:', error);
    return res.status(500).json({ error: 'Internal server error updating pipeline stage' });
  }
};