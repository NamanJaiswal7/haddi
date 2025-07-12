"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToS3 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
// Ensure your environment variables are set for these
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
/**
 * Uploads a file buffer to an AWS S3 bucket.
 *
 * @param fileBuffer The file content as a Buffer.
 * @param originalname The original name of the file.
 * @param mimetype The MIME type of the file.
 * @returns The public URL of the uploaded file.
 */
const uploadToS3 = async (fileBuffer, originalname, mimetype) => {
    if (!BUCKET_NAME) {
        throw new Error('AWS_S3_BUCKET_NAME is not set in environment variables.');
    }
    const key = `notes/${(0, uuid_1.v4)()}-${originalname}`;
    const command = new client_s3_1.PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: mimetype,
    });
    try {
        await s3Client.send(command);
        // Construct the public URL
        const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        return url;
    }
    catch (error) {
        console.error("Error uploading to S3:", error);
        throw new Error("Failed to upload file to S3.");
    }
};
exports.uploadToS3 = uploadToS3;
