// utils/gridfsUpload.ts
import multer from 'multer';

// Use memory storage with manual GridFS upload in the controller to avoid driver/storage incompatibilities
export const uploadGridFS = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only images allowed'));
  },
});