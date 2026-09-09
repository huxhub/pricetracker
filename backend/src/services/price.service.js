import { query } from '../config/database.js';
import { comparePrices, findLowestPrice, calculateDiscount } from '../utils/price.utils.js';
import env from '../config/environment.js';

export class PriceService {
  async recordNewPrice(productLinkId, productData) {
    const newPrice = Number(productData.price);
    if (!newPrice || isNaN(newPrice) || newPrice <= 0) {
      throw new Error(`Cannot record non-positive or invalid price: ${productData.price}`);
    }
    const newMrp = productData.mrp ? Number(productData.mrp) : null;
    const newDiscount = calculateDiscount(newPrice, newMrp);

    const [links] = await query(
      'SELECT id, product_id, current_price, current_mrp FROM product_links WHERE id = ?',
      [productLinkId]
    );

    if (links.length === 0) {
      throw new Error(`Product link with ID ${productLinkId} not found`);
    }

    const previousLink = links[0];
    const oldPrice = previousLink.current_price !== null ? Number(previousLink.current_price) : null;

    await query(
      `INSERT INTO price_history (product_link_id, price, mrp, discount, availability, checked_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [productLinkId, newPrice, newMrp, newDiscount, productData.availability || 'In Stock']
    );

    const intervalHours = env.MONITORING.intervalHours;
    await query(
      `UPDATE product_links SET
        current_price = ?,
        current_mrp = ?,
        current_discount = ?,
        availability = ?,
        rating = COALESCE(?, rating),
        review_count = COALESCE(?, review_count),
        seller = COALESCE(?, seller),
        status = 'ACTIVE',
        last_checked_at = NOW(),
        last_successful_check_at = NOW(),
        next_check_at = DATE_ADD(NOW(), INTERVAL ? HOUR)
      WHERE id = ?`,
      [
        newPrice,
        newMrp,
        newDiscount,
        productData.availability || 'In Stock',
        productData.rating || null,
        productData.reviewCount || 0,
        productData.seller || null,
        intervalHours,
        productLinkId,
      ]
    );

    const comparison = oldPrice !== null ? comparePrices(oldPrice, newPrice) : null;

    return {
      productLinkId,
      productId: previousLink.product_id,
      oldPrice,
      newPrice,
      comparison,
    };
  }

  async getProductPriceHistory(productId) {
    const [history] = await query(
      `SELECT
        ph.id,
        ph.product_link_id,
        ph.price,
        ph.mrp,
        ph.discount,
        ph.availability,
        ph.checked_at,
        pl.platform_id,
        p.name AS platform_name,
        p.slug AS platform_slug
      FROM price_history ph
      JOIN product_links pl ON ph.product_link_id = pl.id
      JOIN platforms p ON pl.platform_id = p.id
      WHERE pl.product_id = ?
      ORDER BY ph.checked_at ASC`,
      [productId]
    );

    if (history.length === 0) {
      return {
        history: [],
        statistics: {
          highestPrice: null,
          lowestPrice: null,
          averagePrice: null,
          currentPrice: null,
        },
      };
    }

    const prices = history.map((h) => Number(h.price));
    const highestPrice = Math.max(...prices);
    const lowestPrice = Math.min(...prices);
    const sum = prices.reduce((acc, val) => acc + val, 0);
    const averagePrice = Number((sum / prices.length).toFixed(2));
    const currentPrice = prices[prices.length - 1];

    return {
      history,
      statistics: {
        highestPrice,
        lowestPrice,
        averagePrice,
        currentPrice,
      },
    };
  }

  async getProductComparison(productId) {
    const [links] = await query(
      `SELECT
        pl.id,
        pl.product_id,
        pl.platform_id,
        pl.url,
        pl.current_price,
        pl.current_mrp,
        pl.current_discount,
        pl.currency,
        pl.availability,
        pl.rating,
        pl.review_count,
        pl.seller,
        pl.status,
        pl.last_checked_at,
        p.name AS platform_name,
        p.slug AS platform_slug,
        p.logo_url AS platform_logo
      FROM product_links pl
      JOIN platforms p ON pl.platform_id = p.id
      WHERE pl.product_id = ?`,
      [productId]
    );

    const lowest = findLowestPrice(links);

    const comparisons = links.map((link) => {
      const price = link.current_price !== null ? Number(link.current_price) : null;
      const isLowest = lowest && lowest.linkId === link.id;
      const diffFromLowest = price && lowest ? Number((price - lowest.price).toFixed(2)) : 0;

      return {
        ...link,
        isLowest,
        diffFromLowest,
      };
    });

    return {
      productId,
      platforms: comparisons,
      lowestPrice: lowest,
    };
  }
}

const priceService = new PriceService();
export default priceService;
export { priceService };
