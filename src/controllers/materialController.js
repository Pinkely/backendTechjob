import db from '../config/db.js';

const query = async (sql, params) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

export const getAllMaterials = async (req, res) => {
  try {
    const [materials] = await db.execute('SELECT * FROM material');
    res.status(200).json(materials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
    "UPDATE material_request SET status = ?, admin_id = ? WHERE id = ?",
    [status, admin_id || null, id]
  )
  return result
} 
