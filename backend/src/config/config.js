import dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 5000,
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  outputDir: process.env.OUTPUT_DIR || "output",
};

export default config;