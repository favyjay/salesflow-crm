import { Router } from 'express';
import { signup, login } from '../controllers/auth.controller';

const router = Router();

// Define auth endpoints
router.post('/signup', signup);
router.post('/login', login);

export default router;