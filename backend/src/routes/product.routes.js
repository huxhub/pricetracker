import express from 'express';
import productController from '../controllers/product.controller.js';
import productLinkController from '../controllers/productLink.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

// Products CRUD
router.get('/', (req, res, next) => productController.list(req, res, next));
router.post('/', (req, res, next) => productController.create(req, res, next));
router.get('/:id', (req, res, next) => productController.getById(req, res, next));
router.patch('/:id', (req, res, next) => productController.update(req, res, next));
router.delete('/:id', (req, res, next) => productController.delete(req, res, next));

// Product Links Management
router.post('/:id/links', (req, res, next) => productLinkController.addLink(req, res, next));
router.get('/:id/links', (req, res, next) => productLinkController.listLinks(req, res, next));
router.delete('/:id/links/:linkId', (req, res, next) => productLinkController.deleteLink(req, res, next));
router.post('/:id/links/:linkId/refresh', (req, res, next) => productLinkController.refreshLink(req, res, next));

export default router;
