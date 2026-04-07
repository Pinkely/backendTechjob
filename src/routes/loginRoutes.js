import express from 'express';
// ต้องใส่ .js ต่อท้ายไฟล์เสมอสำหรับ ES Module ใน Node
import { login, forgotPassword } from '../controllers/loginController.js';

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);

export default router;