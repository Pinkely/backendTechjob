import pool from "../config/db.js";

// ---- Helper ----
const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

// GET /salary — ดึงเงินเดือนทั้งหมด (พร้อมชื่อพนักงาน)
export const getAllSalaries = async () => {
  return await query(`
    SELECT s.*, u.name, u.role, u.department
    FROM salary s
    JOIN users u ON s.user_id = u.user_id
    ORDER BY s.salary_id DESC
  `);
};

// GET /salary/:id — ดึงเงินเดือนตาม salary_id
export const getSalaryById = async (id) => {
  return await query(`
    SELECT s.*, u.name, u.role, u.department
    FROM salary s
    JOIN users u ON s.user_id = u.user_id
    WHERE s.salary_id = ?
  `, [id]);
};

// GET /salary/user/:userId — ดึงเงินเดือนของพนักงานคนนี้ทั้งหมด
export const getSalariesByUserId = async (userId) => {
  return await query(`
    SELECT s.*, u.name, u.role, u.department
    FROM salary s
    JOIN users u ON s.user_id = u.user_id
    WHERE s.user_id = ?
    ORDER BY s.salary_id DESC
  `, [userId]);
};

// POST /salary/add — เพิ่มรายการเงินเดือน
export const addSalary = async ({ user_id, amount, month, year, bonus = 0, deduction = 0, note }) => {
  const sql = `
    INSERT INTO salary (user_id, amount, month, year, bonus, deduction, note, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'รอจ่าย')
  `;
  return await query(sql, [user_id, amount, month, year, bonus, deduction, note || null]);
};

// PUT /salary/:id — แก้ไขข้อมูลเงินเดือน
export const updateSalary = async (id, { amount, bonus = 0, deduction = 0, note }) => {
  const sql = `
    UPDATE salary
    SET amount = ?, bonus = ?, deduction = ?, note = ?
    WHERE salary_id = ?
  `;
  return await query(sql, [amount, bonus, deduction, note || null, id]);
};


// DELETE /salary/:id — ลบรายการเงินเดือน
export const deleteSalary = async (id) => {
  return await query(`DELETE FROM salary WHERE salary_id = ?`, [id]);
};