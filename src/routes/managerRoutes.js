import express from 'express';
import {
    getAllEmployeesWithHistory,
    getFinancialReport,
    getMaterialUsage
} from '../controllers/managerController.js';

const router = express.Router();

router.get('/employees', getAllEmployeesWithHistory);
router.get('/financial-report', getFinancialReport);
router.get('/inventory', getMaterialUsage);

export default router;