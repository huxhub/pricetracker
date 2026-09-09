import express from 'express';
import platformController from '../controllers/platform.controller.js';
import adminController from '../controllers/admin.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import adminMiddleware from '../middleware/admin.middleware.js';

const router = express.Router();

// Public platform routes
router.get('/', (req, res, next) => platformController.list(req, res, next));
router.get('/:id', (req, res, next) => platformController.getById(req, res, next));

// Admin platform management
router.post('/', authMiddleware, adminMiddleware, (req, res, next) => adminController.createPlatform(req, res, next));
router.patch('/:id', authMiddleware, adminMiddleware, (req, res, next) => adminController.updatePlatform(req, res, next));
router.delete('/:id', authMiddleware, adminMiddleware, (req, res, next) => adminController.deletePlatform(req, res, next));

export default router;
