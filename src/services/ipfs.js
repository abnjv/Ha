import { create } from 'ipfs-http-client';

// توصيل بعقدة IPFS عامة (أو استخدم عقدة ذاتية)
const ipfs = create({ url: 'https://ipfs.io/api/v0' });

export const uploadToIPFS = async (file) => {
  const result = await ipfs.add(file);
  return result.cid.toString(); // إرجاع الـ CID (المعرف الفريد)
};

export const getFromIPFS = async (cid) => {
  const stream = ipfs.cat(cid);
  let data = '';
  for await (const chunk of stream) {
    data += chunk.toString();
  }
  return data;
};
