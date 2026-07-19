import { Router } from 'express';
import { getCustomers, getCustomerProfile } from '../controllers/customer.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// Secure customer endpoints with your JWT protection middleware
router.get('/', protect, getCustomers);
router.get('/:id', protect, getCustomerProfile);

export default router;