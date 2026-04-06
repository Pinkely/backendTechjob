import express from "express";
import {
  getUsersByRole,
  deleteUser,
  getUserById,
  updatePassword,
  updateUser,
  login,
  register,
  getUsers
} from "../controllers/UserController.js";

const userRouter = express.Router();

// --- หมวดหมู่ Users ---

userRouter.get("/", async (req, res) => {
  // #swagger.tags = ['Users']
  // #swagger.summary = 'ดึงข้อมูลผู้ใช้งานทั้งหมด'
  getUsers(req, res);
});

userRouter.get("/role/:role", async (req, res) => {
  // #swagger.tags = ['Users']
  // #swagger.summary = 'ดึงข้อมูลผู้ใช้งานตาม Role'
  getUsersByRole(req, res);
});

userRouter.get("/:id", async (req, res) => {
  // #swagger.tags = ['Users']
  // #swagger.summary = 'ดึงข้อมูลผู้ใช้งานตาม ID'
  getUserById(req, res);
});

userRouter.put("/user/:id", async (req, res) => {
  // #swagger.tags = ['Users']
  // #swagger.summary = 'แก้ไขข้อมูลผู้ใช้งาน'
  /* #swagger.parameters['id'] = { description: 'User ID' } */
  /* #swagger.parameters['body'] = {
      in: 'body',
      schema: {   "name": "newname", "email": "new@mail.com", "phone": "0022","department" : "111","id" : 1}
  } */
  updateUser(req, res);
});

userRouter.patch("/password/:id", async (req, res) => {
  // #swagger.tags = ['Users']
  // #swagger.summary = 'เปลี่ยนรหัสผ่าน'
  /* #swagger.parameters['id'] = { description: 'User ID' } */
  /* #swagger.parameters['body'] = {
      in: 'body',
      schema: { oldPassword: 'old123', newPassword: 'new123' }
  } */
  updatePassword(req, res);
});

userRouter.delete("/user/:id", async (req, res) => {
  // #swagger.tags = ['Users']
  // #swagger.summary = 'ลบผู้ใช้งาน'
  deleteUser(req, res);
});

// --- หมวดหมู่ Authentication ---

userRouter.post("/login", async (req, res) => {
  // #swagger.tags = ['Users']
  // #swagger.summary = 'เข้าสู่ระบบ'
  /* #swagger.parameters['body'] = {
      in: 'body',
      description: 'กรอก Username และ Password',
      schema: { username: 'admin', password: '123' }
  } */
  login(req, res);
});

userRouter.post("/register", async (req, res) => {
  // #swagger.tags = ['Users']
  // #swagger.summary = 'ลงทะเบียนผู้ใช้ใหม่'
  /* #swagger.parameters['body'] = {
      in: 'body',
      schema: { username: 'user01', password: '123', name: 'John Doe', email: 'john@mail.com', role: 'technician' }
  } */
  register(req, res);
});



export default userRouter;