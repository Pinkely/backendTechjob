import express from "express";
import {
  getUsersByRole,
  deleteUser,
  getUserById,
  updatePassword,
  updateUser,
  login,
  register,
  getUsers,
  forgotPassword // [เพิ่มใหม่] Import ฟังก์ชันลืมรหัสผ่าน
} from "../controllers/UserController.js";

const userRouter = express.Router();

// --- หมวดหมู่ Users ---

userRouter.get("/", async (req, res) => {
  getUsers(req, res);
});

userRouter.get("/role/:role", async (req, res) => {
  getUsersByRole(req, res);
});

userRouter.get("/:id", async (req, res) => {
  getUserById(req, res);
});

userRouter.put("/user/:id", async (req, res) => {
  updateUser(req, res);
});

userRouter.patch("/password/:id", async (req, res) => {
  updatePassword(req, res);
});

userRouter.delete("/user/:id", async (req, res) => {
  deleteUser(req, res);
});

// --- หมวดหมู่ Authentication ---

userRouter.post("/login", async (req, res) => {
  login(req, res);
});

userRouter.post("/register", async (req, res) => {
  register(req, res);
});

// [เพิ่มใหม่] Route สำหรับลืมรหัสผ่าน
userRouter.post("/forgot-password", async (req, res) => {
  // #swagger.tags = ['Users']
  // #swagger.summary = 'รีเซ็ตรหัสผ่านผ่านอีเมล'
  /* #swagger.parameters['body'] = {
      in: 'body',
      schema: { email: 'john@mail.com', newPassword: 'new123' }
  } */
  forgotPassword(req, res);
});

export default userRouter;