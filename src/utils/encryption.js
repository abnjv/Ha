// This module provides end-to-end encryption functionalities using the Web Crypto API.

const KEY_PARAMS = { name: 'ECDH', namedCurve: 'P-256' };
const ENCRYPT_ALGO = { name: 'AES-GCM', length: 256 };

/**
 * Generates a new ECDH key pair for key agreement.
 * @returns {Promise<CryptoKeyPair>} A promise that resolves to a CryptoKeyPair object.
 */
export async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(KEY_PARAMS, true, ['deriveKey']);
}

/**
 * Exports a CryptoKey to a storable JSON Web Key (JWK) format.
 * @param {CryptoKey} key The key to export.
 * @returns {Promise<Object>} A promise that resolves to the key in JWK format.
 */
export async function exportKey(key) {
  return await window.crypto.subtle.exportKey('jwk', key);
}

/**
 * Imports a public key from JWK format into a CryptoKey object.
 * @param {Object} jwk The public key in JWK format.
 * @returns {Promise<CryptoKey>} A promise that resolves to a CryptoKey object.
 */
export async function importPublicKey(jwk) {
  return await window.crypto.subtle.importKey('jwk', jwk, KEY_PARAMS, true, []);
}

/**
 * Derives a shared secret AES-GCM key for encryption/decryption.
 * @param {CryptoKey} privateKey The user's own private key.
 * @param {CryptoKey} publicKey The other user's public key.
 * @returns {Promise<CryptoKey>} A promise that resolves to the shared secret key.
 */
export async function deriveSharedSecret(privateKey, publicKey) {
  return await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    ENCRYPT_ALGO,
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a message using a shared secret key.
 * @param {string} message The plaintext message to encrypt.
 * @param {CryptoKey} sharedSecret The shared AES-GCM key.
 * @returns {Promise<{encryptedData: ArrayBuffer, iv: Uint8Array}>} An object containing the encrypted data and the initialization vector (iv).
 */
export async function encryptMessage(message, sharedSecret) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = new TextEncoder().encode(message);

  const encryptedData = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    sharedSecret,
    encodedMessage
  );

  return { encryptedData, iv };
}

/**
 * Decrypts a message using a shared secret key.
 * @param {ArrayBuffer} encryptedData The encrypted data.
 * @param {Uint8Array} iv The initialization vector used for encryption.
 * @param {CryptoKey} sharedSecret The shared AES-GCM key.
 * @returns {Promise<string>} A promise that resolves to the decrypted plaintext message.
 */
export async function decryptMessage(encryptedData, iv, sharedSecret) {
  const decryptedData = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    sharedSecret,
    encryptedData
  );

  return new TextDecoder().decode(decryptedData);
}

/**
 * A utility function to convert ArrayBuffer to a Base64 string for storage.
 * @param {ArrayBuffer} buffer The buffer to convert.
 * @returns {string} The Base64 encoded string.
 */
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * A utility function to convert a Base64 string back to an ArrayBuffer.
 * @param {string} base64 The Base64 string to convert.
 * @returns {ArrayBuffer} The resulting ArrayBuffer.
 */
export function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}
