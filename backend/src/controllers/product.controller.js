import productService from '../services/product.service.js';
import { query } from '../config/database.js';

export class ProductController {
  async create(req, res, next) {
    try {
      const { urls, title, brand, category } = req.body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'At least one product URL is required in "urls" array' });
      }

      const product = await productService.createProductWithUrls({
        userId: req.user.id,
        urlEntries: urls,
        manualTitle: title,
        brand,
        category,
      });

      res.status(201).json({
        success: true,
        message: 'Product created and tracked successfully',
        product,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const { search, category, limit, offset } = req.query;
      const products = await productService.listProducts({
        userId: req.user.id,
        search,
        category,
        limit,
        offset,
      });

      res.json({
        success: true,
        count: products.length,
        products,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const productId = req.params.id;
      const product = await productService.getProductById(productId);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({
        success: true,
        product,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const productId = req.params.id;
      const { title, brand, category, description } = req.body;

      await query(
        `UPDATE products SET
          title = COALESCE(?, title),
          brand = COALESCE(?, brand),
          category = COALESCE(?, category),
          description = COALESCE(?, description)
         WHERE id = ? AND user_id = ?`,
        [title, brand, category, description, productId, req.user.id]
      );

      const updated = await productService.getProductById(productId);
      res.json({ success: true, product: updated });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const productId = req.params.id;
      const [result] = await query(
        'DELETE FROM products WHERE id = ? AND user_id = ?',
        [productId, req.user.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Product not found or unauthorized' });
      }

      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

const productController = new ProductController();
export default productController;
export { productController };
