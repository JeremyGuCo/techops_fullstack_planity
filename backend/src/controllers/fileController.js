import {
  saveChunk,
  mergeChunks,
  splitCSV,
  createZip,
} from "../services/fileService.js";
import path from "path";
import config from "../config.js";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

/**
 * Handles chunk upload for large file processing
 *
 * @param {Object} req - Express request object
 * @param {Object} req.file - Uploaded chunk buffer
 * @param {Object} req.body - Chunk metadata
 * @param {number} req.body.chunkNumber - Index of the chunk
 * @param {number} req.body.totalChunks - Total number of chunks
 * @param {string} req.body.originalname - Original file name
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with status
 */
export const uploadChunk = async (req, res) => {
  try {
    const chunk = req.file.buffer;
    const chunkNumber = Number(req.body.chunkNumber);
    const totalChunks = Number(req.body.totalChunks);
    const fileName = `${req.body.originalname}`;
    let fileId = req.body.fileId;

    if (chunkNumber === 0 && !fileId) {
      fileId = uuidv4();
    }

    if (isNaN(chunkNumber) || isNaN(totalChunks) || !fileName || !fileId) {
      console.log(fileId)
      return res.status(400).json({ error: "Invalid chunk metadata" });
    }

    await saveChunk(chunk, chunkNumber, totalChunks, fileName, fileId);

    res.status(200).json({ message: "Chunk uploaded successfully", fileId });
  } catch (error) {
    console.log(error)

    res.status(500).json({ error: "Error uploading chunk" });
  }
};

/**
 * Merges uploaded chunks, processes the CSV file, and generates a ZIP file
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - File metadata
 * @param {string} req.body.fileName - Name of the original file
 * @param {number} req.body.totalChunks - Total number of chunks
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with the ZIP file name
 */
export const processFile = async (req, res) => {
  try {
    const { fileName, totalChunks, fileId } = req.body;

    if (!fileName || isNaN(totalChunks) || !fileId) {
      return res.status(400).json({ error: "Invalid file metadata" });
    }

    let mergedFilePath = null;
    const merger = mergeChunks(fileName, parseInt(totalChunks), fileId);

    for await (const result of merger) {
      if (result.type === "progress") {
        console.log(result.data);
      } else if (result.type === "complete") {
        mergedFilePath = result.data;
      }
    }

    if (!mergedFilePath) {
      throw new Error("Failed to merge file chunks");
    }

    await splitCSV(mergedFilePath);
    const zipPath = await createZip(fileId);
    const zipFileName = path.basename(zipPath);

    res.status(200).json({ zipFileName });
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message });
  }
};

/**
 * Handles the download of the processed ZIP file
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.zipFileName - Name of the ZIP file to download
 * @param {Object} res - Express response object
 * @returns {File} Sends the ZIP file as a response
 */
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
  }
};
