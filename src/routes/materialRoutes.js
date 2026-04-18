import express from 'express';
// แก้ไขบรรทัดนี้ โดยการเพิ่มฟังก์ชันที่เหลือเข้าไป
import { 
    getAllMaterials, 
    getAllRequests, 
    getMaterialById, 
    approveMaterialRequest, 
    addNewMaterial, 
    updateMaterialById, 
    deleteMaterialById
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
  try {
    const { id } = req.params;
    const { status, admin_id } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Bad Request: กรุณาระบุ status' });
    }

    const result = await approveMaterialRequest({ id, status, admin_id });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Not Found: ไม่พบข้อมูลคำขอนี้' });
    }

    res.status(200).json({ message: 'อัปเดตสถานะและตัดยอดสต็อกเรียบร้อยแล้ว' });
  } catch (error) {
    console.error(error);
    // ส่ง message จาก throw new Error(...) ใน controller ไปแสดงที่หน้าเว็บ
    res.status(400).json({ message: error.message || 'Internal Server Error' });
  }
});


// 1. ดึงรายการวัสดุทั้งหมด 
materialRouter.get('/', async (req, res) => {
    try {
        const rows = await getAllMaterials();
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

export default materialRouter;
