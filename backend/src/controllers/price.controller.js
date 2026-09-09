import priceService from '../services/price.service.js';

export class PriceController {
  async getPrices(req, res, next) {
    try {
      const productId = req.params.id;
      const comparison = await priceService.getProductComparison(productId);
      res.json({ success: true, ...comparison });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const productId = req.params.id;
      const historyData = await priceService.getProductPriceHistory(productId);
      res.json({ success: true, ...historyData });
    } catch (error) {
      next(error);
    }
  }

  async getComparison(req, res, next) {
    try {
      const productId = req.params.id;
      const comparison = await priceService.getProductComparison(productId);
      res.json({ success: true, ...comparison });
    } catch (error) {
      next(error);
    }
  }
}

const priceController = new PriceController();
export default priceController;
export { priceController };
