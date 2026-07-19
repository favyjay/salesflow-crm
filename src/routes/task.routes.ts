import { Router } from 'express';
import { createTask, getTasks, updateTaskStatus } from '../controllers/task.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// Secure all task endpoints with your JWT protection middleware
router.get('/', protect, getTasks);
router.post('/', protect, createTask);
router.patch('/:id/status', protect, updateTaskStatus);

export default router;