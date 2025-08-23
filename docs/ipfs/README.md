# IPFS Service

This document explains how to use the IPFS service to upload and retrieve files from the InterPlanetary File System.

## Service Location

The IPFS service is located at `src/services/ipfs.js`.

## Functions

### `uploadToIPFS(file)`

Uploads a file to IPFS.

-   **Parameter:** `file` - The file object to upload (e.g., from an `<input type="file">`).
-   **Returns:** A Promise that resolves to the IPFS Content Identifier (CID) of the uploaded file.

**Example:**

```javascript
import { uploadToIPFS } from '@/services/ipfs';

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const cid = await uploadToIPFS(file);
    console.log('File uploaded to IPFS with CID:', cid);
    // You can now store this CID in your database or use it to retrieve the file.
  }
}
```

### `getFromIPFS(cid)`

Retrieves a file from IPFS using its CID.

-   **Parameter:** `cid` - The Content Identifier (CID) of the file to retrieve.
-   **Returns:** A Promise that resolves to the content of the file as a string.

**Example:**

```javascript
import { getFromIPFS } from '@/services/ipfs';

async function retrieveFile(cid) {
  const fileContent = await getFromIPFS(cid);
  console.log('Retrieved file content:', fileContent);
}
```

## Environment Configuration

The IPFS service connects to the IPFS node specified in the `.env` file.

```
VITE_IPFS_API_URL=https://ipfs.io/api/v0
```

You can change this URL to point to your own IPFS node if you have one.
