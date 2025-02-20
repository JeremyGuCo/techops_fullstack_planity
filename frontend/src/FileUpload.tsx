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

  /**
   * Handles file input change and validates the selected file
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setError(null);
      setZipFileName(null);
    } else {
      setError("Veuillez sélectionner un fichier CSV valide.");
    }
  };

  /**
   * Uploads a chunk of the file to the server
   */
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
        throw new Error("Echec lors du téléchargement");
      }
    } catch (err) {
      setError("Echec lors du téléchargement");
      console.error(err);
    }
  };

  /**
   * Handles the upload process by splitting the file into chunks and uploading them
   */
  const handleUpload = async () => {
    if (!file) {
      setError("Veuillez choisir un fichier");
      return;
    }

    setError(null);
    setProgress(0);
    setCurrentStep("uploading");
    setIsUploading(true);

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const fileName = file.name;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      await uploadChunk(chunk, i, totalChunks, fileName);
      setProgress(Math.round(((i + 1) / totalChunks) * 100));
    }

    try {
      setCurrentStep("processing");
      const response = await fetch(
        "http://localhost:5000/api/files/merge-chunks",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName, totalChunks }),
        }
      );

      if (!response.ok) {
        throw new Error("Erreur lors du traitement du fichier");
      }

      const data = await response.json();
      setZipFileName(data.zipFileName);
      setCurrentStep("completed");
    } catch (err) {
      setError("Erreur lors du traitement du fichier");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handles the download of the ZIP file
   */
  const handleDownload = async () => {
    try {
      if (!zipFileName) {
        throw new Error("ZIP file name not defined");
      }

      const response = await fetch(
        `http://localhost:5000/api/files/download/${zipFileName}`
      );
      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = zipFileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Erreur lors du téléchargement du fichier");
      console.error(err);
    }
  };

  /**
   * Returns the buton text based on the current step
   */
  const getButtonText = () => {
    switch (currentStep) {
      case "uploading":
        return "Téléchargement";
      case "processing":
        return "Traitement en cours";
      case "completed":
        return "Processus complété";
      default:
        return "Démarrer téléchargement";
    }
  };

  /**
   * Resets the upload state for a new upload
   */
  const resetUpload = () => {
    setFile(null);
    setProgress(0);
    setCurrentStep("idle");
    setIsUploading(false);
    setZipFileName(null);
    setError(null);
    const fileInput = document.querySelector(".file-input") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <div className="upload-container">
      <h2>Sélectionner un fichier CSV à traiter</h2>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="file-input"
      />
      <div className="button-container">
        {currentStep !== "completed" && (
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="upload-button"
          >
            {getButtonText()}
            {isUploading && (
              <div className="loading-dots">
                <div></div>
                <div></div>
                <div></div>
              </div>
            )}
          </button>
        )}
        {currentStep === "completed" && (
          <button onClick={resetUpload} className="upload-button">
            Nouveau téléchargement
          </button>
        )}
      </div>

      {progress > 0 && currentStep === "uploading" && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}

      {error && <p className="error-message">{error}</p>}

      {zipFileName && (
        <button
          onClick={handleDownload}
          className="download-button completed-button"
        >
          📥 Téléchargé le fichier traité
        </button>
      )}
    </div>
  );
};

export default FileUpload;
