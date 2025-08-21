import React, { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { UploadCloud, File as FileIcon, X } from 'lucide-react';

const UploadSystem = ({ onUploadSuccess, uploadPath = 'uploads' }) => {
  const { storage } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);

  const handleUpload = useCallback((fileToUpload) => {
    if (!storage || !fileToUpload) return;

    setFile(fileToUpload);
    setIsUploading(true);
    setError('');
    setProgress(0);

    const storageRef = ref(storage, `${uploadPath}/${Date.now()}_${fileToUpload.name}`);
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    uploadTask.on('state_changed',
      (snapshot) => {
        const currentProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(currentProgress);
      },
      (uploadError) => {
        console.error("Upload failed:", uploadError);
        setError("Upload failed. Please try again.");
        setIsUploading(false);
        setFile(null);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          onUploadSuccess(downloadURL, fileToUpload.name, fileToUpload.type);
          setIsUploading(false);
          setFile(null);
        });
      }
    );
  }, [storage, uploadPath, onUploadSuccess]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleUpload(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleUpload(droppedFile);
    }
  };

  return (
    <div className="w-full">
      <label
        htmlFor="file-upload"
        className={`relative block w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                    ${isDragging ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600 hover:border-gray-500'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center">
          <UploadCloud className="w-12 h-12 text-gray-500" />
          <span className="mt-2 block text-sm font-semibold text-gray-400">
            Drag & Drop or <span className="text-blue-400">browse</span> to upload
          </span>
        </div>
        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileSelect} disabled={isUploading} />
      </label>

      {file && (
        <div className="mt-4 p-2 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-300 truncate">{file.name}</span>
            </div>
            {!isUploading && (
              <button onClick={() => setFile(null)} className="p-1 text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            )}
          </div>
          {isUploading && (
            <div className="mt-2 w-full bg-gray-600 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default UploadSystem;
