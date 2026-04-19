import pool from "../config/db.js";
import db from '../config/db.js';

const query = async (sql, params) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

export const getMaterialById = async (req, res) => {
  const { id } = req.params;
  try {
    // แก้ไขเป็น material_id และตาราง material
    const [rows] = await pool.query("SELECT * FROM material WHERE material_id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Material not found" });
    res.status(200).json({ message: "Success", material: rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// GET ทั้งหมด
export const getAllMaterials = async () => {
    return await query("SELECT * FROM material ORDER BY material_id DESC", []);
};


// POST เพิ่มวัสดุใหม่
export const addNewMaterial = async ({ material_code, name, quantity, unit }) => {
  const sql = "INSERT INTO material (material_code, name, quantity, unit, status) VALUES (?, ?, ?, ?, 'มี')";
  return await query(sql, [material_code, name, quantity, unit]);
};

// PUT แก้ไขวัสดุ
export const updateMaterialById = async (id, { name, quantity, unit }) => {
  const sql = "UPDATE material SET name=?, quantity=?, unit=? WHERE material_id=?";
  return await query(sql, [name, quantity, unit, id]);
};

// DELETE ลบวัสดุ
export const deleteMaterialById = async (id) => {
  return await query("DELETE FROM material WHERE material_id=?", [id]);
};


export const approveMaterialRequest = async ({ id, status, admin_id }) => {
  const [result] = await pool.execute(
    // แก้ไขจาก WHERE id = ? เป็น WHERE request_id = ?
    "UPDATE material_request SET status = ?, admin_id = ? WHERE request_id = ?",
    [status, admin_id || null, id]
  )
  return result
}

// แก้ไขฟังก์ชันนี้ใน materialController.js
export const getAllRequests = async () => {
    // JOIN ข้อมูลตารางวัสดุ และตารางผู้ใช้งาน เพื่อเอาชื่อมาแสดงผล
    const sql = `
        SELECT 
            mr.request_id, 
            mr.quantity, 
            mr.status, 
            mr.request_at,
            m.name AS material_name, 
            m.unit,
            u.name AS tech_name
        FROM material_request mr
        LEFT JOIN material m ON mr.material_id = m.material_id
        LEFT JOIN users u ON mr.technician_id = u.user_id
        ORDER BY mr.request_id DESC
    `;
    return await query(sql, []);
};

//โชว์ประวัติการขอวัสดุของช่างแต่ละคน
export const getRequestsByUserId = async (userId) => {
    try {
        const sql = `
            SELECT 
                mr.request_id, 
                mr.quantity, 
                IFNULL(mr.status, 'รอดำเนินการ') AS status, 
                mr.request_at,
                -- ถ้า material_id เป็น NULL ให้แสดงชื่อที่ผู้ใช้พิมพ์มา (ถ้ามี) หรือบอกว่าไม่ระบุ
                IFNULL(m.name, 'วัสดุทั่วไป (ไม่ได้ระบุ ID)') AS material_name
            FROM material_request mr
            LEFT JOIN material m ON mr.material_id = m.material_id
            WHERE mr.technician_id = ?
            ORDER BY mr.request_at DESC
        `;
        const rows = await query(sql, [userId]);
        return rows;
    } catch (error) {
        console.error("Database Error:", error);
        throw error;
    }
};