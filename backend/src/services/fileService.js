import fs from "fs";
import path from "path";
import csv from "csv-parser";
import archiver from "archiver";
import config from "../config/config.js";
import { promisify } from "util";

const unlinkAsync = promisify(fs.unlink);

export const processCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const males = [];
    const females = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        if (row.gender === "Male") males.push(row);
        else if (row.gender === "Female") females.push(row);
      })
      .on("end", async () => {
        try {
          const outputDir = config.outputDir;
          if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

          const maleFile = path.join(outputDir, "males.csv");
          const femaleFile = path.join(outputDir, "females.csv");

          fs.writeFileSync(maleFile, males.map(obj => Object.values(obj).join(",")).join("\n"));
          fs.writeFileSync(femaleFile, females.map(obj => Object.values(obj).join(",")).join("\n"));

          const zipPath = path.join(outputDir, "result.zip");
          const output = fs.createWriteStream(zipPath);
          const archive = archiver("zip");

          output.on("close", async () => {
            await unlinkAsync(filePath);
            await unlinkAsync(maleFile);
            await unlinkAsync(femaleFile);
            resolve(zipPath);
          });

          archive.pipe(output);
          archive.file(maleFile, { name: "males.csv" });
          archive.file(femaleFile, { name: "females.csv" });
          archive.finalize();
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err) => reject(err));
  });
};
