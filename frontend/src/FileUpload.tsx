import React, { useState } from "react";
import "./styles.css";

const CHUNK_SIZE = 5 * 1024 * 1024;

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>("idle");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [zipFileName, setZipFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setError(null);
      setDownloadUrl(null);
      setZipFileName(null);
    } else {
      setError("Veuillez sélectionner un fichier CSV valide.");
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
        throw new Error("Échec du téléchargement du chunk");
      }
    } catch (err) {
      setError("Erreur lors du téléchargement");
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Veuillez sélectionner un fichier.");
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
      setCurrentStep("merging");
      const response = await fetch(
        "http://localhost:5000/api/files/merge-chunks",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName, totalChunks }),
        }
      );

      if (!response.ok) {
        throw new Error("Échec du téléchargement du fichier");
      }
      console.log(response);
      const data = await response.json();
      setZipFileName(data.zipFileName);
      setCurrentStep("completed");
    } catch (err) {
      setError("Erreur lors du traitement du fichier");
      console.error(err);
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (!zipFileName) {
        throw new Error("Nom de fichier ZIP non défini");
      }

      const response = await fetch(
        `http://localhost:5000/api/files/download/${zipFileName}`
      );
      if (!response.ok) {
        throw new Error("Échec du téléchargement du fichier");
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

  return (
    <div className="upload-container">
      <h2>Importer un fichier CSV</h2>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="file-input"
      />
      <button
        onClick={handleUpload}
        disabled={!file || isUploading || isProcessing}
        className="upload-button"
      >
        {isUploading ? "Envoi en cours..." : "Importer le fichier"}{" "}
      </button>

      {progress > 0 && currentStep === "uploading" && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}

      {currentStep === "merging" && <p>Fusion en cours...</p>}
      {currentStep === "processing" && (
        <p>Analyse et séparation des données...</p>
      )}

      {error && <p className="error-message">{error}</p>}

      {zipFileName && (
        <button onClick={handleDownload} className="download-button">
          📥 Télécharger le Fichier Traité
        </button>
      )}
    </div>
  );
};

export default FileUpload;
