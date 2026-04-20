import pool from '../config/db.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

export const createWork = async ({ job_name, customer_name, job_type, job_detail, location, start_date, work_time, job_price, supervisor_id, admin_id, }) => {
  const [rows] = await pool.execute(
    `INSERT INTO work (job_name, customer_name, job_type, job_detail, location, start_date, work_time, job_price, supervisor_id, admin_id) 
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      job_name || null,
      customer_name || null,
      job_type || null,
      job_detail || null,
      location || null,
      start_date || null,
      work_time || null,
      job_price || 0,
      supervisor_id || null,
      admin_id || null
    ]
  )
  return rows
}

export const assignWorkToUser = async ({ work_id, technician_id }) => {
  const [rows] = await pool.execute(
    `INSERT INTO work_assign (work_id, technician_id) VALUES (?,?)`,
    [work_id, technician_id]
  )
  return rows
}

const reportUploadDir = 'uploads/reports/'
if (!fs.existsSync(reportUploadDir)) {
  fs.mkdirSync(reportUploadDir, { recursive: true })
}
const reportStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, reportUploadDir),
  filename: (req, file, cb) => {
    cb(null, `report-${Date.now()}-${file.fieldname}${path.extname(file.originalname)}`)
  }
})

export const uploadReport = multer({ storage: reportStorage })

export const getWorksByUserId = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT w.*, wa.status AS assign_status
     FROM work w
     JOIN work_assign wa ON w.work_id = wa.work_id
     WHERE wa.technician_id = ?`,
    [userId]
  )
  return rows
}

export const getAllWorks = async () => {
  const [rows] = await pool.execute(`
    SELECT w.*,
           IFNULL(SUM(e.material_cost), 0) AS material_cost,
           IFNULL(SUM(e.other_cost), 0)    AS other_cost,
           IFNULL(SUM(e.total_cost), 0)    AS total_cost,
           (w.job_price - IFNULL(SUM(e.total_cost), 0)) AS profit
    FROM work w
    LEFT JOIN work_expense e ON w.work_id = e.work_id
    GROUP BY w.work_id
  `);
  return rows;
};

export const getWorkById = async (id) => {
  const [rows] = await pool.execute(`SELECT * FROM work WHERE work_id = ?`, [id])
  return rows
}

export const updateWork = async ({ work_id, job_name, customer_name, job_type, job_detail, location, start_date, work_time, job_price, supervisor_id, admin_id }) => {
  const [result] = await pool.execute(
    `UPDATE work SET job_name = ?, customer_name = ?, job_type = ?, job_detail = ?, location = ?, start_date = ?, work_time = ?, job_price = ?, supervisor_id = ?, admin_id = ? WHERE work_id = ?`,
    [job_name, customer_name, job_type, job_detail, location, start_date, work_time, job_price || 0, supervisor_id, admin_id, work_id]
  )
  return result
}

export const deleteWork = async (id) => {
  const [result] = await pool.execute(`DELETE FROM work WHERE work_id = ?`, [id])
  return result
}

export const getWorksBySupervisorId = async (supervisorId) => {
  const [rows] = await pool.execute(
    `SELECT w.*, GROUP_CONCAT(u.name SEPARATOR ', ') as technicianName
     FROM work w
     LEFT JOIN work_assign wa ON w.work_id = wa.work_id
     LEFT JOIN users u ON wa.technician_id = u.user_id
     WHERE w.supervisor_id = ? 
     GROUP BY w.work_id
     ORDER BY w.created_at DESC`,
    [supervisorId]
  )
  return rows
}

export const getWorksBySupervisorIdToday = async (supervisorId) => {
  const [rows] = await pool.execute(
    `SELECT w.*, GROUP_CONCAT(u.name SEPARATOR ', ') as technicianName
     FROM work w
     LEFT JOIN work_assign wa ON w.work_id = wa.work_id
     LEFT JOIN users u ON wa.technician_id = u.user_id
     WHERE w.supervisor_id = ? 
       AND DATE(w.start_date) = CURDATE()
     GROUP BY w.work_id
     ORDER BY w.work_time ASC`,
    [supervisorId]
  )
  return rows
}

