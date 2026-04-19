import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs'; // นำเข้าโมดูลจัดการไฟล์ของ Node.js

// ตั้งค่าการเก็บไฟล์
const uploadDir = 'uploads/';

// ตรวจสอบว่ามีโฟลเดอร์ uploads หรือยัง ถ้ายังไม่มีให้สร้างอัตโนมัติ
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 สร้างโฟลเดอร์ ${uploadDir} อัตโนมัติแล้ว`);
}

// ตั้งค่า Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // ใช้ตัวแปรที่เราสร้างและตรวจสอบไว้แล้ว
    },
    filename: (req, file, cb) => {
        // ตั้งชื่อไฟล์ใหม่ ป้องกันชื่อซ้ำกัน
        cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
    }
});

export const upload = multer({ storage: storage });

// ---------------------------------------------------------
// ฟังก์ชันอัปโหลดรูปโปรไฟล์ (แก้ปัญหาข้อที่ 2)
// ---------------------------------------------------------
export const updateAvatar = async (req, res) => {
    const { id } = req.params;

    // ถ้าไม่มีไฟล์ส่งมาเลย
    if (!req.file) {
        return res.status(400).json({ message: "กรุณาเลือกไฟล์รูปภาพ" });
    }

    const newAvatarName = req.file.filename;

    try {
        // 1. ดึงข้อมูลผู้ใช้เพื่อดูว่ามีรูปเก่าอยู่หรือไม่
        const [users] = await db.execute('SELECT avatar FROM users WHERE user_id = ?', [id]);

        if (users.length > 0) {
            const oldAvatar = users[0].avatar;

            // 2. ถ้ารูปเก่ามีอยู่จริง (ไม่เป็น null) และมีไฟล์อยู่ในโฟลเดอร์ ให้ทำการลบทิ้ง
            if (oldAvatar) {
                const oldAvatarPath = path.join(process.cwd(), uploadDir, oldAvatar);

                // เช็คว่าไฟล์เก่ามีอยู่จริงไหมก่อนลบ ป้องกันระบบพัง
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlinkSync(oldAvatarPath); // คำสั่งลบไฟล์
                    console.log(`🗑️ ลบรูปโปรไฟล์เก่าทิ้งแล้ว: ${oldAvatar}`);
                }
            }
        }

        // 3. อัปเดตชื่อรูปใหม่ลง Database
        const updateQuery = `UPDATE users SET avatar = ? WHERE user_id = ?`;
        await db.execute(updateQuery, [newAvatarName, id]);

        res.json({ message: "อัปโหลดรูปภาพสำเร็จ", avatar: newAvatarName });
    } catch (error) {
        console.error("🔥 Error updating avatar:", error.message);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกรูปภาพ" });
    }
};

// ดึงข้อมูลส่วนตัวของผู้ใช้ตาม ID
export const getUserProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `SELECT name, email, phone, avatar FROM users WHERE user_id = ?`;
        const [users] = await db.execute(query, [id]);

        if (users.length > 0) {
            res.json(users[0]);
        } else {
            res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้" });
        }
    } catch (error) {
        console.error("🔥 จุดที่พังใน getUserProfile:", error.message);
        res.status(500).json({ message: error.message });
    }
};

// 1. ฟังก์ชันสำหรับหน้า จัดการบัญชีพนักงาน (แก้ SQL ให้ปลอดภัยแล้ว)
export const getAllEmployeesWithHistory = async (req, res) => {
    try {
        // ดึงเฉพาะ user ที่ไม่ใช่ manager
        const [employees] = await db.execute(`
            SELECT user_id, username, name, nickname, role, type, status, email, phone, department 
            FROM users 
            WHERE role != 'manager'
        `);

        const [workHistory] = await db.execute(`
            SELECT wa.technician_id, w.* FROM work_assign wa 
            JOIN work w ON wa.work_id = w.work_id
        `);

        res.json({ employees, workHistory });
    } catch (error) {
        console.error("🔥 จุดที่พังใน getAllEmployees:", error.message);
        res.status(500).json({ message: error.message });
    }
};

// 2. ฟังก์ชันสำหรับหน้า Manager Dashboard (กู้คืนมาให้แล้ว + ปรับชื่อคอลัมน์นิดหน่อย)
// 2. ฟังก์ชันสำหรับหน้า Manager Dashboard (แก้ไข SQL ให้ตรงกับฐานข้อมูล)

// ฟังก์ชันสำหรับหน้า Manager Record (ประวัติงานและสถานะทั้งหมด)
export const getWorkRecords = async (req, res) => {
    try {
        const query = `
            SELECT 
                w.work_id, w.job_name, w.customer_name, w.job_type, 
                w.job_detail, w.location, w.start_date, w.status,
                IFNULL(we.material_cost, 0) as material_cost,
                IFNULL(we.other_cost, 0) as other_cost,
                IFNULL(we.revenue, 0) as revenue,
                IFNULL(we.profit, 0) as profit
            FROM work w
            LEFT JOIN work_expense we ON w.work_id = we.work_id
            ORDER BY w.work_id DESC
        `;
        const [records] = await db.execute(query);
        res.json(records);
    } catch (error) {
        console.error("🔥 จุดที่พังใน getWorkRecords:", error.message);
        res.status(500).json({ message: error.message });
    }
};
export const getFinancialReport = async (req, res) => {
    const { year } = req.query;
    try {
        const query = `
    SELECT 
        w.start_date, 
        w.work_id,
        IFNULL(we.revenue, 0) as revenue,
        IFNULL(we.total_cost, 0) as total_cost,
        IFNULL(we.profit, 0) as profit
    FROM work w
    LEFT JOIN work_expense we ON w.work_id = we.work_id
    WHERE YEAR(w.start_date) = ?
