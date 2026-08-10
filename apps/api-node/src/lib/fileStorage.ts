import mongoose from "mongoose";
import { Readable } from "node:stream";

// MongoDB caps a single document at 16MB (BSON hard limit), and the driver's
// serializer misbehaves ("offset is out of bounds") on Buffers that push a
// document close to that ceiling — well before the app's own 50MB multipart
// limit. GridFS stores file bytes as a stream of chunked documents instead of
// one giant field, so uploads aren't silently capped at ~15MB.
//
// Types are derived from `mongoose.mongo` (never a bare `mongodb` import):
// npm can install a second, separate copy of the `mongodb`/`bson` packages
// alongside the one mongoose bundles internally, and TS treats their classes
// (ObjectId, GridFSBucket, ...) as structurally incompatible even though
// they're semantically identical at runtime. Sourcing everything through
// `mongoose.mongo` guarantees we always use the copy mongoose itself uses.
type Bucket = InstanceType<typeof mongoose.mongo.GridFSBucket>;

let bucket: Bucket | null = null;

const getBucket = (): Bucket => {
  if (!bucket) {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not ready");
    bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "pdf_files" });
  }
  return bucket;
};

/** Store a buffer in GridFS and return its file id as a string. */
export const storeFile = (data: Buffer, filename: string, contentType?: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const uploadStream = getBucket().openUploadStream(filename, {
      metadata: contentType ? { contentType } : undefined
    });
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve(uploadStream.id.toString()));
    Readable.from(data).pipe(uploadStream);
  });

/** Open a readable stream for a GridFS file — use for HTTP responses (no full buffering). */
export const openReadStream = (fileId: string): Readable =>
  getBucket().openDownloadStream(new mongoose.mongo.ObjectId(fileId));

/** Read a GridFS file fully into memory — use only where a Buffer is required (e.g. zipping). */
export const readFileBuffer = (fileId: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    openReadStream(fileId)
      .on("data", (chunk) => chunks.push(chunk as Buffer))
      .on("error", reject)
      .on("end", () => resolve(Buffer.concat(chunks)));
  });

/** Delete a GridFS file. Safe to call on an already-missing id. */
export const deleteFile = async (fileId: string): Promise<void> => {
  try {
    await getBucket().delete(new mongoose.mongo.ObjectId(fileId));
  } catch {
    // already gone — nothing to clean up
  }
};