export const updateWorkStatus = async (id, status) => {
  // สร้าง connection เพื่อใช้งาน Transaction
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction(); // เริ่ม Transaction

    // 1. อัปเดตสถานะงานหลัก
    const [updateResult] = await connection.execute(
      `UPDATE work SET status = ? WHERE work_id = ?`,
      [status, id]
    );

    // 2. ถ้าหัวหน้ากด "อนุมัติ" (ส่ง status มาเป็น 'เสร็จสิ้น') ให้คำนวณเรื่องเงิน
    if (status === 'เสร็จสิ้น') {
      
      // เช็คก่อนว่าเคยมีบันทึกบัญชีของงานนี้ไปแล้วหรือยัง (ป้องกันการกดอนุมัติซ้ำแล้วลงบัญชีเบิ้ล)
      const [existingExpense] = await connection.execute(
        `SELECT expense_id FROM work_expense WHERE work_id = ?`, 
        [id]
      );

      if (existingExpense.length === 0) {
        // ดึงราคาค่าจ้าง (รายรับ) ของงานนี้
        const [workData] = await connection.execute(
          `SELECT job_price FROM work WHERE work_id = ?`, 
          [id]
        );
        const revenue = workData[0]?.job_price || 0;

        // ดึงยอดรวมค่าวัสดุที่ช่างเบิกไป (รวมเฉพาะที่อนุมัติแล้ว) จากงานนี้
        const [materialData] = await connection.execute(
          `SELECT SUM(total_price) as total_mat_cost 
           FROM material_request 
           WHERE work_id = ? AND status = 'อนุมัติ'`, 
          [id]
        );
        const materialCost = materialData[0]?.total_mat_cost || 0;

        // กำหนดค่าใช้จ่ายอื่นๆ (ถ้ามีให้ดึงมาบวกเพิ่ม ในที่นี้ตั้งต้นเป็น 0)
        const otherCost = 0; 
        const totalCost = Number(materialCost) + Number(otherCost);

        // คำนวณกำไร (รายรับ - ต้นทุนรวม)
        const profit = Number(revenue) - totalCost;

        // บันทึกลงตาราง work_expense
        await connection.execute(
          `INSERT INTO work_expense 
           (work_id, material_cost, other_cost, total_cost, revenue, profit, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'บันทึกอัตโนมัติจากการตรวจรับงานโดยหัวหน้า', NOW())`,
          [id, materialCost, otherCost, totalCost, revenue, profit]
        );
      }
    }

    await connection.commit(); // ยืนยันการบันทึกข้อมูลทั้งหมด
    return updateResult;

  } catch (error) {
    await connection.rollback(); // ถ้าพังตรงไหน ให้ยกเลิกการบันทึกทั้งหมด
    console.error("Error in updateWorkStatus with Expense:", error);
    throw error;
  } finally {
    connection.release(); // คืน connection
  }
};

