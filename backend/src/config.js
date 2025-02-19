import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  port: process.env.PORT || 5000,
  uploadDir: path.join(__dirname, process.env.UPLOAD_DIR || "uploads"),
  outputDir: path.join(__dirname, process.env.OUTPUT_DIR || "output"),
};

export default config;
