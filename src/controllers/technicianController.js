import db from '../config/db.js';

export const getAllTechnicians = async (req, res) => {
    try {
        // ดึงข้อมูลจากตาราง technicians (ไม่ดึง password ออกมาเพื่อความปลอดภัย)
        const [technicians] = await db.execute(
            'SELECT technician_id, username, name, email, phone, type, status, supervisor_id, created_at FROM technicians'
        );
        
        return res.status(200).json({
            message: 'ดึงข้อมูลช่างสำเร็จ',
            technicians: technicians
        });
    } catch (error) {
        console.error('Error in getAllTechnicians:', error);
        return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลช่าง' });
    }
};