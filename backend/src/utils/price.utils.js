/**
 * Price manipulation and comparison utilities
 */

/**
 * Parses raw text or number into clean decimal price
 * e.g., "₹ 49,999.00", "49,999", "Rs. 1,299" -> 49999
 */
export function parsePrice(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return isNaN(raw) || raw < 0 ? null : Number(raw.toFixed(2));
  }

  const str = String(raw).replace(/[^\d.]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) || parsed < 0 ? null : Number(parsed.toFixed(2));
}

/**
 * Calculates discount percentage
 */
export function calculateDiscount(price, mrp) {
  if (!price || !mrp || mrp <= price) return 0;
  const discount = ((mrp - price) / mrp) * 100;
  return Number(discount.toFixed(2));
}

/**
 * Compares old price with new price
 * Returns { difference, percentage, direction: 'DROP' | 'INCREASE' | 'SAME' }
 */
export function comparePrices(oldPrice, newPrice) {
  const oldP = Number(oldPrice);
  const newP = Number(newPrice);

  if (isNaN(oldP) || isNaN(newP)) {
    return { difference: 0, percentage: 0, direction: 'SAME' };
  }

  const difference = Number((oldP - newP).toFixed(2));
  const percentage = oldP > 0 ? Number(((difference / oldP) * 100).toFixed(2)) : 0;

  let direction = 'SAME';
  if (difference > 0) direction = 'DROP';
  else if (difference < 0) direction = 'INCREASE';

  return {
    difference: Math.abs(difference),
    netDifference: difference,
    percentage: Math.abs(percentage),
    direction,
  };
}

/**
 * Evaluates cross-platform product links to find the lowest price
 */
export function findLowestPrice(productLinks = []) {
  const validLinks = productLinks.filter(
    (l) => l.current_price !== null && l.current_price > 0 && l.status === 'ACTIVE'
  );

  if (validLinks.length === 0) return null;

  let lowest = validLinks[0];
  for (const link of validLinks) {
    if (Number(link.current_price) < Number(lowest.current_price)) {
      lowest = link;
    }
  }

  return {
    linkId: lowest.id,
    platformId: lowest.platform_id,
    platformName: lowest.platform_name || lowest.platform,
    price: Number(lowest.current_price),
    currency: lowest.currency || 'SAR',
  };
}

export default {
  parsePrice,
  calculateDiscount,
  comparePrices,
  findLowestPrice,
};
