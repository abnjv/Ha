import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../context/AuthContext';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { UploadCloud, File as FileIcon, X, AlertTriangle } from 'lucide-react';

const UploadSystem = ({ onUploadSuccess, uploadPath = 'uploads', maxFileSize = 2 * 1024 * 1024 * 1024 /* 2GB */ }) => {
  const { storage } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
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
          // Keep the file displayed until the form is submitted
        });
      }
    );
  }, [storage, uploadPath, onUploadSuccess]);

  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    setError('');
    if (fileRejections.length > 0) {
      const firstError = fileRejections[0].errors[0];
      if (firstError.code === 'file-too-large') {
        setError(`File is too large. Max size is ${maxFileSize / (1024*1024)}MB.`);
      } else {
        setError(firstError.message);
      }
      return;
    }
    if (acceptedFiles.length > 0) {
      handleUpload(acceptedFiles[0]);
    }
  }, [handleUpload, maxFileSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: maxFileSize,
    multiple: false,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'video/mp4': ['.mp4'],
      'audio/mpeg': ['.mp3'],
      'application/pdf': ['.pdf'],
    }
  });

  const removeFile = () => {
    // Note: This does not cancel an ongoing upload.
    // A real implementation would need to call `uploadTask.cancel()`.
    setFile(null);
    setIsUploading(false);
    setError('');
    setProgress(0);
  };

  return (
    <div className="w-full">
      {!file ? (
        <div {...getRootProps()} className={`relative block w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                      ${isDragActive ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600 hover:border-gray-500'}`}>
          <input {...getInputProps()} disabled={isUploading} />
          <div className="flex flex-col items-center">
            <UploadCloud className="w-12 h-12 text-gray-500" />
            <span className="mt-2 block text-sm font-semibold text-gray-400">
              Drag & Drop or <span className="text-blue-400">browse</span>
            </span>
            <span className="mt-1 block text-xs text-gray-500">MP4, MP3, PDF, PNG, JPG up to 2GB</span>
          </div>
        </div>
      ) : (
        <div className="mt-4 p-2 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 overflow-hidden">
              <FileIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-300 truncate">{file.name}</span>
            </div>
            {!isUploading && (
              <button onClick={removeFile} className="p-1 text-gray-400 hover:text-white flex-shrink-0">
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

      {error && (
        <div className="mt-2 flex items-center text-sm text-red-500">
          <AlertTriangle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}
    </div>
  );
};

export default UploadSystem;
