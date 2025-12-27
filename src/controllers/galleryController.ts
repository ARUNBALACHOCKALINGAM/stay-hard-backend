import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import path from 'path';
import { uploadGridFS } from '../utils/gridfsUpload';

/**
 * Gallery Controller - Handles progress photo uploads and retrievals
 */
export const galleryController = {
  /**
   * Upload a progress photo
   * POST /api/gallery/upload
   * @requires uploadGridFS middleware
   */
  uploadProgressPhoto: [
    uploadGridFS.single('photo'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded' });
        }

        // Validate required fields
        if (!req.body.userId || !req.body.challengeId || !req.body.date) {
          return res.status(400).json({ 
            message: 'Missing required fields: userId, challengeId, or date' 
          });
        }

        // Manually upload to GridFS using the in-memory buffer
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: 'photos',
        });

        // Generate a safe filename
        const random = crypto.randomBytes(16).toString('hex');
        const ext = path.extname((req.file as any).originalname || '') || '.jpg';
        const filename = `${random}${ext}`;

        // Prefer authenticated user id from middleware, fallback to body
        const authUser = (req as any).user;
        
        // Handle local time: store both UTC upload time and user's local timestamp/timezone
        const uploadedAt = new Date(); // Server UTC time
        const localTimestamp = req.body.localTimestamp || uploadedAt.toISOString(); // Client can send ISO string with their local time
        const timezone = req.body.timezone || 'UTC'; // e.g., "America/New_York", "Asia/Kolkata"
        const timezoneOffset = req.body.timezoneOffset !== undefined 
          ? parseInt(req.body.timezoneOffset, 10) 
          : 0; // Minutes offset from UTC (e.g., -300 for EST)

        const metadata = {
          userId: authUser?._id?.toString() || req.body.userId,
          challengeId: req.body.challengeId,
          date: req.body.date, // YYYY-MM-DD in user's local date
          uploadedAt: uploadedAt.toISOString(), // Server UTC timestamp
          localTimestamp, // ISO string from client's local time
          timezone, // IANA timezone identifier
          timezoneOffset, // Numeric offset in minutes
        } as Record<string, any>;

        await new Promise<void>((resolve, reject) => {
          const uploadStream = bucket.openUploadStream(filename, {
            metadata,
            contentType: (req.file as any).mimetype || 'image/jpeg',
          });

          uploadStream.once('finish', () => resolve());
          uploadStream.once('error', (err) => reject(err));

          // Write buffer and end
          uploadStream.end((req.file as any).buffer);
        })
          .then(async () => {
            // Retrieve the just-inserted file to get its id (sorted by uploadDate desc)
            const cursor = bucket.find({ filename }).sort({ uploadDate: -1 }).limit(1);
            const files = await cursor.toArray();
            const file = files[0];

            res.status(201).json({
              message: 'Photo uploaded successfully',
              file: {
                filename,
                id: file?._id,
                metadata,
              },
            });
          });
      } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ 
          message: 'Error uploading photo',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  ],

  /**
   * Get progress photos for a user's challenge
   * GET /api/gallery
   * Query params:
   * - userId: string (required)
   * - challengeId: string (optional)
   * - startDate: string (optional) - ISO date string
   * - endDate: string (optional) - ISO date string
   */
  getProgressPhotos: async (req: Request, res: Response) => {
    try {
      const { userId, challengeId, startDate, endDate } = req.query;

      if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
      }

      // Get GridFS bucket
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'photos'
      });

      // Build metadata query
      const metadataQuery: any = {
        'metadata.userId': userId
      };

      if (challengeId) {
        metadataQuery['metadata.challengeId'] = challengeId;
      }

      if (startDate || endDate) {
        metadataQuery['metadata.date'] = {};
        if (startDate) {
          metadataQuery['metadata.date'].$gte = startDate;
        }
        if (endDate) {
          metadataQuery['metadata.date'].$lte = endDate;
        }
      }

      // Find all matching files
      const cursor = bucket.find(metadataQuery);
      const files = await cursor.toArray();

      if (!files.length) {
        return res.status(404).json({ 
          message: 'No photos found for the given criteria' 
        });
      }

      // Format the response
      const photos = files.map(file => ({
        id: file._id,
        filename: file.filename,
        uploadDate: file.uploadDate,
        metadata: file.metadata,
        url: `/api/gallery/${file._id}` // Endpoint to stream the file
      }));

      res.json(photos);
    } catch (error) {
      console.error('Error retrieving photos:', error);
      res.status(500).json({ 
        message: 'Error retrieving photos',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get progress photos for a specific challenge
   * GET /api/gallery/challenge/:challengeId
   */
  getChallengePhotos: async (req: Request, res: Response) => {
    try {
      const { challengeId } = req.params;

      // Get authenticated user
      const authUser: any = (req as any).user;
      if (!authUser || !authUser._id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = authUser._id.toString();

      // Get GridFS bucket
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'photos'
      });

      // Build metadata query - filter by both userId and challengeId
      const metadataQuery: any = {
        'metadata.userId': userId,
        'metadata.challengeId': challengeId
      };

      // Find all matching files, sorted by upload date (newest first)
      const cursor = bucket.find(metadataQuery).sort({ uploadDate: -1 });
      const files = await cursor.toArray();

      if (!files.length) {
        return res.status(404).json({ 
          message: 'No photos found for this challenge' 
        });
      }

      // Format the response
      const photos = files.map(file => ({
        id: file._id,
        filename: file.filename,
        uploadDate: file.uploadDate,
        metadata: file.metadata,
        url: `/api/gallery/${file._id}` // Endpoint to stream the file
      }));

      res.json({
        message: 'Challenge photos retrieved successfully',
        challengeId,
        count: photos.length,
        photos
      });
    } catch (error) {
      console.error('Error retrieving challenge photos:', error);
      res.status(500).json({ 
        message: 'Error retrieving challenge photos',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  streamPhoto: async (req: Request, res: Response) => {
    try {
      const fileId = new mongoose.Types.ObjectId(req.params.id);
      
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'photos'
      });

      // Check if file exists
      const files = await bucket.find({ _id: fileId }).toArray();
      if (!files.length) {
        return res.status(404).json({ message: 'Photo not found' });
      }

      const file = files[0];

      // Set content type
      res.set('Content-Type', 'image/jpeg');
      
      // Stream the file
      bucket.openDownloadStream(fileId).pipe(res);
    } catch (error) {
      console.error('Error streaming photo:', error);
      res.status(500).json({ 
        message: 'Error streaming photo',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Delete a specific photo by its ID
   * DELETE /api/gallery/:id
   */
  deletePhoto: async (req: Request, res: Response) => {
    try {
      const fileId = new mongoose.Types.ObjectId(req.params.id);
      const authUser = (req as any).user;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'photos'
      });

      // Check if file exists and verify ownership
      const files = await bucket.find({ _id: fileId }).toArray();
      if (!files.length) {
        return res.status(404).json({ message: 'Photo not found' });
      }

      const file = files[0];
      
      // Verify user owns this photo (optional but recommended for security)
      if (authUser && file.metadata?.userId && file.metadata.userId !== authUser._id.toString()) {
        return res.status(403).json({ 
          message: 'Unauthorized: You can only delete your own photos' 
        });
      }

      // Delete the file from GridFS
      await bucket.delete(fileId);

      res.json({ 
        message: 'Photo deleted successfully',
        deletedId: fileId 
      });
    } catch (error) {
      console.error('Error deleting photo:', error);
      res.status(500).json({ 
        message: 'Error deleting photo',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

// Example usage in routes:
/*
import { Router } from 'express';
import { galleryController } from '../controllers/galleryController';

const router = Router();

// Upload a photo
router.post('/upload', galleryController.uploadProgressPhoto);

// Get photos (with optional filters)
router.get('/', galleryController.getProgressPhotos);

// Stream a specific photo
router.get('/:id', galleryController.streamPhoto);

export default router;
*/
