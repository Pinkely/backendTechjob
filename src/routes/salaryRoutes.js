import express from "express";
import {
  getAllSalaries,
  getSalaryById,
  getSalariesByUserId,
  addSalary,
  updateSalary,
  deleteSalary,
} from "../controllers/salaryController.js";

const salaryRouter = express.Router();

// --- หมวดหมู่ Salary ---

// GET /salary — ดึงข้อมูลเงินเดือนทั้งหมด
salaryRouter.get("/", async (req, res) => {
  // #swagger.tags = ['Salary']
  // #swagger.summary = 'ดึงข้อมูลเงินเดือนทั้งหมด'
  try {
    const rows = await getAllSalaries();
    res.status(200).json({ message: "Success", salaries: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// GET /salary/user/:userId — ดึงประวัติเงินเดือนของพนักงานคนนี้
salaryRouter.get("/user/:userId", async (req, res) => {
  // #swagger.tags = ['Salary']
  // #swagger.summary = 'ดึงประวัติเงินเดือนของพนักงานตาม User ID'
  /* #swagger.parameters['userId'] = { description: 'User ID' } */
  try {
    const rows = await getSalariesByUserId(req.params.userId);
    res.status(200).json({ message: "Success", salaries: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// GET /salary/:id — ดึงข้อมูลเงินเดือนตาม ID
salaryRouter.get("/:id", async (req, res) => {
  // #swagger.tags = ['Salary']
  // #swagger.summary = 'ดึงข้อมูลเงินเดือนตาม ID'
  try {
    const rows = await getSalaryById(req.params.id);
    if (rows.length === 0)
      return res.status(404).json({ message: "Not Found" });
    res.status(200).json({ message: "Success", salary: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST /salary/add — เพิ่มรายการเงินเดือนใหม่
salaryRouter.post("/add", async (req, res) => {
  // #swagger.tags = ['Salary']
  // #swagger.summary = 'เพิ่มรายการเงินเดือนใหม่'
  /* #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        user_id: 1, amount: 25000, month: 4, year: 2025,
        bonus: 0, deduction: 0, note: 'เงินเดือนเดือนเมษายน'
      }
  } */
  try {
    const result = await addSalary(req.body);
    res.status(201).json({ message: "Created", insertId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// PUT /salary/:id — แก้ไขรายการเงินเดือน
salaryRouter.put("/:id", async (req, res) => {
  // #swagger.tags = ['Salary']
  // #swagger.summary = 'แก้ไขรายการเงินเดือน (amount, bonus, deduction, note)'
  /* #swagger.parameters['id'] = { description: 'Salary ID' } */
  /* #swagger.parameters['body'] = {
      in: 'body',
      schema: { amount: 28000, bonus: 2000, deduction: 500, note: 'ปรับเงินเดือน' }
  } */
  try {
    const result = await updateSalary(req.params.id, req.body);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Not Found" });
    res.status(200).json({ message: "Updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// DELETE /salary/:id — ลบรายการเงินเดือน
salaryRouter.delete("/:id", async (req, res) => {
  // #swagger.tags = ['Salary']
  // #swagger.summary = 'ลบรายการเงินเดือน'
  try {
    const result = await deleteSalary(req.params.id);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Not Found" });
    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default salaryRouter;