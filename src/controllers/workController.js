import pool from '../config/db.js'

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

// ✅ ดึง status จาก work_assign ด้วย (assign_status) เพราะ status จริงอยู่ที่นั่น
export const getWorksByTechnicianId = async (id) => {
  const [rows] = await pool.execute(
    `SELECT w.*, wa.status AS assign_status
     FROM work w
     JOIN work_assign wa ON w.work_id = wa.work_id
     WHERE wa.technician_id = ?
     ORDER BY w.start_date DESC`,
    [id]
  );
  return rows;
};

export const updateWorkStatus = async (id, status) => {
  const [result] = await pool.execute(
    `UPDATE work SET status = ? WHERE work_id = ?`,
    [status, id]
  );
  return result;
};

export const updateTechnicianStatus = async (req, res) => {
  try {
    const { id, techId } = req.params;
    const { status } = req.body;

    const [result] = await pool.query(
      "UPDATE work_assign SET status = ? WHERE work_id = ? AND technician_id = ?",
      [status, id, techId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลการมอบหมายงานนี้" });
    }

    res.status(200).json({ message: "ช่างอัปเดตสถานะงานสำเร็จ", status: status });
  } catch (error) {
    console.error("Error in updateTechnicianStatus:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
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
// ✅ ดึงรายการวัสดุ/ค่าใช้จ่ายทั้งหมดของงาน
export const getExpensesByWorkId = async (id) => {
  const [rows] = await pool.execute(
    `SELECT * FROM work_expense WHERE work_id = ? ORDER BY created_at ASC`,
    [id]
  );
  return rows;
};