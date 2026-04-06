import { Router } from 'express'
import { 
  createWork, assignWorkToUser, getWorksByUserId, getAllWorks, getWorkById, 
  updateWork, deleteWork, getWorksByTechnicianId, updateWorkStatus, 
  getWorksBySupervisorId, updateTechnicianStatus, reviewWork 
} from '../controllers/workController.js'

const workRouter = Router()

// --- หมวดหมู่การจัดการงาน (Works) ---

workRouter.post('/creatework', async (req, res) => {
  // #swagger.tags = ['Works']
  // #swagger.summary = 'สร้างใบงานใหม่'
  /* #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        job_name: 'งานซ่อมบำรุง', customer_name: 'คุณสมชาย', job_type: 'ไฟฟ้า',
        job_detail: 'ไฟดับชั้น 2', location: 'ตึก A', start_date: '2024-03-25',
        work_time: '09:00', supervisor_id: 1, admin_id: 1
      }
  } */
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
  /* #swagger.parameters['id'] = { description: 'Work ID' } */
  /* #swagger.parameters['body'] = {
      in: 'body',
      schema: { technician_id: 5 }
  } */
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

// workRouter.get('/user/:id', async (req, res) => {
//   // #swagger.tags = ['Works']
//   // #swagger.summary = 'ดึงข้อมูลใบงานตาม ID ผู้ใช้งาน'
//   try {
//     const { id } = req.params
//     const rows = await getWorksByUserId(id)
//     res.status(200).json({ message: 'Ok', works: rows })
//   } catch (error) {
//     res.status(500).json({ message: 'Internal Server Error' })
//   }
// })

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
  /* #swagger.parameters['id'] = { description: 'Work ID' } */
  /* #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        job_name: 'ชื่อโครงการใหม่', customer_name: 'ชื่อลูกค้า', job_type: 'ประเภทงาน',
        job_detail: 'รายละเอียด', location: 'สถานที่', start_date: '2024-03-25',
        work_time: '10:00', supervisor_id: 1, admin_id: 1
      }
  } */
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
  /* #swagger.parameters['id'] = { description: 'Work ID' } */
  /* #swagger.parameters['techId'] = { description: 'Technician ID' } */
  /* #swagger.parameters['body'] = {
      in: 'body',
      schema: { status: 'completed', comment: 'งานเรียบร้อยดี' }
  } */
  reviewWork(req, res);
});

export default workRouter