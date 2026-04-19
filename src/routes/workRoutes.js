import { Router } from 'express'
import {
  createWork, assignWorkToUser, getWorksByUserId, getAllWorks, getWorkById,
  updateWork, deleteWork, getWorksByTechnicianId, updateWorkStatus,
  getWorksBySupervisorId, getWorksBySupervisorIdToday, updateTechnicianStatus, reviewWork
} from '../controllers/workController.js'

const workRouter = Router()

// --- หมวดหมู่การจัดการงาน (Works) ---

workRouter.post('/creatework', async (req, res) => {
  // #swagger.tags = ['Works']
  // #swagger.summary = 'สร้างใบงานใหม่'
  try {
    const rows = await createWork(req.body)
    res.status(201).json({ message: 'Created', workId: rows.insertId })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
})

workRouter.post('/assign/:id', async (req, res) => {
  // #swagger.tags = ['Works']
  // #swagger.summary = 'มอบหมายงานให้ช่าง'
  try {
    const { id } = req.params
    const { technician_id } = req.body
    await assignWorkToUser({ work_id: id, technician_id })
    res.status(201).json({ message: 'Assigned' })
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' })
  }
})

workRouter.get('/getAll', async (req, res) => {
  // #swagger.tags = ['Works']
  // #swagger.summary = 'ดึงข้อมูลใบงานทั้งหมด'
  try {
    const rows = await getAllWorks()
    res.status(200).json({ message: 'Ok', works: rows })
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' })
  }
})

workRouter.get('/getById/:id', async (req, res) => {
  // #swagger.tags = ['Works']
  // #swagger.summary = 'ดึงข้อมูลใบงานตาม ID'
  try {
    const { id } = req.params
    const rows = await getWorkById(id)
    if (rows.length === 0)
      return res.status(404).json({ message: 'Not Found' })
    res.status(200).json({ message: 'Ok', work: rows[0] })
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' })
  }
})

workRouter.put('/update/:id', async (req, res) => {
  // #swagger.tags = ['Works']
  // #swagger.summary = 'อัปเดตรายละเอียดใบงาน'
  try {
    const { id } = req.params
    const result = await updateWork({ ...req.body, work_id: id })
    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Not Found' })
    res.status(200).json({ message: 'Updated' })
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' })
  }
})

workRouter.delete('/delete/:id', async (req, res) => {
  // #swagger.tags = ['Works']
  // #swagger.summary = 'ลบใบงาน'
  try {
    const { id } = req.params
    const result = await deleteWork(id)
    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Not Found' })
    res.status(200).json({ message: 'Deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' })
  }
})

// ✅ ดึงงานทั้งหมดของ supervisor — ใช้ใน LeaderDashboard (รายการงานทั้งหมด)
workRouter.get('/supervisor/:id', async (req, res) => {
  // #swagger.tags = ['Works']
  // #swagger.summary = 'ดึงใบงานตาม ID หัวหน้างาน (Supervisor)'
  try {
    const { id } = req.params
    const rows = await getWorksBySupervisorId(id)
    res.status(200).json({ message: 'Ok', works: rows })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
})

// ✅ ดึงงานของ supervisor ที่ start_date = วันนี้ — ใช้นับ "งานวันนี้" ใน Dashboard
workRouter.get('/supervisor/:id/today', async (req, res) => {
  // #swagger.tags = ['Works']
  // #swagger.summary = 'ดึงใบงานของ Supervisor ที่ start_date เป็นวันนี้'
  try {
    const { id } = req.params
    const rows = await getWorksBySupervisorIdToday(id)
    res.status(200).json({ message: 'Ok', works: rows })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
})

workRouter.get('/technician/:id', async (req, res) => {
  // #swagger.tags = ['Works']
  // #swagger.summary = 'ดึงใบงานตาม ID ช่าง (Technician)'
  try {
    const { id } = req.params;
    const rows = await getWorksByTechnicianId(id);
    res.status(200).json({ message: 'Ok', works: rows });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
})

workRouter.patch('/:id/status', async (req, res) => {
  // #swagger.tags = ['Works']
  // #swagger.summary = 'อัปเดตสถานะใบงาน'
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await updateWorkStatus(id, status);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Work Not Found' });
    res.status(200).json({ message: 'Status Updated' });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
})

workRouter.patch('/:id/assign/:techId/status', async (req, res) => {
  // #swagger.tags = ['Works']
  // #swagger.summary = 'ช่างอัปเดตสถานะงานที่ได้รับมอบหมาย'
  updateTechnicianStatus(req, res);
});

workRouter.patch('/:id/assign/:techId/review', async (req, res) => {
  // #swagger.tags = ['Works']
  // #swagger.summary = 'หัวหน้างานตรวจรับงานและประเมิน'
  reviewWork(req, res);
});

export default workRouter