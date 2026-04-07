import express from 'express';
// อย่าลืมว่าต้องมี .js ต่อท้ายเสมอ
import { register } from '../controllers/UserController.js';

const router = express.Router();

// เส้นทาง: /api/users/register
router.post('/register', register);

export default router;