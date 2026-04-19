import db from '../config/db.js';
import bcrypt from 'bcryptjs';

export const login = async (req, res) => {
    const { identifier, password } = req.body;

    try {
        // 1. ค้นหาผู้ใช้จากตาราง users (หรือชื่อตารางที่คุณใช้ในภาพ) แค่ตารางเดียว
        const [rows] = await db.execute(
            `SELECT * FROM users WHERE email = ? OR username = ?`,
            [identifier, identifier]
        );

        // ถ้าไม่พบผู้ใช้
        if (rows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ' });
        }

        const user = rows[0];

        // 2. ตรวจสอบรหัสผ่าน
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch && user.password !== password) {
            return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
        }

        // 3. แปลงคอลัมน์ role จาก Database ให้ตรงกับ Path ที่ App.jsx ใช้
        let appRole = '';
        let additionalData = {};

        switch (user.role) {
            case 'admin':
                appRole = 'admin';
                break;
            case 'manager':
                appRole = 'manager';
                break;
            case 'supervisor':
                appRole = 'leader'; // แปลง supervisor เป็น leader เพื่อไปหน้า /leader
                try {
                    const [supRows] = await db.execute('SELECT supervisor_id, name FROM supervisors WHERE email = ?', [user.email]);
                    if (supRows.length > 0) {
                        additionalData.supervisor_id = supRows[0].supervisor_id;
                        additionalData.name = supRows[0].name; // อัปเดตชื่อให้ตรงกับตาราง supervisors
                    }
                } catch (err) {
                    console.error("Error fetching supervisor_id:", err);
                }
                break;
            case 'technician':
                appRole = 'user';   // แปลง technician เป็น user เพื่อไปหน้า /user
                try {
                    const [techRows] = await db.execute('SELECT technician_id, name FROM technicians WHERE email = ?', [user.email]);
                    if (techRows.length > 0) {
                        additionalData.technician_id = techRows[0].technician_id;
                        additionalData.name = techRows[0].name; // อัปเดตชื่อให้ตรงกับตาราง technicians
                    }
                } catch (err) {
                    console.error("Error fetching technician_id:", err);
                }
                break;
            default:
                appRole = 'user';
        }

        // 4. ส่งข้อมูลกลับไปให้ Frontend
        res.status(200).json({
            message: 'เข้าสู่ระบบสำเร็จ',
            user: {
                id: user.user_id,   // *แก้จาก user.id เป็น user.user_id ตามชื่อคอลัมน์ในภาพ
                name: user.name,
                email: user.email,
                role: appRole,      // ส่ง Role ที่แปลงแล้วกลับไป
                ...additionalData   // ค่า name ใน additionalData จะเขียนทับ name ด้านบน
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์', error: error.message });
    }
};
// ฟังก์ชันลืมรหัสผ่าน
export const forgotPassword = async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        // 1. เข้ารหัสรหัสผ่านใหม่ก่อนบันทึก
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 2. อัปเดตในทุกตาราง (ใช้ hashedPassword แทน newPassword)
        const queries = [
            db.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]),
            db.execute('UPDATE admins SET password = ? WHERE email = ?', [hashedPassword, email]),
            db.execute('UPDATE supervisors SET password = ? WHERE email = ?', [hashedPassword, email]),
            db.execute('UPDATE technicians SET password = ? WHERE email = ?', [hashedPassword, email])
        ];

        const results = await Promise.all(queries);

        // ตรวจสอบว่ามีแถวไหนถูกอัปเดตบ้างหรือไม่
        const totalAffected = results.reduce((acc, [res]) => acc + res.affectedRows, 0);

        if (totalAffected === 0) {
            return res.status(404).json({ message: 'ไม่พบอีเมลนี้ในระบบ' });
        }

        res.status(200).json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', error: error.message });
    }
};