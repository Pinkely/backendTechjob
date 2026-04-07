const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');

// กำหนด Endpoint สำหรับดึงข้อมูล
router.get('/inventory', managerController.getInventoryLogs);
router.get('/dashboard', managerController.getFinancialDashboard);
router.get('/employees/history', managerController.getEmployeeHistory);

module.exports = router;