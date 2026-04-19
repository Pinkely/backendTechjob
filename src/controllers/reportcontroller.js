import pool from '../config/db.js'

// ดึงรีพอตทั้งหมดของ supervisor
export const getReportsBySupervisorId = async (supervisorId) => {
  const [rows] = await pool.execute(`
    SELECT 
      wr.*,
      w.job_name,
      w.job_type,
      w.customer_name,
      CONCAT(u.first_name, ' ', u.last_name) AS technician_name
    FROM work_report wr
    JOIN work w ON wr.work_id = w.work_id
    JOIN users u ON wr.technician_id = u.user_id
    WHERE w.supervisor_id = ?
    ORDER BY wr.created_at DESC
  `, [supervisorId])
  return rows
}

// ดึงรายการวัสดุที่แนบมากับรีพอต
export const getMaterialsByReportId = async (reportId) => {
  const [rows] = await pool.execute(`
    SELECT 
      mr.*,
      m.name AS material_name,
      m.unit,
      m.price
    FROM material_request mr
    JOIN material m ON mr.material_id = m.material_id
    WHERE mr.report_id = ?
  `, [reportId])
  return rows
}

// หัวหน้าตรวจรีพอต: ผ่าน → หักคลัง / ไม่ผ่าน → แค่อัปเดตสถานะ
export const reviewReport = async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const { reportId } = req.params
    const { status, supervisor_comment } = req.body
    // status: 'ผ่าน' | 'ไม่ผ่าน'

    // 1. อัปเดตสถานะรีพอต
    const [updateResult] = await conn.execute(
      `UPDATE work_report SET status = ?, supervisor_comment = ? WHERE report_id = ?`,
      [status, supervisor_comment || null, reportId]
    )

    if (updateResult.affectedRows === 0) {
      await conn.rollback()
      return res.status(404).json({ message: 'ไม่พบรีพอตนี้' })
    }

    if (status === 'ผ่าน') {
      // 2. ดึงรายการวัสดุที่ช่างแนบมา
      const [materials] = await conn.execute(
        `SELECT mr.material_id, mr.quantity 
         FROM material_request mr 
         WHERE mr.report_id = ?`,
        [reportId]
      )

      // 3. หักคลังวัสดุทีละรายการ
      for (const item of materials) {
        const [stock] = await conn.execute(
          `SELECT quantity FROM material WHERE material_id = ?`,
          [item.material_id]
        )
        if (!stock.length || stock[0].quantity < item.quantity) {
          await conn.rollback()
          return res.status(400).json({
            message: `วัสดุ ID ${item.material_id} มีในคลังไม่เพียงพอ (มี ${stock[0]?.quantity ?? 0}, ต้องการ ${item.quantity})`
          })
        }
        await conn.execute(
          `UPDATE material SET quantity = quantity - ? WHERE material_id = ?`,
          [item.quantity, item.material_id]
        )
      }

      // 4. อัปเดตสถานะงานเป็นเสร็จสิ้น
      await conn.execute(
        `UPDATE work SET status = 'เสร็จสิ้น' 
         WHERE work_id = (SELECT work_id FROM work_report WHERE report_id = ?)`,
        [reportId]
      )
    }

    await conn.commit()
    res.status(200).json({ message: `ตรวจรีพอตสำเร็จ: ${status}` })
  } catch (error) {
    await conn.rollback()
    console.error('reviewReport error:', error)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' })
  } finally {
    conn.release()
  }
}