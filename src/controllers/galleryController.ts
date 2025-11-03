import { Request, Response } from 'express';
import mongoose from 'mongoose';
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

        // File was processed by GridFS (through uploadGridFS middleware)
        // Return the file information
        res.status(201).json({
          message: 'Photo uploaded successfully',
          file: {
            filename: req.file.filename,
            id: (req.file as any).id, // GridFS adds this
            metadata: {
              userId: req.body.userId,
              challengeId: req.body.challengeId,
              date: req.body.date
            }
          }
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
   * Stream a specific photo by its ID
   * GET /api/gallery/:id
   */
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
