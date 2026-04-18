import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import loginRoutes from './src/routes/loginRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import managerRoutes from './src/routes/managerRoutes.js';
import materialRoutes from './src/routes/materialRoutes.js';
import workRoutes from "./src/routes/workRoutes.js";
import technicianRoutes from "./src/routes/technicianRoutes.js";
import salaryRoutes from "./src/routes/salaryRoutes.js";
import supervisorRoutes from "./src/routes/supervisorRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 3000;

const swaggerFile = JSON.parse(readFileSync("./swagger-output.json", "utf-8"));

app.use(cors());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
// ทำให้โฟลเดอร์ uploads เป็น static เพื่อให้เข้าถึงรูปผ่าน URL ได้
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/auth', loginRoutes);
app.use('/api/users', userRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/material', materialRoutes);
app.use("/materials", materialRoutes);
app.use("/works", workRoutes);
app.use("/technicians", technicianRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/works", workRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/supervisor", supervisorRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
});
