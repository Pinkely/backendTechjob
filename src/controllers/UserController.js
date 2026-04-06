import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'กรุณาระบุ username และ password' });
        }
        // ค้นหาผู้ใช้งานจากฐานข้อมูล
        const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' });
        }
        const user = users[0];
        // ตรวจสอบรหัสผ่านที่รับมา กับรหัสผ่านในฐานข้อมูล (ที่ถูก Hash ไว้)
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' });
        }
        // ดึง JWT_SECRET จากไฟล์ .env (ถ้าไม่มีให้ใช้ค่าเริ่มต้น)
        const secretKey = process.env.JWT_SECRET || 'my_super_secret_key_12345';
        // สร้าง Token
        const token = jwt.sign(
            { 
                user_id: user.user_id, 
                username: user.username, 
                role: user.role 
            },
            secretKey,
            { expiresIn: '2h' }
        );

        return res.status(200).json({
            message: 'เข้าสู่ระบบสำเร็จ',
            token: token
        });

    } catch (error) {
        console.error('Error in login:', error);
        return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
    }
};

// POST /users/register สำหรับลงทะเบียนผู้ใช้งานใหม่
export const register = async (req, res) => {
    try {
        const { username, password, name, role, type, status, email, phone, department, supervisor_id } = req.body;

        if (!username || !password || !name) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (username, password, name)' });
        }
        const [existingUsers] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Username นี้ถูกใช้งานแล้ว' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const sql = `
            INSERT INTO users 
            (username, password, name, role, type, status, email, phone, department, supervisor_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            username, 
            hashedPassword, 
            name, 
            role || null,
            type || null, 
            status || 'ว่าง',
            email || null, 
            phone || null, 
            department || null, 
            supervisor_id || null
        ];

        await pool.execute(sql, values);

        return res.status(201).json({ message: 'ลงทะเบียนผู้ใช้งานสำเร็จ' });

    } catch (error) {
        console.error('Error in register:', error);
        return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
    }
};

// GET /users สำหรับดึงข้อมูลผู้ใช้งานทั้งหมดในระบบ
export const getUsers = async (req, res) => {
    try {
        // ดึงข้อมูลทั้งหมด แต่ละเว้นไม่ดึง password ออกมาเพื่อความปลอดภัย
        const [users] = await pool.execute(
            'SELECT user_id, username, name, role, type, status, email, phone, department, supervisor_id, created_at FROM users'
        );
        // ส่ง Response ตามสเปก: Res. Body: { message, users }
        return res.status(200).json({
            message: 'ดึงข้อมูลผู้ใช้งานสำเร็จ',
            users: users
        });
    } catch (error) {
        console.error('Error in getUsers:', error);
        return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

export const getUsersByRole = async (req, res) => {
  const { role } = req.params;
  try {
    // แก้ไขเป็น user_id ตามรูป php.png
    const [rows] = await pool.query("SELECT user_id, username, role, name, status FROM users WHERE role = ?", [role]);
    res.status(200).json({ message: "Success", users: rows });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// DELETE [/users]/:id
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    // แก้ไขเป็น user_id
    const [result] = await pool.query("DELETE FROM users WHERE user_id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 1. ดึงข้อมูลผู้ใช้งานตาม ID (เหมือนขอดูแฟ้มประวัติพนักงาน 1 คน)
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params; // รับค่าตัวเลข ID ที่ส่งมากับลิงก์ (เช่น /users/1)

    // เอาคอลัมน์ id ออกจาก SELECT และเปลี่ยน WHERE เป็น user_id
    // สั่งค้นหาข้อมูลในตู้เก็บเอกสาร โดยเลือกมาเฉพาะบางข้อมูล (รหัส, ชื่อ, อีเมล ฯลฯ) ของคนที่ ID ตรงกัน
    const [rows] = await pool.query(
      "SELECT user_id, username, name, email, phone, department FROM users WHERE user_id = ?",
      [id]
    );

    // ถ้าหาไม่เจอ (ไม่มีแฟ้มเอกสาร)
    if (rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้งาน" }); // แจ้งกลับว่าไม่พบข้อมูล
    }

    // ถ้าหาเจอ ส่งข้อมูลกลับไปให้ลูกค้า
    res.status(200).json({
      message: "ดึงข้อมูลสำเร็จ",
      user: rows[0] // ส่งข้อมูลคนที่หาเจอคนแรกกลับไป
    });
  } catch (error) {
    console.error("Error in getUserById:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" }); // ถ้ามีอะไรพังในระบบ ให้แจ้งว่าเซิร์ฟเวอร์มีปัญหา
  }
};

// 2. แก้ไขข้อมูลผู้ใช้งาน (เหมือนอัปเดตแฟ้มประวัติพนักงาน)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params; // รับ ID ว่าจะแก้ของใคร
    const { name, email, phone, department } = req.body; // รับข้อมูลใหม่ที่กรอกเข้ามา (ชื่อ, อีเมล ฯลฯ)

    // เปลี่ยน WHERE id = ? เป็น WHERE user_id = ?
    // สั่งอัปเดต (UPDATE) ข้อมูลใหม่ลงไปทับในตู้เอกสาร
    const [result] = await pool.query(
      "UPDATE users SET name = ?, email = ?, phone = ?, department = ? WHERE user_id = ?",
      [name, email, phone, department, id]
    );

    // ถ้าไม่มีการเปลี่ยนแปลงข้อมูลใดๆ เลย (หาคนๆ นั้นไม่เจอ)
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้งานที่ต้องการแก้ไข" });
    }

    // แจ้งว่าสำเร็จ
    res.status(200).json({ message: "แก้ไขข้อมูลผู้ใช้งานสำเร็จ" });
  } catch (error) {
    console.error("Error in updateUser:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
};

// 3. เปลี่ยนรหัสผ่านผู้ใช้งาน
export const updatePassword = async (req, res) => {
  try {
    const { id } = req.params; // รับ ID ของคนที่จะเปลี่ยนรหัส
    const { oldPassword, newPassword } = req.body; // รับ "รหัสเก่า" และ "รหัสใหม่" ที่กรอกเข้ามา

    // เปลี่ยน WHERE id = ? เป็น WHERE user_id = ?
    // ไปดึงรหัสผ่านเดิมที่อยู่ในระบบมาตรวจสอบก่อน
    const [rows] = await pool.query("SELECT password FROM users WHERE user_id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้งาน" });
    }

    const user = rows[0];

    // ตรวจสอบว่า "รหัสเก่า" ที่กรอกเข้ามา ตรงกับรหัสที่อยู่ในระบบหรือไม่
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) { // ถ้าไม่ตรง
      console.log("รหัสผ่านเดิมไม่ถูกต้อง");
      return res.status(400).json({ message: "รหัสผ่านเดิมไม่ถูกต้อง" }); // ปฏิเสธการเปลี่ยนรหัส
    }

    // ถ้ารหัสเก่าถูกต้อง จะทำการเข้ารหัส "รหัสผ่านใหม่" ให้ปลอดภัยก่อนบันทึก
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // เปลี่ยน WHERE id = ? เป็น WHERE user_id = ?
    // บันทึกรหัสผ่านใหม่ลงไปในระบบ
    await pool.query("UPDATE users SET password = ? WHERE user_id = ?", [hashedPassword, id]);

    res.status(200).json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (error) {
    console.error("Error in updatePassword:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
};