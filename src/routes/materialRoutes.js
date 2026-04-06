import express from "express";
import {
  getMaterialById,
  approveMaterialRequest, 
  getAllMaterials, addNewMaterial, updateMaterialById, deleteMaterialById

} from "../controllers/materialController.js";

const materialRouter = express.Router();

// --- หมวดหมู่ Materials ---

// materialRouter.get("/materials", async (req, res) => {
//   // #swagger.tags = ['Materials']
//   // #swagger.summary = 'ดึงข้อมูลอุปกรณ์/วัสดุทั้งหมด'
//   getMaterials(req, res);
// });

materialRouter.get("/:id", async (req, res) => {
  // #swagger.tags = ['Materials']
  // #swagger.summary = 'ดึงข้อมูลอุปกรณ์ตาม ID'
  getMaterialById(req, res);
});

// materialRouter.post("/create", async (req, res) => {
//   // #swagger.tags = ['Materials']
//   // #swagger.summary = 'เพิ่มรายการอุปกรณ์ใหม่'
//   /* #swagger.parameters['body'] = {
//       in: 'body',
//       schema: { name: 'สายไฟ AWG', quantity: 100, unit: 'เมตร' }
//   } */
//   createMaterial(req, res);
// });

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

// 1. ดึงรายการวัสดุทั้งหมด (ใครๆ ก็ดูได้)
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

// 2. เพิ่มวัสดุใหม่ (ใครๆ ก็เพิ่มได้)
materialRouter.post('/add', async (req, res) => {
    try {
        await addNewMaterial(req.body);
        res.status(201).json({ message: 'Created' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



// 3. ลบวัสดุ (ใครๆ ก็ลบได้)
materialRouter.delete('/:id', async (req, res) => {
    try {
        await deleteMaterialById(req.params.id);
        res.status(200).json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//PUT /🆔 แก้ไขข้อมูลวัสดุ (เช่น แก้ไขชื่อ หรืออัปเดตจำนวนสต็อกหลัก
materialRouter.put('/:id', async (req, res) => {
  try {
    await updateMaterialById(req.params.id, req.body);
    res.status(200).json({ message: 'Updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});




export default materialRouter;