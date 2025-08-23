import React from 'react';
import { uploadToIPFS } from '../../services/ipfs';

const Upload = () => {
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const cid = await uploadToIPFS(file);
        console.log('File uploaded to IPFS with CID:', cid);
        alert(`File uploaded to IPFS with CID: ${cid}`);
      } catch (error) {
        console.error('Error uploading file to IPFS:', error);
        alert('Error uploading file to IPFS. See console for details.');
      }
    }
  };

  return (
    <div>
      <h3>Upload File to IPFS</h3>
      <input type="file" onChange={handleFileUpload} />
    </div>
  );
};

export default Upload;
