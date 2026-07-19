import { Router } from 'express';
import { getLeads, createLead, convertLead, deleteLead } from '../controllers/lead.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// Secure lead endpoints with your JWT protection middleware
router.get('/', protect, getLeads);
router.post('/', protect, createLead);
router.post('/:id/convert', protect, convertLead);
router.delete('/:id', protect, deleteLead);

export default router;