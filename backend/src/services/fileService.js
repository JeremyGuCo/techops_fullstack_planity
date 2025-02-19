import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import csvParser from 'csv-parser';
import config from '../config.js';
import archiver from 'archiver'; 

const ensureDir = async (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    await fsp.mkdir(dirPath, { recursive: true });
  }
};

export const saveChunk = async (chunk, chunkNumber, totalChunks, fileName) => {
  const chunkDir = path.join(config.uploadDir, 'chunks');
  await ensureDir(chunkDir);
  const chunkFilePath = path.join(chunkDir, `${fileName}.part_${chunkNumber}`);
  await fsp.writeFile(chunkFilePath, chunk);
  console.log(`Chunk ${chunkNumber} saved: ${chunkFilePath}`);
};

export const mergeChunks = async (fileName, totalChunks) => {
  const chunkDir = path.join(config.uploadDir, 'chunks');
  const mergedFilePath = path.join(config.uploadDir, 'merged_files', fileName);

  await ensureDir(path.dirname(mergedFilePath));

  const writeStream = fs.createWriteStream(mergedFilePath);

  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkFilePath = path.join(chunkDir, `${fileName}.part_${i}`);

      if (!fs.existsSync(chunkFilePath)) {
        throw new Error(`Chunk ${i} missing, merge aborted.`);
      }

      const chunkBuffer = await fsp.readFile(chunkFilePath);
      writeStream.write(chunkBuffer);

      await fsp.unlink(chunkFilePath);
      console.log(`Chunk deleted: ${chunkFilePath}`);
    }

    writeStream.end();
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log(`Chunks merged successfully: ${mergedFilePath}`);
    return mergedFilePath;
  } catch (error) {
    console.error(`Error merging chunks:`, error.message);
    writeStream.destroy();
    throw error;
  }
};
export const splitCSV = async (filePath) => {
  const malesPath = path.join(config.outputDir, 'males.csv');
  const femalesPath = path.join(config.outputDir, 'females.csv');

  await ensureDir(config.outputDir);

  const malesStream = fs.createWriteStream(malesPath, { highWaterMark: 1024 * 1024 });
  const femalesStream = fs.createWriteStream(femalesPath, { highWaterMark: 1024 * 1024 });

  let maleBuffer = [];
  let femaleBuffer = [];
  const batchSize = 5000;

  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });

    readStream
      .pipe(csvParser())
      .on('headers', (headers) => {
        const headerLine = headers.join(',') + '\n';
        malesStream.write(headerLine);
        femalesStream.write(headerLine);
      })
      .on('data', (row) => {
        const line = Object.values(row).join(',') + '\n';
        const gender = row.gender?.toLowerCase();

        if (gender === 'male') {
          maleBuffer.push(line);
        } else {
          femaleBuffer.push(line);
        }

        if (maleBuffer.length >= batchSize) {
          malesStream.write(maleBuffer.join(''));
          maleBuffer = [];
        }
        if (femaleBuffer.length >= batchSize) {
          femalesStream.write(femaleBuffer.join(''));
          femaleBuffer = [];
        }
      })
      .on('end', () => {
        if (maleBuffer.length > 0) malesStream.write(maleBuffer.join(''));
        if (femaleBuffer.length > 0) femalesStream.write(femaleBuffer.join(''));

        malesStream.end();
        femalesStream.end();

        console.log(`Split completed: males.csv & females.csv`);
        resolve({ malesPath, femalesPath });
      })
      .on('error', (err) => {
        console.error(`Error splitting CSV:`, err.message);
        reject(err);
      });
  });
};
export const createZip = async () => {
  const zipPath = path.join(config.outputDir, 'result.zip');
  await ensureDir(config.outputDir);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    archive.file(path.join(config.outputDir, 'males.csv'), { name: 'males.csv' });
    archive.file(path.join(config.outputDir, 'females.csv'), { name: 'females.csv' });

    archive.on('error', (err) => {
      reject(new Error(`ZIP error: ${err.message}`));
    });

    output.on('close', () => {
      resolve(zipPath);
    });

    archive.finalize();
  });
};
