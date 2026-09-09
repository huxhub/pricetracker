import express from 'express';
import alertController from '../controllers/alert.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', (req, res, next) => alertController.create(req, res, next));
router.get('/', (req, res, next) => alertController.list(req, res, next));
router.get('/:id', (req, res, next) => alertController.getById(req, res, next));
router.patch('/:id', (req, res, next) => alertController.update(req, res, next));
router.delete('/:id', (req, res, next) => alertController.delete(req, res, next));

export default router;
