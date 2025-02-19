import express from "express";
import multer from "multer";
import { processFile } from "../controllers/fileController.js";
import config from "../config/config.js";

const router = express.Router();


const storage = multer.diskStorage({
  destination: config.uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

router.post("/upload", upload.single("file"), processFile);

export default router;