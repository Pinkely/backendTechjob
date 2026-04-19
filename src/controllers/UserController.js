import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ─── สมัครสมาชิก ─────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  const {
    username, password, name, email,
    role, type, phone, department, supervisor_id,
    nickname, expertise, salary
  } = req.body;

  try {
    const [existingEmail] = await pool.execute(
      'SELECT user_id FROM users WHERE email = ?', [email]
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    if (username) {
      const [existingUsername] = await pool.execute(
        'SELECT user_id FROM users WHERE username = ?', [username]
      );
      if (existingUsername.length > 0) {
        return res.status(400).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const sql = `
      INSERT INTO users 
        (username, password, name, role, type, status, email, phone,
         department, supervisor_id, nickname, expertise, salary)
      VALUES (?, ?, ?, ?, ?, 'ว่าง', ?, ?, ?, ?, ?, ?, ?)
    `;
    await pool.execute(sql, [
      username      || null,
      hashedPassword,
      name          || null,
      role          || 'technician',
      type          || null,
      email         || null,
      phone         || null,
      department    || null,
      supervisor_id || null,
      nickname      || null,
      expertise     || null,
      salary        ? parseFloat(salary) : 0,
    ]);

    return res.status(201).json({ message: 'ลงทะเบียนผู้ใช้งานสำเร็จ' });
  } catch (error) {
    console.error('Error in register:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์', error: error.message });
  }
};

// ─── ดึงข้อมูลตาม Role ────────────────────────────────────────────────────────
export const getUsersByRole = async (req, res) => {
  const { role } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT user_id, username, name, role, type, status, email,
              phone, department, supervisor_id, nickname,
              expertise, salary
       FROM users WHERE role = ?
       ORDER BY user_id ASC`,
      [role]
    );
    res.status(200).json({ message: "Success", users: rows });
  } catch (error) {
    console.error("Error in getUsersByRole:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ─── อัปเดตข้อมูลผู้ใช้ (รวม role, type, salary) ─────────────────────────────
// ─── อัปเดตข้อมูลผู้ใช้ (UserController.js) ─────────────────────────────
// ในไฟล์ UserController.js ฟังก์ชัน updateUser
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    // แก้ไขตรงนี้: เปลี่ยน typework เป็น type
    const { name, email, phone, department, nickname, 
            type, expertise, salary, role } = req.body; 

    const [existing] = await pool.query(
      "SELECT user_id FROM users WHERE user_id = ?", [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้งาน" });
    }

    const sql = `
      UPDATE users SET
        name        = ?,
        email       = ?,
        phone       = ?,
        department  = ?,
        nickname    = ?,
        type        = ?, 
        expertise   = ?,
        salary      = ?,
        role        = ?
      WHERE user_id = ?
    `;

    const values = [
      name        || null,
      email       || null,
      phone       || null,
      department  || null,
      nickname    || null,
      type        || null, // แก้ไขตรงนี้: ใช้ type
      expertise   || null,
      salary      ? parseFloat(salary) : 0,
      role        || 'technician',
      id
    ];

    await pool.query(sql, values);

    res.status(200).json({ message: "แก้ไขข้อมูลสำเร็จ" });
  } catch (error) {
    console.error("Error in updateUser:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์", error: error.message });
  }
};

// ─── ลบผู้ใช้ ─────────────────────────────────────────────────────────────────
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      "DELETE FROM users WHERE user_id = ?", [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }
    res.status(200).json({ message: "ลบผู้ใช้งานสำเร็จ" });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ─── ดึงข้อมูลผู้ใช้ตาม ID ───────────────────────────────────────────────────
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT user_id, username, name, email, phone, department,
              role, type, status, nickname, expertise,
              salary,created_at
       FROM users WHERE user_id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้งาน" });
    }
    res.status(200).json({ user: rows[0] });
  } catch (error) {
    console.error("Error in getUserById:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
};

// ─── เปลี่ยนรหัสผ่าน ──────────────────────────────────────────────────────────
export const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    const [rows] = await pool.query(
      "SELECT password FROM users WHERE user_id = ?", [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้งาน" });
    }

    const isValid = await bcrypt.compare(oldPassword, rows[0].password);
    if (!isValid) {
      return res.status(400).json({ message: "รหัสผ่านเดิมไม่ถูกต้อง" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      "UPDATE users SET password = ? WHERE user_id = ?", [hashedPassword, id]
    );
    res.status(200).json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (error) {
    console.error("Error in updatePassword:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
};

// ─── ✅ ดึงข้อมูลหัวหน้าของช่างคนนี้  GET /api/users/:id/supervisor ────────────
export const getMySupervisor = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT s.user_id AS supervisor_id, s.name, s.nickname,
              s.phone, s.email, s.department
       FROM users u
       INNER JOIN users s ON u.supervisor_id = s.user_id
       WHERE u.user_id = ?`, // แก้ไข: ใส่ Backticks และลบลูกน้ำ (,) ด้านหลัง ? ออก
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลหัวหน้า" });
    }
      
    res.status(200).json({ message: "ดึงข้อมูลหัวหน้าสำเร็จ", supervisor: rows[0] });
  } catch (error) {
    console.error('getMySupervisor error:', error);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
};

