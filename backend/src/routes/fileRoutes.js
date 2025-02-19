import express from 'express';
import multer from 'multer';
import { uploadChunk, processFile, downloadZip } from '../controllers/fileController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Uploads a file chunk for large CSV processing
 * 
 * @route POST /upload
 * @param {File} req.file - The chunk of the file to be uploaded
 * @param {Object} req.body - Metadata of the chunk
 * @param {number} req.body.chunkNumber - The chunk index
 * @param {number} req.body.totalChunks - Total number of chunks
 * @param {string} req.body.originalname - Original file name
 * @returns {Object} JSON response confirming upload status
 */
router.post('/upload', upload.single('file'), uploadChunk);

/**
 * Merges uploaded chunks, processes the CSV file, and generates a ZIP
 *
 * @route POST /merge-chunks
 * @param {Object} req.body - Information about the uploaded file
 * @param {string} req.body.fileName - Name of the file being processed
 * @param {number} req.body.totalChunks - Total nmber of chunks to merge
 * @returns {Object} JSON response with the ZIP file name
 */
router.post('/merge-chunks', processFile);

/**
 * Downloads the processed ZIP file
 *
 * @route GET /download/:zipFileName
 * @param {string} req.params.zipFileName - The name of the ZIP file to dwnload
 * @returns {File} The ZIP file containing processed CSV data
 */
router.get('/download/:zipFileName', downloadZip);

export default router;
