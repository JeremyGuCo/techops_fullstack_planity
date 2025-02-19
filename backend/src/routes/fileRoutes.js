import express from 'express';
import multer from 'multer';
import { uploadChunk, processFile, downloadZip } from '../controllers/fileController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), uploadChunk);
router.post('/merge-chunks', processFile);

router.get("/download/:zipFileName", downloadZip);

export default router;
