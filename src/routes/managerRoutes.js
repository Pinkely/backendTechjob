import express from 'express';
import {
    getUserProfile,
    getAllEmployeesWithHistory,
    getFinancialReport,
    getMaterialUsage,
    updateUserProfile,
} from '../controllers/managerController.js';

const router = express.Router();

router.get('/profile/:id', getUserProfile);
router.get('/employees', getAllEmployeesWithHistory);
router.get('/financial-report', getFinancialReport);
router.get('/inventory', getMaterialUsage);
// เพิ่มเส้นทางสำหรับการ Update (ใช้ PUT)
router.put('/update-profile/:id', updateUserProfile);

export default router;