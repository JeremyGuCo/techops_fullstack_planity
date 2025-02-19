import React, { useState } from "react";

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      setFile(event.target.files[0]);
      setProgress(0);
      setError(null);
      setDownloadUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setError(null);
      setProgress(10);

      const response = await fetch("http://localhost:5000/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed.");
      }

      const blob = await response.blob();
      setDownloadUrl(URL.createObjectURL(blob));
      setProgress(100);
    } catch (err) {
      setError("Error uploading file.");
      console.error(err);
    }
  };

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h2>Upload CSV File</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      <button
        onClick={handleUpload}
        disabled={!file}
        style={{ marginTop: "10px" }}
      >
        Upload
      </button>
      {progress > 0 && <p>Progress: {progress}%</p>}
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
