import productService from '../services/product.service.js';
import { query } from '../config/database.js';

export class ProductLinkController {
  async addLink(req, res, next) {
    try {
      const productId = req.params.id;
      const { url, platformId } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const [products] = await query('SELECT id FROM products WHERE id = ?', [productId]);
      if (products.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const updatedProduct = await productService.addLinkToProduct(productId, { url, platformId });

      res.status(201).json({
        success: true,
        message: 'Product link added successfully',
        product: updatedProduct,
      });
    } catch (error) {
      next(error);
    }
  }

  async listLinks(req, res, next) {
    try {
      const productId = req.params.id;
      const [links] = await query(
        `SELECT pl.*, p.name AS platform_name, p.slug AS platform_slug, p.logo_url AS platform_logo
         FROM product_links pl
         JOIN platforms p ON pl.platform_id = p.id
         WHERE pl.product_id = ?`,
        [productId]
      );

      res.json({ success: true, links });
    } catch (error) {
      next(error);
    }
  }

  async deleteLink(req, res, next) {
    try {
      const { id: productId, linkId } = req.params;

      const [result] = await query(
        'DELETE FROM product_links WHERE id = ? AND product_id = ?',
        [linkId, productId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Product link not found' });
      }

      res.json({ success: true, message: 'Product link removed successfully' });
    } catch (error) {
      next(error);
    }
  }

  async refreshLink(req, res, next) {
    try {
      const { linkId } = req.params;
      const result = await productService.refreshLink(linkId);

      res.json({
        success: result.success,
        message: result.message || 'Price check completed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

const productLinkController = new ProductLinkController();
export default productLinkController;
export { productLinkController };
