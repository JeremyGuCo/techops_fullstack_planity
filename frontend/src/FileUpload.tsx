import React, { useState } from "react";
import "./styles.css";

const CHUNK_SIZE = 5 * 1024 * 1024;

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>("idle");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [zipFileName, setZipFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setError(null);
      setZipFileName(null);
      setFileId(null);
      setProgress(0);
      setCurrentStep("ready");
    } else {
      setError("Veuillez sélectionner un fichier CSV valide.");
    }
  };

  const uploadChunk = async (
    chunk: Blob,
    chunkNumber: number,
    totalChunks: number,
    fileName: string,
    currentFileId: string | null
  ): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", chunk);
    formData.append("chunkNumber", chunkNumber.toString());
    formData.append("totalChunks", totalChunks.toString());
    formData.append("originalname", fileName);

    if (currentFileId) {
      formData.append("fileId", currentFileId);
    }

    try {
      const response = await fetch("http://localhost:5000/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur chunk ${chunkNumber}`);
      }

      const data = await response.json();

      if (!currentFileId && data.fileId) {
        console.log("FileId reçu:", data.fileId);
        return data.fileId;
      }

      return currentFileId;
    } catch (err) {
      console.error(err);
      setError("Erreur lors du téléchargement des chunks.");
      return null;
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Veuillez sélectionner un fichier d'abord.");
      return;
    }

    setIsUploading(true);
    setCurrentStep("uploading");
    setProgress(0);
    setError(null);

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let currentFileId: string | null = null;

    for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
      const start = chunkNumber * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);

      const returnedFileId = await uploadChunk(
        chunk,
        chunkNumber,
        totalChunks,
        file.name,
        currentFileId
      );

      if (!returnedFileId) {
        setError(`Erreur lors du chunk ${chunkNumber}`);
        setIsUploading(false);
        setCurrentStep("error");
        return;
      }

      if (!currentFileId && returnedFileId) {
        currentFileId = returnedFileId;
        setFileId(currentFileId);
      }

      setProgress(Math.floor(((chunkNumber + 1) / totalChunks) * 100));
    }

    setCurrentStep("completed");
    setIsUploading(false);
    console.log("Upload terminé avec succès, fileId :", currentFileId);
  };

  return (
    <div className="file-upload-container">
      <h2>Uploader un fichier CSV</h2>

      <div className="file-input-container">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="file-input"
        />
        <button
          className={`upload-btn ${!file || isUploading ? "disabled" : ""}`}
          onClick={handleUpload}
          disabled={!file || isUploading}
        >
          {isUploading ? "Envoi en cours..." : "Envoyer le fichier"}
        </button>
      </div>

      {currentStep === "uploading" && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <span className="progress-text">{progress}%</span>
        </div>
      )}

      {currentStep === "completed" && (
        <div className="success-message">
          ✅ Fichier envoyé avec succès. (FileId : {fileId})
        </div>
      )}

      {error && <div className="error-message">⚠️ {error}</div>}
    </div>
  );
};

export default FileUpload;
