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
export const addNewMaterial = async ({ material_code, name, quantity, unit, price }) => {
  // เพิ่ม price เข้าไปในคำสั่ง INSERT
  const sql = "INSERT INTO material (material_code, name, quantity, unit, price, status) VALUES (?, ?, ?, ?, ?, 'มี')";
  // นำค่า price เข้าไปผูกตัวแปร (ถ้าไม่กรอกมาให้ default เป็น 0)
  return await query(sql, [material_code, name, quantity, unit, price || 0]);
};

// PUT แก้ไขวัสดุ
export const updateMaterialById = async (id, { name, quantity, unit, price }) => {
  // เพิ่ม price เข้าไปในคำสั่ง UPDATE
  const sql = "UPDATE material SET name=?, quantity=?, unit=?, price=? WHERE material_id=?";
  return await query(sql, [name, quantity, unit, price || 0, id]);
};
// DELETE ลบวัสดุ
export const deleteMaterialById = async (id) => {
  return await query("DELETE FROM material WHERE material_id=?", [id]);
};


export const approveMaterialRequest = async ({ id, status, admin_id }) => {
  // ดึง connection มาเพื่อทำ Transaction (เพื่อให้การอัปเดตทั้ง 2 ตารางเกิดขึ้นพร้อมกัน)
  const connection = await pool.getConnection(); 
  
  try {
    await connection.beginTransaction(); // เริ่ม Transaction

    // --- กรณีที่กด "อนุมัติ" เท่านั้น ถึงจะไปตัดยอดในคลัง ---
    if (status === 'อนุมัติ') {
      
      // 1. ดึงข้อมูลการเบิกเพื่อดูว่าเบิกวัสดุตัวไหน (material_id) และจำนวนเท่าไหร่ (quantity)
      const [requestRows] = await connection.execute(
        "SELECT material_id, quantity FROM material_request WHERE request_id = ?",
        [id]
      );

      if (requestRows.length === 0) {
        throw new Error("ไม่พบรายการเบิกที่ระบุ");
      }

      const { material_id, quantity: requestedQty } = requestRows[0];

      // 2. ตรวจสอบจำนวนคงเหลือในคลังปัจจุบัน (Table: material)
      const [materialRows] = await connection.execute(
        "SELECT quantity FROM material WHERE material_id = ?",
        [material_id]
      );

      if (materialRows.length === 0) {
        throw new Error("ไม่พบวัสดุนี้ในคลัง");
      }

      const currentStock = materialRows[0].quantity;

      // 3. เช็คว่าของในคลังพอให้เบิกไหม
      if (currentStock < requestedQty) {
        throw new Error("จำนวนวัสดุในคลังไม่เพียงพอสำหรับการเบิก");
      }

      // 4. ทำการลดจำนวนวัสดุในคลัง (UPDATE table material)
      await connection.execute(
        "UPDATE material SET quantity = quantity - ? WHERE material_id = ?",
        [requestedQty, material_id]
      );
    }

    // 5. อัปเดตสถานะการเบิกในตาราง material_request (ไม่ว่าจะ อนุมัติ หรือ ไม่อนุมัติ)
    const [result] = await connection.execute(
      "UPDATE material_request SET status = ?, admin_id = ? WHERE request_id = ?",
      [status, admin_id || null, id]
    );

    await connection.commit(); // บันทึกการเปลี่ยนแปลงทั้งหมดลง Database
    return result;

  } catch (error) {
    await connection.rollback(); // หากมี Error ในขั้นตอนใดก็ตาม ให้ยกเลิกการเปลี่ยนแปลงทั้งหมด (กันคลังลดแต่สถานะไม่เปลี่ยน)
    throw error; // ส่ง Error ไปที่ Route เพื่อตอบกลับ Client
  } finally {
    connection.release(); // คืน connection กลับเข้า pool
  }
};

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