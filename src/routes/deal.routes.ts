import { Router } from 'express';
import { createDeal, updateDealStage } from '../controllers/deal.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// Secure all pipeline routes with your JWT protection middleware
router.post('/', protect, createDeal);
router.patch('/:id/stage', protect, updateDealStage);

export default router;