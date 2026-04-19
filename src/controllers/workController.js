import pool from '../config/db.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

export const createWork = async ({ job_name, customer_name, job_type, job_detail, location, start_date, work_time, job_price, supervisor_id, admin_id }) => {
  const [rows] = await pool.execute(
    `INSERT INTO work (job_name, customer_name, job_type, job_detail, location, start_date, work_time, job_price, supervisor_id, admin_id) 
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [job_name, customer_name, job_type, job_detail, location, start_date, work_time, job_price || 0, supervisor_id, admin_id]
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
           -- คำนวณกำไรสดๆ: เอารายรับ(job_price) ลบด้วย ต้นทุนรวม(total_cost)
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
    `SELECT * FROM work WHERE supervisor_id = ? ORDER BY created_at DESC`,
    [supervisorId]
  )
  return rows
}

export const getWorksBySupervisorIdToday = async (supervisorId) => {
  const [rows] = await pool.execute(
    `SELECT * FROM work 
     WHERE supervisor_id = ? 
       AND DATE(start_date) = CURDATE()
     ORDER BY work_time ASC`,
    [supervisorId]
  )
  return rows
}


export const updateWorkStatus = async (id, status) => {
  const [result] = await pool.execute(
    `UPDATE work SET status = ? WHERE work_id = ?`,
    [status, id]
  );
  return result;
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
// ✅ ดึงรายการวัสดุ/ค่าใช้จ่ายทั้งหมดของงาน
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

// ── ดึงงานของช่างพร้อม work_report ──────────────────────────────────────────────────────────────────────────────

export const updateTechnicianStatus = async (req, res) => {
  try {
    const { id, techId } = req.params
    const { status, work_status, work_note, materials_used, finish_time } = req.body

    // Map ค่าที่รับมาให้ตรงกับ ENUM ใน DB
    const allowedAssignStatus = ['รับงาน', 'ส่งตรวจ', 'ผ่าน', 'ส่งกลับ']

    // รองรับทั้งภาษาไทยและภาษาอังกฤษจาก Frontend
    const statusMap = {
      'submitted': 'ส่งตรวจ',
      'ส่งตรวจ': 'ส่งตรวจ',
      'PendingInspection': 'ส่งตรวจ',   // เพิ่มบรรทัดนี้
      'accepted': 'รับงาน',
      'รับงาน': 'รับงาน',
    }
    const mappedStatus = statusMap[status] || status

    if (!allowedAssignStatus.includes(mappedStatus)) {
      return res.status(400).json({
        message: `ค่า status '${status}' ไม่ถูกต้อง`, // แก้ไข: ใส่ Backticks
        allowed: allowedAssignStatus
      })
    }

    // 1. ตรวจว่า work_assign มีข้อมูลนี้จริง
    const [assignRows] = await pool.query(
      'SELECT assign_id FROM work_assign WHERE work_id = ? AND technician_id = ?',
      [id, techId]
    )
    if (assignRows.length === 0) {
      return res.status(404).json({ message: `ไม่พบการมอบหมายงาน work_id=${id} technician_id=${techId}` }) // แก้ไข: ใส่ Backticks
    }

    // 2. อัปเดต work_assign.status ด้วยค่าที่ map แล้ว
    await pool.query(
      'UPDATE work_assign SET status = ?, tech_note = ?, finished_at = NOW() WHERE work_id = ? AND technician_id = ?',
      [mappedStatus, work_note || null, id, techId] // แก้ไข: เพิ่ม || ระหว่าง work_note กับ null
    )

    // 3. Upsert work_report
    const [existing] = await pool.query(
      'SELECT report_id FROM work_report WHERE work_id = ? AND technician_id = ?',
      [id, techId]
    )
    
    if (existing.length > 0) {
      await pool.query(
        `UPDATE work_report
         SET work_note=?, materials_used=?, finish_time=?, submitted_at=NOW()
         WHERE work_id=? AND technician_id=?`, // แก้ไข: ใส่ Backticks ครอบคำสั่ง SQL
        [work_note || null, materials_used || null, finish_time || null, id, techId] // แก้ไข: เพิ่ม || ให้ครบทุกตัว
      )
    } else {
      await pool.query(
        `INSERT INTO work_report (work_id, technician_id, work_note, materials_used, finish_time, submitted_at)
         VALUES (?, ?, ?, ?, ?, NOW())`, // แก้ไข: ใส่ Backticks ครอบคำสั่ง SQL
        [id, techId, work_note || null, materials_used || null, finish_time || null] // แก้ไข: เพิ่ม || ให้ครบทุกตัว
      )
    }

    // 4. อัปเดต work.status
    const allowedWorkStatus = ['รอดำเนินการ', 'มอบหมายแล้ว', 'รอตรวจงาน', 'เสร็จสิ้น', 'ส่งกลับแก้ไข']
    const finalWorkStatus = allowedWorkStatus.includes(work_status) ? work_status : 'รอตรวจงาน'
    await pool.query('UPDATE work SET status = ? WHERE work_id = ?', [finalWorkStatus, id])

    res.status(200).json({ message: `ส่งงานสำเร็จ สถานะ: ${finalWorkStatus}` }) // แก้ไข: ใส่ Backticks
  } catch (error) {
    console.error('updateTechnicianStatus error:', error.message)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์', error: error.message })
  }
}
// ── อัปโหลดรูปภาพรายงาน POST /works/:workId/report-images ────────────────────
export const uploadReportImages = async (req, res) => {
  try {
    const { workId } = req.params
    const files = req.files || {} // แก้ไข: เพิ่ม ||

    const beforeImage = files.before_image?.[0]?.filename || null // แก้ไข: เพิ่ม ||
    const afterImage = files.after_image?.[0]?.filename || null // แก้ไข: เพิ่ม ||
    const otherImage = files.other_image?.[0]?.filename || null // แก้ไข: เพิ่ม ||

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
         FROM work_assign WHERE work_id = ? LIMIT 1`, // แก้ไข: ใส่ Backticks ครอบคำสั่ง SQL
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
        `UPDATE work_report SET ${setClauses.join(', ')} WHERE work_id = ?`, // แก้ไข: ใส่ Backticks เพื่อใช้ Template Literals ได้
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