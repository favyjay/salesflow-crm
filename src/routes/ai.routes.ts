import { Router } from 'express';
import { summarizeLead, generateEmail, analyzePipeline } from '../controllers/ai.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// Protect all AI Copilot endpoints using JWT authentication
router.post('/leads/:id/summary', protect, summarizeLead);
router.post('/leads/:id/email', protect, generateEmail);
router.post('/pipeline/analyze', protect, analyzePipeline);

export default router;