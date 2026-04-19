import express from 'express';
// แก้ไขบรรทัดนี้ โดยการเพิ่มฟังก์ชันที่เหลือเข้าไป
import { 
    getAllMaterials, 
    getAllRequests, 
    getMaterialById, 
    approveMaterialRequest, 
    addNewMaterial, 
    updateMaterialById, 
    deleteMaterialById,
    getRequestsByUserId
} from '../controllers/materialController.js';

const materialRouter = express.Router();

materialRouter.get('/requests', async (req, res) => {
    try {
        // คุณต้องสร้างฟังก์ชัน getAllRequests ใน controller ก่อน
        const rows = await getAllRequests(); 
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

materialRouter.get("/:id", async (req, res) => {
  // #swagger.tags = ['Materials']
  // #swagger.summary = 'ดึงข้อมูลอุปกรณ์ตาม ID'
  getMaterialById(req, res);
});

materialRouter.patch('/request/:id/approve', async (req, res) => {
  // #swagger.tags = ['Materials']
  // #swagger.summary = 'อนุมัติหรือปฏิเสธคำขอเบิกอุปกรณ์'
  /* #swagger.parameters['id'] = { description: 'Request ID' } */
  /* #swagger.parameters['body'] = {
      in: 'body',
      schema: { status: 'approved', admin_id: 1 }
  } */
  try {
    const { id } = req.params
    const { status, admin_id } = req.body

    if (!status) {
      return res.status(400).json({ message: 'Bad Request: กรุณาระบุ status' })
    }

    const result = await approveMaterialRequest({ id, status, admin_id })

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Not Found: ไม่พบข้อมูลคำขอนี้' })
    }

    res.status(200).json({ message: 'Updated status successfully' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
})



// 1. ดึงรายการวัสดุทั้งหมด 
materialRouter.get('/', async (req, res) => {
    try {
        const rows = await getAllMaterials();
        console.log('ดึงข้อมูลสำเร็จ! เริสมาก');
        res.status(200).json(rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// 2. เพิ่มวัสดุใหม่ 
materialRouter.post('/add', async (req, res) => {
    try {
        await addNewMaterial(req.body);
        res.status(201).json({ message: 'Created' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



// 3. ลบวัสดุ 
materialRouter.delete('/:id', async (req, res) => {
    try {
        await deleteMaterialById(req.params.id);
        res.status(200).json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

materialRouter.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await updateMaterialById(id, req.body);
        res.status(200).json({ message: 'Updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// [เพิ่มใหม่] ดึงประวัติการเบิกวัสดุ เฉพาะของ User นั้นๆ
materialRouter.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const rows = await getRequestsByUserId(userId); // เรียกใช้ฟังก์ชันที่เราเพิ่งแก้
        res.status(200).json({ materials: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// [เพิ่มใหม่] รับเรื่องการเบิกวัสดุใหม่จากหน้า Dashboard
materialRouter.post('/request', async (req, res) => {
    try {
        // req.body ควรส่ง { user_id, material_name, quantity }
        await requestMaterial(req.body);
        res.status(201).json({ message: 'Request Sent Successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

export default materialRouter;
