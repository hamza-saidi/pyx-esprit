/**
 * utils/fileStorage.js
 *
 * Storage adapter - two modes:
 *   S3/MinIO (production): set AWS_S3_BUCKET + AWS_ACCESS_KEY_ID +
 *     AWS_SECRET_ACCESS_KEY + AWS_REGION. For MinIO (local dev) also set
 *     AWS_ENDPOINT_URL=http://minio:9000 and AWS_S3_FORCE_PATH_STYLE=true.
 *   Local filesystem (dev, default): files go to backend/uploads/.
 *
 * Public URL strategy: uploaded template images must be accessible by the
 * email client of the final recipient - they cannot require auth. With
 * AWS this means either (a) the bucket is configured to allow public reads
 * and ACL='public-read' is set (classic, requires Block Public Access to be
 * off), or (b) a CloudFront distribution serves the bucket publicly. Set
 * AWS_S3_PUBLIC=false to disable the ACL header (use if BPA is on and you
 * serve via CloudFront or a signed-URL flow instead).
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const s3Bucket = process.env.AWS_S3_BUCKET;
const s3PublicAcl = process.env.AWS_S3_PUBLIC !== 'false'; // default true (acl=public-read)
let s3Client = null;
let s3BaseUrl = null;

if (s3Bucket) {
  try {
    const { S3Client } = require('@aws-sdk/client-s3');
    const region = process.env.AWS_REGION || 'us-east-1';
    const endpoint = process.env.AWS_ENDPOINT_URL; // e.g. http://minio:9000 for MinIO
    const forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === 'true' || !!endpoint;

    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      ...(endpoint ? { endpoint, forcePathStyle } : {}),
    });

    // Public base URL for uploaded files
    s3BaseUrl = endpoint
      ? `${endpoint}/${s3Bucket}` // MinIO path-style
      : `https://${s3Bucket}.s3.${region}.amazonaws.com`; // AWS virtual-hosted

    logger.info(
      `🚀 STORAGE: S3 configured — bucket: "${s3Bucket}", endpoint: ${endpoint || 'aws'}`
    );
  } catch (err) {
    // S3 is explicitly requested (AWS_S3_BUCKET is set) but failed to init -
    // log error rather than silently falling back, so the operator notices.
    logger.error(
      '❌ STORAGE: AWS_S3_BUCKET is set but S3 client failed to initialize. ' +
        'Files will be stored locally — NOT suitable for a multi-instance cluster.',
      { error: err.message }
    );
    s3Client = null;
  }
} else {
  logger.info('📌 STORAGE: S3 not configured. Using local filesystem (dev mode).');
}

/**
 * Saves a file buffer to storage.
 * @param {string} filename  Unique filename (no directory separator).
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {Promise<string>} Public URL accessible by email clients.
 */
async function saveFile(filename, buffer, mimeType = 'image/png') {
  if (s3Client && s3Bucket) {
    try {
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      const cmd = {
        Bucket: s3Bucket,
        Key: filename,
        Body: buffer,
        ContentType: mimeType,
      };
      if (s3PublicAcl) cmd.ACL = 'public-read';

      await s3Client.send(new PutObjectCommand(cmd));
      const url = `${s3BaseUrl}/${filename}`;
      logger.info(`[STORAGE] Uploaded "${filename}" to S3 → ${url}`);
      return url;
    } catch (err) {
      logger.error(`[STORAGE] S3 upload failed for "${filename}":`, { error: err.message });
      // Fall through to local storage as emergency fallback
    }
  }

  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);
  const relativeUrl = `/uploads/${filename}`;
  logger.info(`[STORAGE] Saved locally: "${filePath}" (URL: ${relativeUrl})`);
  return relativeUrl;
}

/**
 * Lists the most recently uploaded files (S3/MinIO only — local fallback
 * listing is handled by the caller via the filesystem directly).
 * @param {number} limit
 * @returns {Promise<Array<{name: string, mtime: number, url: string}>>}
 */
async function listRecent(limit = 50) {
  if (!s3Client || !s3Bucket) return [];
  try {
    const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const result = await s3Client.send(
      new ListObjectsV2Command({ Bucket: s3Bucket, MaxKeys: 1000 })
    );
    return (result.Contents || [])
      .map((obj) => ({
        name: obj.Key,
        mtime: obj.LastModified ? new Date(obj.LastModified).getTime() : 0,
        url: `${s3BaseUrl}/${obj.Key}`,
      }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit);
  } catch (err) {
    logger.error('[STORAGE] Failed to list S3 objects:', { error: err.message });
    return [];
  }
}

/**
 * Deletes a file from storage.
 * @param {string} filename
 * @returns {Promise<boolean>}
 */
async function deleteFile(filename) {
  if (s3Client && s3Bucket) {
    try {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await s3Client.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: filename }));
      logger.info(`[STORAGE] Deleted "${filename}" from S3.`);
      return true;
    } catch (err) {
      logger.error(`[STORAGE] S3 delete failed for "${filename}":`, { error: err.message });
    }
  }

  const filePath = path.join(uploadsDir, filename);
  if (!filePath.startsWith(uploadsDir + path.sep)) return false; // reject path traversal (e.g. filename === '..')
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      logger.info(`[STORAGE] Deleted local file "${filePath}".`);
      return true;
    } catch (err) {
      logger.error(`[STORAGE] Local delete failed for "${filePath}":`, { error: err.message });
    }
  }
  return false;
}

module.exports = { saveFile, deleteFile, listRecent, isCloud: () => !!s3Client };
