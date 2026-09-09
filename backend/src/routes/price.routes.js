import express from 'express';
import priceController from '../controllers/price.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/prices', (req, res, next) => priceController.getPrices(req, res, next));
router.get('/prices/history', (req, res, next) => priceController.getHistory(req, res, next));
router.get('/comparison', (req, res, next) => priceController.getComparison(req, res, next));

export default router;
