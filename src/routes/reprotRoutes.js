import { Router } from 'express'
import {
  getReportsBySupervisorId,
  getMaterialsByReportId,
  reviewReport
} from '../controllers/reportController.js'

const reportRouter = Router()

// ดึงรีพอตทั้งหมดของ supervisor
reportRouter.get('/supervisor/:supervisorId', async (req, res) => {
  // #swagger.tags = ['Reports']
  // #swagger.summary = 'ดึงรายการรีพอตของ supervisor'
  try {
    const rows = await getReportsBySupervisorId(req.params.supervisorId)
    res.status(200).json({ message: 'Ok', reports: rows })
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message })
  }
})

// ดึงรายการวัสดุที่แนบกับรีพอต
reportRouter.get('/:reportId/materials', async (req, res) => {
  // #swagger.tags = ['Reports']
  // #swagger.summary = 'ดึงรายการวัสดุของรีพอต'
  try {
    const rows = await getMaterialsByReportId(req.params.reportId)
    res.status(200).json({ message: 'Ok', materials: rows })
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message })
  }
})

// หัวหน้าตรวจรีพอต (ผ่าน/ไม่ผ่าน) → ถ้าผ่านหักคลังอัตโนมัติ
reportRouter.patch('/:reportId/review', reviewReport)

export default reportRouter