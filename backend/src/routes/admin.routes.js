import express from 'express';
import adminController from '../controllers/admin.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import adminMiddleware from '../middleware/admin.middleware.js';

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/users', (req, res, next) => adminController.getUsers(req, res, next));
router.get('/products', (req, res, next) => adminController.getProducts(req, res, next));
router.get('/platforms', (req, res, next) => adminController.getPlatforms(req, res, next));
router.get('/scrape-logs', (req, res, next) => adminController.getScrapeLogs(req, res, next));
router.get('/scrape-statistics', (req, res, next) => adminController.getScrapeStatistics(req, res, next));
router.get('/failed-products', (req, res, next) => adminController.getFailedProducts(req, res, next));

export default router;