export const reviewWork = async (req, res) => {
  try {
    const { id, techId } = req.params;
    const { status, comment } = req.body;

    const [result] = await pool.query(
      "UPDATE work_assign SET status = ? WHERE work_id = ? AND technician_id = ?",
      [status, id, techId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลการมอบหมายงานนี้" });
    }

    res.status(200).json({
      message: "หัวหน้าอัปเดตผลการตรวจงานสำเร็จ",
      status: status,
      comment: comment || null
    });
  } catch (error) {
    console.error("Error in reviewWork:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
};

export const getExpensesByWorkId = async (id) => {
  const [rows] = await pool.execute(
    `SELECT * FROM work_expense WHERE work_id = ? ORDER BY created_at ASC`,
    [id]
  );
  return rows;
};

export const getWorksByTechnicianId = async (technicianId) => {
  const [rows] = await pool.query(
    `SELECT w.*,
            wa.status AS assign_status,
            wr.work_note, wr.materials_used, wr.finish_time,
            wr.before_image, wr.after_image, wr.other_image,
            wr.leader_comment
     FROM work w
     JOIN work_assign wa ON w.work_id = wa.work_id
     LEFT JOIN work_report wr ON w.work_id = wr.work_id AND wr.technician_id = wa.technician_id
     WHERE wa.technician_id = ?
     ORDER BY w.work_id DESC`,
    [technicianId]
  )
  return rows
}

export const updateTechnicianStatus = async (req, res) => {
  // สร้าง connection เพื่อใช้งาน Transaction (ป้องกันกรณีตัดสต็อกพัง แต่ข้อมูลอื่นบันทึกไปแล้ว)
  const connection = await pool.getConnection();

  try {
    const { id, techId } = req.params;
    // ✅ รับ materials_list เพิ่มเข้ามา
    const { status, work_status, work_note, materials_used, materials_list, finish_time } = req.body;

    const allowedAssignStatus = ['รับงาน', 'ส่งตรวจ', 'ผ่าน', 'ส่งกลับ'];
    const statusMap = {
      'submitted': 'ส่งตรวจ',
      'ส่งตรวจ': 'ส่งตรวจ',
      'PendingInspection': 'ส่งตรวจ',
      'accepted': 'รับงาน',
      'รับงาน': 'รับงาน',
    };
    const mappedStatus = statusMap[status] || status;

    if (!allowedAssignStatus.includes(mappedStatus)) {
      return res.status(400).json({
        message: `ค่า status '${status}' ไม่ถูกต้อง`,
        allowed: allowedAssignStatus
      });
    }

    await connection.beginTransaction(); // 🟢 เริ่ม Transaction

    const [assignRows] = await connection.query(
      'SELECT assign_id FROM work_assign WHERE work_id = ? AND technician_id = ?',
      [id, techId]
    );
    if (assignRows.length === 0) {
      throw new Error(`ไม่พบการมอบหมายงาน work_id=${id} technician_id=${techId}`);
    }

    // 1. อัปเดตสถานะ work_assign
    await connection.query(
      'UPDATE work_assign SET status = ?, tech_note = ?, finished_at = NOW() WHERE work_id = ? AND technician_id = ?',
      [mappedStatus, work_note || null, id, techId]
    );

    // 2. จัดการข้อมูล work_report
    const [existing] = await connection.query(
      'SELECT report_id FROM work_report WHERE work_id = ? AND technician_id = ?',
      [id, techId]
    );

    if (existing.length > 0) {
      await connection.query(
        `UPDATE work_report
         SET work_note=?, materials_used=?, finish_time=?, submitted_at=NOW()
         WHERE work_id=? AND technician_id=?`,
        [work_note || null, materials_used || null, finish_time || null, id, techId]
      );
    } else {
      await connection.query(
        `INSERT INTO work_report (work_id, technician_id, work_note, materials_used, finish_time, submitted_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [id, techId, work_note || null, materials_used || null, finish_time || null]
      );
    }

    // ✅ 3. จัดการข้อมูลวัสดุ: บันทึกประวัติและตัดคลังทันที
    if (materials_list && Array.isArray(materials_list) && materials_list.length > 0) {
      for (const item of materials_list) {
        // ดึงราคาต่อหน่วยปัจจุบันมาเพื่อเก็บบันทึกมูลค่า
        const [stock] = await connection.query(
          'SELECT price, quantity FROM material WHERE material_id = ?',
          [item.material_id]
        );

        if (stock.length > 0) {
          const pricePerUnit = stock[0].price || 0;
          const totalPrice = pricePerUnit * item.qty;

          // บันทึกลง material_request (ตั้งสถานะ 'อนุมัติ' เพราะถือว่าช่างเบิกใช้ไปกับหน้างานนี้แล้ว)
          await connection.query(
            `INSERT INTO material_request 
             (work_id, technician_id, material_id, quantity, price_per_unit, total_price, status, request_at)
             VALUES (?, ?, ?, ?, ?, ?, 'อนุมัติ', NOW())`,
            [id, techId, item.material_id, item.qty, pricePerUnit, totalPrice]
          );

          // ตัดสต็อกในตาราง material
          await connection.query(
            `UPDATE material SET quantity = quantity - ? WHERE material_id = ?`,
            [item.qty, item.material_id]
          );
        }
      }
    }

    // 4. อัปเดตสถานะงานหลัก (Work)
    const allowedWorkStatus = ['รอดำเนินการ', 'มอบหมายแล้ว', 'รอตรวจงาน', 'เสร็จสิ้น', 'ส่งกลับแก้ไข'];
    const finalWorkStatus = allowedWorkStatus.includes(work_status) ? work_status : 'รอตรวจงาน';
    await connection.query('UPDATE work SET status = ? WHERE work_id = ?', [finalWorkStatus, id]);

    await connection.commit(); // 🟢 บันทึก Transaction ทั้งหมด

    res.status(200).json({ message: `ส่งงานสำเร็จ สถานะ: ${finalWorkStatus}` });
  } catch (error) {
    if (connection) await connection.rollback(); // 🔴 หากเกิด Error กลางคลัง ให้ยกเลิกคำสั่ง SQL ทั้งหมดก่อนหน้า
    console.error('updateTechnicianStatus error:', error.message);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) connection.release(); // คืน connection
  }
};

export const uploadReportImages = async (req, res) => {
  try {
    const { workId } = req.params
    const files = req.files || {}

    const beforeImage = files.before_image?.[0]?.filename || null
    const afterImage = files.after_image?.[0]?.filename || null
    const otherImage = files.other_image?.[0]?.filename || null

    if (!beforeImage && !afterImage && !otherImage) {
      return res.status(400).json({ message: 'กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป' })
    }

    const [reports] = await pool.query(
      'SELECT report_id FROM work_report WHERE work_id = ? ORDER BY report_id DESC LIMIT 1',
      [workId]
    )

    if (reports.length === 0) {
      await pool.query(
        `INSERT INTO work_report (work_id, technician_id, before_image, after_image, other_image, submitted_at)
         SELECT ?, technician_id, ?, ?, ?, NOW()
         FROM work_assign WHERE work_id = ? LIMIT 1`,
        [workId, beforeImage, afterImage, otherImage, workId]
      )
    } else {
      const setClauses = []
      const values = []
      if (beforeImage) { setClauses.push('before_image = ?'); values.push(beforeImage) }
      if (afterImage) { setClauses.push('after_image = ?'); values.push(afterImage) }
      if (otherImage) { setClauses.push('other_image = ?'); values.push(otherImage) }
      values.push(workId)

      await pool.query(
        `UPDATE work_report SET ${setClauses.join(', ')} WHERE work_id = ?`,
        values
      )
    }

    res.status(200).json({
      message: 'อัปโหลดรูปภาพสำเร็จ',
      before_image: beforeImage,
      after_image: afterImage,
      other_image: otherImage,
    })
  } catch (error) {
    console.error('uploadReportImages error:', error)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์', error: error.message })
  }
}

export const submitWorkReport = async (req, res) => {
  try {
    const { work_id, technician_id, work_note, leader_comment } = req.body;
    const [result] = await pool.query(
      "INSERT INTO work_report (work_id, technician_id, work_note, leader_comment) VALUES (?, ?, ?, ?)",
      [work_id, technician_id || null, work_note, leader_comment || null]
    );
    res.status(201).json({ message: "ส่งรายงานสำเร็จ", reportId: result.insertId });
  } catch (error) {
    console.error("Error in submitWorkReport:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
};

export const getWorkReportsBySupervisor = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT wr.*, w.job_name, w.location 
       FROM work_report wr
       JOIN work w ON wr.work_id = w.work_id
       WHERE w.supervisor_id = ?
       ORDER BY wr.submitted_at DESC`,
      [id]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error in getWorkReportsBySupervisor:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
};

export const getPendingInspectionWorks = async (supervisorId) => {
  const [rows] = await pool.execute(
    `SELECT w.*, wr.before_image, wr.after_image, wr.other_image, wr.work_note, wr.materials_used, wr.submitted_at as finishDate,
            t.name as technicianName
     FROM work w
     INNER JOIN work_report wr ON w.work_id = wr.work_id
     LEFT JOIN users t ON wr.technician_id = t.user_id
     WHERE w.supervisor_id = ? AND w.status = 'รอตรวจงาน'
     ORDER BY wr.submitted_at DESC`,
    [supervisorId]
  );
  return rows;
}