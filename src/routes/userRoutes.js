import express from "express";
import {
  getUsersByRole,
  deleteUser,
  getUserById,
  updatePassword,
  updateUser,
  register,
  getMySupervisor
  
} from "../controllers/UserController.js";

const userRouter = express.Router();

// ─── Authentication ───────────────────────────────────────────────────────────
userRouter.post("/register", register);

// ─── Users by Role ────────────────────────────────────────────────────────────
// GET /api/users/role/technician  หรือ  /api/users/role/supervisor
userRouter.get("/role/:role", getUsersByRole);

// ─── User by ID ───────────────────────────────────────────────────────────────
// GET /api/users/:id
userRouter.get("/:id", getUserById);

// ─── Update User ──────────────────────────────────────────────────────────────
// PUT /api/users/:id  → อัปเดตข้อมูล (รวม role, work, salary)
userRouter.put("/:id", updateUser);

// ─── Change Password ──────────────────────────────────────────────────────────
// PATCH /api/users/password/:id
userRouter.patch("/password/:id", updatePassword);

// ─── Delete User ──────────────────────────────────────────────────────────────
// DELETE /api/users/:id  (แก้จาก /user/:id เพื่อให้ตรงกับ AdminAccount.jsx)
userRouter.delete("/:id", deleteUser);

userRouter.get('/:id/supervisor',  getMySupervisor)

userRouter.get('/:id',    getUserById)

export default userRouter;
