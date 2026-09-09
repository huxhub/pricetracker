import express from 'express';
import authController from '../controllers/auth.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/logout', authMiddleware, (req, res, next) => authController.logout(req, res, next));
router.get('/me', authMiddleware, (req, res, next) => authController.me(req, res, next));

export default router;
