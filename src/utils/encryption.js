/**
 * Web Crypto API wrappers for E2EE chat.
 * This file contains functions for key management, derivation, and message
 * encryption/decryption.
 */

// Converts an ArrayBuffer to a Base64 string
export const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Converts a Base64 string to an ArrayBuffer
export const base64ToArrayBuffer = (base64) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

// Generates a new ECDH key pair for key agreement
export const generateKeyPair = async () => {
  return await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
};

// Exports a CryptoKey to a raw format that can be stored
export const exportPublicKey = async (key) => {
  const exported = await window.crypto.subtle.exportKey('spki', key);
  return arrayBufferToBase64(exported);
};

// Imports a raw public key into a CryptoKey
export const importPublicKey = async (keyData) => {
  const buffer = base64ToArrayBuffer(keyData);
  return await window.crypto.subtle.importKey(
    'spki',
    buffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
};

// Derives a shared secret AES key from a private key and a public key
export const deriveSharedSecret = async (privateKey, publicKey) => {
  return await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

// Encrypts a message using AES-GCM
export const encryptMessage = async (message, key) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = new TextEncoder().encode(message);

  const encryptedData = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encodedMessage
  );

  return {
    encryptedData,
    iv,
  };
};

// Decrypts a message using AES-GCM
export const decryptMessage = async (encryptedData, iv, key) => {
  const decryptedData = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encryptedData
  );

  return new TextDecoder().decode(decryptedData);
};
