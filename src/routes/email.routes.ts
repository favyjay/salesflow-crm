import { Router } from 'express';
import { createEmailLog, getEmailLogs } from '../controllers/email.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// Secure all email endpoints with your JWT protection middleware
router.get('/', protect, getEmailLogs);
router.post('/', protect, createEmailLog);

export default router;