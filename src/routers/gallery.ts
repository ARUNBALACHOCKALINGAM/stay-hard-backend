import { Router } from 'express';
import { galleryController } from '../controllers/galleryController';
import { validateObjectId } from '../middleware/validation';
import { authenticateUser } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/gallery/upload
 * @desc    Upload a progress photo
 * @access  Private
 * @body    multipart/form-data { photo: File, userId: string, challengeId: string, date: string }
 */
router.post('/upload', authenticateUser, galleryController.uploadProgressPhoto);

/**
 * @route   GET /api/gallery
 * @desc    Get progress photos with optional filters
 * @access  Private
 * @query   userId: string (required)
 * @query   challengeId?: string
 * @query   startDate?: string (ISO date)
 * @query   endDate?: string (ISO date)
 */
router.get('/', authenticateUser, galleryController.getProgressPhotos);

/**
 * @route   GET /api/gallery/:id
 * @desc    Stream a specific photo
 * @access  Private
 * @param   id - Photo's GridFS ID
 */
router.get('/:id', [authenticateUser, validateObjectId], galleryController.streamPhoto);

export default router;