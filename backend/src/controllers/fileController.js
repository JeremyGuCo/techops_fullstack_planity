import { saveChunk, mergeChunks, splitCSV, createZip } from '../services/fileService.js';
import path from 'path';
import config from '../config.js';
import fs from 'fs';

export const uploadChunk = async (req, res) => {
  try {
    const chunk = req.file.buffer;
    const chunkNumber = Number(req.body.chunkNumber);
    const totalChunks = Number(req.body.totalChunks);
    const fileName = req.body.originalname;
    await saveChunk(chunk, chunkNumber, totalChunks, fileName);
    res.status(200).json({ message: "Chunk uploaded successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error uploading chunk" });
  }
};

export const processFile = async (req, res) => {
  try {
    const { fileName, totalChunks } = req.body;
    const mergedFile = await mergeChunks(fileName, totalChunks);
    await splitCSV(mergedFile);

    const zipPath = await createZip(fileName);

    const zipFileName = path.basename(zipPath);

    res.status(200).json({ zipFileName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const downloadZip = async (req, res) => {
  try {
    const { zipFileName } = req.params;
    const zipPath = path.join(config.outputDir, zipFileName);

    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ error: "ZIP file not found." });
    }

    res.download(zipPath);
  } catch (error) {
    res.status(500).json({ error: "Error downloading ZIP." });
  };
};