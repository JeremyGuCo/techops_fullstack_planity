import { processCSV } from "../services/fileService.js";
import fs from 'fs/promises';

export const processFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { path: filePath, originalname: originalFileName, mimetype } = req.file;

    if (!mimetype.startsWith('text/csv')) {
      await fs.unlink(filePath);
      return res.status(400).json({ error: "Invalid file type. Please upload a CSV file." });
    }

    const zipPath = await processCSV(filePath);
    const zipFileName = `result_${originalFileName?.split('.').shift() || 'data'}.zip`;

    res.download(zipPath, zipFileName, (err) => {
      if (err) {
        console.error("Error during download", err);
        res.status(500).json({ error: "Error downloading file" });
      }
    });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: error.message });
    if (req.file?.path) {
      fs.unlink(req.file.path).catch(err => console.error("Error deleting uploaded file:", err));
    }
  }
};