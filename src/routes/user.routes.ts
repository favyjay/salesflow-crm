import { Router } from 'express';
import { getUsers, updateUserRole } from '../controllers/user.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// Secure all user endpoints with your JWT protection middleware
router.get('/', protect, getUsers);
router.patch('/:id/role', protect, updateUserRole);

export default router;