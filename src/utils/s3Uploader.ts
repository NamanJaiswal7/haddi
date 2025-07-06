import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

// Ensure your environment variables are set for these
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
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
export const uploadToS3 = async (fileBuffer: Buffer, originalname: string, mimetype: string): Promise<string> => {
    if (!BUCKET_NAME) {
        throw new Error('AWS_S3_BUCKET_NAME is not set in environment variables.');
    }

    const key = `notes/${uuidv4()}-${originalname}`;

    const command = new PutObjectCommand({
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
    } catch (error) {
        console.error("Error uploading to S3:", error);
        throw new Error("Failed to upload file to S3.");
    }
}; 