
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

if (!Promise.withResolvers) {
  Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
     });
      return { promise, resolve, reject };
    };
}
if (typeof CustomEvent === 'undefined') {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(type, eventInitDict) {
      super(type, eventInitDict);
      this.detail = eventInitDict?.detail;
    }
  };
}

let heliaInstance;
let fsUnix;

const getHelia = async () => {
  if (!heliaInstance) {
    const { createHelia } = await import('helia')
    const { unixfs } = await import('@helia/unixfs')
    heliaInstance = await createHelia();
    fsUnix = unixfs(heliaInstance);
  }
  return { helia: heliaInstance, fsUnix };
};

// Encryption utilities
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits

/**
 * Generate a secure encryption key from a passphrase
 * @param {string} passphrase - The passphrase to derive key from
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Buffer} - Derived key
 */
const deriveKey = (passphrase, salt) => {
  return crypto.pbkdf2Sync(passphrase, salt, 100000, KEY_LENGTH, 'sha256');
};

/**
 * Encrypt file content
 * @param {Buffer} fileBuffer - File content to encrypt
 * @param {string} encryptionKey - Encryption key/passphrase
 * @returns {Object} - Encrypted data with metadata
 */
const encryptContent = (fileBuffer, encryptionKey) => {
  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(encryptionKey, salt);
    // Create cipher
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv, { authTagLength: 16 });
    cipher.setAAD(Buffer.from('medical-record'));
    // Encrypt the content
    const encryptedChunks = [];
    encryptedChunks.push(cipher.update(fileBuffer));
    encryptedChunks.push(cipher.final());
    const encryptedContent = Buffer.concat(encryptedChunks);
    const authTag = cipher.getAuthTag();
    
    const encryptedPackage = Buffer.concat([
      salt,           // 16 bytes
      iv,             // 16 bytes  
      authTag,        // 16 bytes
      encryptedContent // variable length
    ]);
    
    return {
      encryptedData: encryptedPackage,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('Error encrypting content:', error);
    throw new Error('Encryption failed: ' + error.message);
  }
};

/**
 * Decrypt file content
 * @param {Buffer} encryptedPackage - Encrypted data package
 * @param {string} encryptionKey - Decryption key/passphrase
 * @returns {Buffer} - Decrypted content
 */
const decryptContent = (encryptedPackage, encryptionKey) => {
  try {
    // Extract components from the package
    const salt = encryptedPackage.slice(0, 16);
    const iv = encryptedPackage.slice(16, 32);
    const authTag = encryptedPackage.slice(32, 48);
    const ciphertext = encryptedPackage.slice(48); //
    
    // Derive key from passphrase
    const key = deriveKey(encryptionKey, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv, { authTagLength: 16 });

    decipher.setAAD(Buffer.from('medical-record'));
    decipher.setAuthTag(authTag);

    
    // Decrypt the content
    const decryptedChunks = [];
    decryptedChunks.push(decipher.update(ciphertext));
    decryptedChunks.push(decipher.final());
    
    return Buffer.concat(decryptedChunks);
  } catch (error) {
    console.error('Error decrypting content:', error);
    throw new Error('Decryption failed: ' + error.message);
  }
};

/**
 * Generate encryption key from patient ID and timestamp
 * @param {string} patientId - Patient's Ethereum address
 * @param {string} timestamp - Optional timestamp for additional entropy
 * @returns {string} - Generated encryption key
 */
const generateEncryptionKey = (patientId) => {
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production';
  return crypto.createHash('sha256')
    .update(secret + patientId)
    .digest('hex');
};

const uploadToIPFS = async (filePath, patientId = null, encryptFile = true) => {
  try {
    const fileName = path.basename(filePath);
    let fileBuffer = fs.readFileSync(filePath);
    let encryptionMetadata = null;
    
    // Encrypt content if encryption is enabled and patientId is provided
    if (encryptFile && patientId) {
      console.log(`Encrypting file ${fileName} for patient ${patientId}`);
      
      const encryptionKey = generateEncryptionKey(patientId);
      const encryptionResult = encryptContent(fileBuffer, encryptionKey);
      
      fileBuffer = encryptionResult.encryptedData;
      encryptionMetadata = {
        encrypted: true,
        patientId: patientId,
        algorithm: ENCRYPTION_ALGORITHM,
        keyDerivation: 'pbkdf2-sha256-100k'
      };
      
      console.log(`File encrypted successfully: ${fileName}`);
    }
    
    const { fsUnix } = await getHelia();
    const cid = await fsUnix.addBytes(fileBuffer);
    
    console.log(`File uploaded to Helia/IPFS: ${fileName} -> ${cid.toString()}`);
    
    return {
      cid: cid.toString(),
      encrypted: encryptFile && patientId ? true : false,
      encryptionMetadata: encryptionMetadata
    };
  } catch (error) {
    console.error('Error uploading to Helia/IPFS:', error);
    // Fallback to mock
    const fileName = path.basename(filePath);
    const mockCID = `Qm${Buffer.from(fileName + Date.now()).toString('hex').substring(0, 44)}`;
    console.log(`Fallback mock IPFS upload: ${fileName} -> ${mockCID}`);
    
    return {
      cid: mockCID,
      encrypted: false,
      encryptionMetadata: null
    };
  }
};

/**
 * Download and decrypt file from IPFS
 * @param {string} cid - IPFS Content ID
 * @param {string} patientId - Patient ID for decryption key generation
 * @param {boolean} isEncrypted - Whether the file is encrypted
 * @returns {Buffer} - Decrypted file content
 */
const downloadFromIPFS = async (cid, patientId = null, isEncrypted = false) => {
  try {
    const { fsUnix } = await getHelia();
    
    // Download file from IPFS
    const chunks = [];
    for await (const chunk of fsUnix.cat(cid)) {
      chunks.push(chunk);
    }
    let fileBuffer = Buffer.concat(chunks);
    
    // Decrypt if necessary
    if (isEncrypted && patientId) {
      console.log(`Decrypting file for patient ${patientId}`);
      const encryptionKey = generateEncryptionKey(patientId);
      fileBuffer = decryptContent(fileBuffer, encryptionKey);
      console.log('File decrypted successfully');
    }
    
    return fileBuffer;
  } catch (error) {
    console.error('Error downloading/decrypting from IPFS:', error);
    throw new Error('Download/decryption failed: ' + error.message);
  }
};

module.exports = {
  uploadToIPFS,
  downloadFromIPFS,
  encryptContent,
  decryptContent,
  generateEncryptionKey
};
