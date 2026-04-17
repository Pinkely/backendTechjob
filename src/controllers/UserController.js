import db from '../config/db.js';

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const [existingUser] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

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

export const getUsers = async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT user_id, username, name, role, type, status, email, phone, department, supervisor_id, salary, created_at FROM users'
    );
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
    // เพิ่ม salary, type, email, phone ให้ครบ
    const [rows] = await pool.query(
      "SELECT user_id, username, role, name, status, salary, type, email, phone FROM users WHERE role = ?",
      [role]
    );
    res.status(200).json({ message: "Success", users: rows });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM users WHERE user_id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT user_id, username, name, email, phone, department FROM users WHERE user_id = ?",
      [id]
    );

    res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ', userId: result.insertId });
  } catch (error) {
    console.error("Error in getUserById:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, department, salary } = req.body; // เพิ่ม salary

    const [result] = await pool.query(
      "UPDATE users SET name = ?, email = ?, phone = ?, department = ?, salary = ? WHERE user_id = ?", // เพิ่ม salary = ?
      [name, email, phone, department, salary ?? null, id] // เพิ่ม salary ใน array
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้งานที่ต้องการแก้ไข" });
    }

    res.status(200).json({ message: "แก้ไขข้อมูลผู้ใช้งานสำเร็จ" });
  } catch (error) {
    console.error("Error in updateUser:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    const [rows] = await pool.query("SELECT password FROM users WHERE user_id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้งาน" });
    }

    const user = rows[0];

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "รหัสผ่านเดิมไม่ถูกต้อง" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query("UPDATE users SET password = ? WHERE user_id = ?", [hashedPassword, id]);

    res.status(200).json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (error) {
    console.error("Error in updatePassword:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
};

// [เพิ่มใหม่] ฟังก์ชันสำหรับลืมรหัสผ่าน (ใช้ Email ค้นหา)
export const forgotPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่านใหม่' });
    }

    // ค้นหาว่ามี Email นี้ในฐานข้อมูลหรือไม่
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'ไม่พบอีเมลนี้ในระบบ' });
    }

    const user = users[0];

    // เข้ารหัส Password ใหม่
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // อัปเดตรหัสผ่าน
    await pool.execute('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, user.user_id]);

    return res.status(200).json({ message: 'รีเซ็ตรหัสผ่านสำเร็จ' });

  } catch (error) {
    console.error('Error in forgotPassword:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
  }
};