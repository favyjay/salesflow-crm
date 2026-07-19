import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// Secure dashboard query with the JWT verification middleware
router.get('/summary', protect, getDashboardSummary);

export default router;