`;

        const [records] = await db.execute(query, [year]);

        res.json(records);
    } catch (error) {
        console.error("🔥 จุดที่พังใน getFinancialReport:", error.message);
        res.status(500).json({ message: error.message });
    }
};

// 3. ฟังก์ชันสำหรับหน้า ประวัติการใช้วัสดุ (กู้คืนมาให้แล้ว)
export const getMaterialUsage = async (req, res) => {
    try {
        const query = `
            SELECT 
                mr.id AS requestId, m.name AS materialName, mr.amount AS usedAmount,
                w.job_name AS jobName, w.work_id AS jobId, t.name AS technician, mr.request_date AS date
            FROM material_request mr
            JOIN material m ON mr.material_id = m.material_id
            JOIN work w ON mr.work_id = w.work_id
            JOIN technicians t ON mr.technician_id = t.technician_id
            ORDER BY mr.request_date DESC
        `;
        const [usage] = await db.execute(query);
        res.json(usage);
    } catch (error) {
        console.error("🔥 จุดที่พังใน getMaterialUsage:", error.message);
        res.status(500).json({ message: error.message });
    }
};

// ฟังก์ชันสำหรับอัปเดตข้อมูลส่วนตัว
export const updateUserProfile = async (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    try {
        const query = `
            UPDATE users 
            SET name = ?, email = ?, phone = ? 
            WHERE user_id = ?
        `;
        const [result] = await db.execute(query, [name, email, phone, id]);

        if (result.affectedRows > 0) {
            res.json({ message: "อัปเดตข้อมูลสำเร็จ" });
        } else {
            res.status(404).json({ message: "ไม่พบผู้ใช้ที่ต้องการอัปเดต" });
        }
    } catch (error) {
        console.error("🔥 จุดที่พังใน updateUserProfile:", error.message);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
    }
};

// ฟังก์ชันสำหรับเปลี่ยนรหัสผ่าน
export const updatePassword = async (req, res) => {
    const { id } = req.params;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน" });
    }

    try {
        // 1. ดึงข้อมูลผู้ใช้เพื่อเอารหัสผ่านเดิมที่เข้ารหัสไว้มาตรวจสอบ
        const [users] = await db.execute('SELECT password FROM users WHERE user_id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({ message: "ไม่พบผู้ใช้" });
        }

        const user = users[0];

        // 2. ตรวจสอบรหัสผ่านปัจจุบันว่าตรงกับในฐานข้อมูลหรือไม่
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
        }

        // 3. เข้ารหัส (Hash) รหัสผ่านใหม่
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 4. อัปเดตลงฐานข้อมูล
        await db.execute('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, id]);

        res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จแล้ว" });
    } catch (error) {
        console.error("🔥 จุดที่พังใน updatePassword:", error.message);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
    }
};