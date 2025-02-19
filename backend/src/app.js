import express from "express";
import cors from "cors";
import fileRoutes from "./routes/fileRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/files", fileRoutes);

export default app;