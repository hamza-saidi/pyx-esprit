/**
 * utils/fileStorage.js
 *
 * Storage Adapter Pattern.
 * Abstracts file storage operations so they can easily swap between local filesystem
 * (for dev/local setup) and Amazon S3 or Azure Blob Storage (for production cluster setups).
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Local storage configuration
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// AWS S3 configuration parameters (optional production cloud store)
const s3Bucket = process.env.AWS_S3_BUCKET;
let s3Client = null;

if (s3Bucket) {
  try {
    const { S3Client } = require('@aws-sdk/client-s3');
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    logger.info(`🚀 STORAGE: AWS S3 configured and active with bucket: "${s3Bucket}"`);
  } catch (err) {
    logger.warn(
      '⚠️ STORAGE: Failed to initialize AWS S3 client. Falling back to local storage adapter.',
      {
        error: err.message,
      }
    );
    s3Client = null;
  }
}

/**
 * Saves a file buffer to storage.
 *
 * @param {string} filename
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {Promise<string>} Public URL or relative path of the file
 */
async function saveFile(filename, buffer, mimeType = 'image/png') {
  if (s3Client && s3Bucket) {
    try {
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      await s3Client.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: filename,
          Body: buffer,
          ContentType: mimeType,
          ACL: 'public-read',
        })
      );
      const url = `https://${s3Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${filename}`;
      logger.info(`[STORAGE] Uploaded file "${filename}" to AWS S3. URL: ${url}`);
      return url;
    } catch (err) {
      logger.error(`[STORAGE] Failed uploading "${filename}" to AWS S3:`, { error: err.message });
      // Fallback to local storage on error
    }
  }

  // Local storage adapter fallback
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);
  const relativeUrl = `/uploads/${filename}`;
  logger.info(`[STORAGE] Saved file locally: "${filePath}" (URL: ${relativeUrl})`);
  return relativeUrl;
}

/**
 * Deletes a file from storage.
 *
 * @param {string} filename
 * @returns {Promise<boolean>}
 */
async function deleteFile(filename) {
  if (s3Client && s3Bucket) {
    try {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: s3Bucket,
          Key: filename,
        })
      );
      logger.info(`[STORAGE] Deleted file "${filename}" from S3.`);
      return true;
    } catch (err) {
      logger.error(`[STORAGE] Failed deleting file "${filename}" from S3:`, { error: err.message });
    }
  }

  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      logger.info(`[STORAGE] Deleted local file: "${filePath}"`);
      return true;
    } catch (err) {
      logger.error(`[STORAGE] Failed deleting local file: "${filePath}"`, { error: err.message });
    }
  }
  return false;
}

module.exports = { saveFile, deleteFile };
