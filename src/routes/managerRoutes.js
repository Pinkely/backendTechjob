import express from 'express';
import {
    getUserProfile,
    getAllEmployeesWithHistory,
    getFinancialReport,
    getMaterialUsage,
    updateUserProfile,
    updatePassword,
    getWorkRecords,
    upload,
    updateAvatar,
} from '../controllers/managerController.js';

const router = express.Router();

router.get('/profile/:id', getUserProfile);
router.post('/upload-avatar/:id', upload.single('avatar'), updateAvatar); router.get('/employees', getAllEmployeesWithHistory);
router.get('/financial-report', getFinancialReport);
router.get('/inventory', getMaterialUsage);
// เพิ่มเส้นทางสำหรับการ Update (ใช้ PUT)
router.put('/update-profile/:id', updateUserProfile);
// เพิ่มเส้นทางสำหรับการเปลี่ยนรหัสผ่าน
router.put('/update-password/:id', updatePassword);
// เพิ่ม Route สำหรับดึงประวัติงาน
router.get('/work-records', getWorkRecords);

export default router;