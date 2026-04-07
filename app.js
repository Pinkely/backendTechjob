import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import userRoutes from "./src/routes/userRoutes.js";
import materialRoutes from "./src/routes/materialRoutes.js";
import workRoutes from "./src/routes/workRoutes.js";
import salaryRoutes from "./src/routes/salaryRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 3000;

const swaggerFile = JSON.parse(readFileSync("./swagger-output.json", "utf-8"));

app.use(cors());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.use("/users", userRoutes);
app.use("/materials", materialRoutes);
app.use("/works", workRoutes);
app.use("/salary", salaryRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
});