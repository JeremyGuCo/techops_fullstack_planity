import React, { useState } from "react";
import "./styles.css";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploadedMB, setUploadedMB] = useState<number>(0);
  const [totalMB, setTotalMB] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setProgress(0);
      setUploadedMB(0);
      setTotalMB(parseFloat((selectedFile.size / (1024 * 1024)).toFixed(2)));
      setError(null);
      setDownloadUrl(null);
    } else {
      setError("Please select a valid CSV file.");
    }
  };

  const uploadChunk = async (
    chunk: Blob,
    chunkNumber: number,
    totalChunks: number,
    fileName: string
  ) => {
    const formData = new FormData();
    formData.append("file", chunk, fileName);
    formData.append("chunkNumber", chunkNumber.toString());
    formData.append("totalChunks", totalChunks.toString());
    formData.append("originalname", fileName);

    try {
      const response = await fetch("http://localhost:5000/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload chunk");
      }
    } catch (err) {
      setError("Error uploading chunk");
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file.");
      return;
    }

    setError(null);
    setProgress(0);
    setUploadedMB(0);
    setIsUploading(true);

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const fileName = file.name;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      await uploadChunk(chunk, i, totalChunks, fileName);
      setProgress(Math.round(((i + 1) / totalChunks) * 100));
      setUploadedMB(parseFloat((end / (1024 * 1024)).toFixed(2)));
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/files/merge-chunks",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName, totalChunks }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to merge chunks");
      }

      setProgress(100);
      setDownloadUrl(`http://localhost:5000/api/files/download`);
    } catch (err) {
      setError("Error merging chunks");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        textAlign: "center",
        maxWidth: "500px",
        margin: "auto",
      }}
    >
      <h2>Upload Large CSV File</h2>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        aria-label="Select CSV file"
      />
      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        style={{ marginTop: "10px" }}
        aria-busy={isUploading}
      >
        {isUploading ? "Uploading..." : "Upload"}
      </button>

      {progress > 0 && (
        <div
          className="progress-container"
          aria-label={`Progress: ${progress}%`}
        >
          <div className="progress-bar" style={{ width: `${progress}%` }}>
            <span>
              {uploadedMB}MB / {totalMB}MB
            </span>
          </div>
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {downloadUrl && (
        <a
          href={downloadUrl}
          download="processed_data.zip"
          style={{ display: "block", marginTop: "10px" }}
        >
          📥 Download Processed File
        </a>
      )}
    </div>
  );
};

export default FileUpload;
