// utils/gridfsUpload.ts
import multer from 'multer';
import type { StorageEngine } from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import crypto from 'crypto';
import path from 'path';

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stay-hard';

// Create GridFS storage
const storage = new GridFsStorage({
  url: mongoURI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'photos', // Collection name will be 'photos.files' and 'photos.chunks'
          metadata: {
            userId: req.body.userId,
            challengeId: req.body.challengeId,
            date: req.body.date,
          },
        };
        resolve(fileInfo);
      });
    });
  },
}) as unknown as StorageEngine;

export const uploadGridFS = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  },
});