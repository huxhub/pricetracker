import { query } from '../config/database.js';
import emailService from './email.service.js';

export class AlertService {
  async evaluateAlertsForLink({ productLinkId, oldPrice, newPrice, comparison }) {
    if (!productLinkId || newPrice === null || isNaN(newPrice)) return;

    const [alerts] = await query(
      `SELECT
        pa.id AS alert_id,
        pa.user_id,
        pa.alert_type,
        pa.target_price,
        pa.last_triggered_at,
        pa.last_notified_price,
        u.email AS user_email,
        u.name AS user_name,
        p.title AS product_title,
        pl.url AS product_url,
        plt.name AS platform_name
      FROM price_alerts pa
      JOIN users u ON pa.user_id = u.id
      JOIN product_links pl ON pa.product_link_id = pl.id
      JOIN products p ON pl.product_id = p.id
      JOIN platforms plt ON pl.platform_id = plt.id
      WHERE pa.product_link_id = ? AND pa.is_active = TRUE`,
      [productLinkId]
    );

    for (const alert of alerts) {
      await this.checkAndTriggerAlert(alert, { oldPrice, newPrice, comparison });
    }
  }

  async checkAndTriggerAlert(alert, { oldPrice, newPrice, comparison }) {
    let shouldTrigger = false;
    let alertReason = '';

    const targetPrice = alert.target_price !== null ? Number(alert.target_price) : null;
    const lastNotifiedPrice = alert.last_notified_price !== null ? Number(alert.last_notified_price) : null;

    switch (alert.alert_type) {
      case 'PRICE_DROP':
        if (oldPrice !== null && newPrice < oldPrice) {
          shouldTrigger = true;
          alertReason = 'PRICE_DROP';
        }
        break;

      case 'TARGET_PRICE':
        if (targetPrice !== null && newPrice <= targetPrice) {
          if (lastNotifiedPrice === null || lastNotifiedPrice > targetPrice) {
            shouldTrigger = true;
            alertReason = 'TARGET_PRICE';
          }
        }
        break;

      case 'ANY_PRICE_CHANGE':
        if (oldPrice !== null && newPrice !== oldPrice) {
          shouldTrigger = true;
          alertReason = 'ANY_PRICE_CHANGE';
        }
        break;
    }

    if (shouldTrigger) {
      if (alertReason === 'TARGET_PRICE') {
        await emailService.sendTargetPriceAlert({
          userEmail: alert.user_email,
          userName: alert.user_name,
          productTitle: alert.product_title,
          platformName: alert.platform_name,
          currentPrice: newPrice,
          targetPrice,
          productUrl: alert.product_url,
        });
      } else {
        await emailService.sendPriceDropAlert({
          userEmail: alert.user_email,
          userName: alert.user_name,
          productTitle: alert.product_title,
          platformName: alert.platform_name,
          oldPrice: oldPrice || newPrice,
          newPrice,
          productUrl: alert.product_url,
        });
      }

      await query(
        `UPDATE price_alerts
         SET last_triggered_at = NOW(), last_notified_price = ?
         WHERE id = ?`,
        [newPrice, alert.alert_id]
      );

      console.log(`[AlertService] Alert #${alert.alert_id} triggered for ${alert.user_email} (${alertReason})`);
    }
  }

  async createAlert({ userId, productLinkId, alertType, targetPrice }) {
    const [result] = await query(
      `INSERT INTO price_alerts (user_id, product_link_id, alert_type, target_price, is_active)
       VALUES (?, ?, ?, ?, TRUE)`,
      [userId, productLinkId, alertType, targetPrice || null]
    );

    return {
      id: result.insertId,
      userId,
      productLinkId,
      alertType,
      targetPrice,
      isActive: true,
    };
  }

  async getUserAlerts(userId) {
    const [alerts] = await query(
      `SELECT
        pa.*,
        p.id AS product_id,
        p.title AS product_title,
        p.image AS product_image,
        pl.url AS product_url,
        pl.current_price,
        plt.name AS platform_name,
        plt.slug AS platform_slug
      FROM price_alerts pa
      JOIN product_links pl ON pa.product_link_id = pl.id
      JOIN products p ON pl.product_id = p.id
      JOIN platforms plt ON pl.platform_id = plt.id
      WHERE pa.user_id = ?
      ORDER BY pa.created_at DESC`,
      [userId]
    );
    return alerts;
  }
}

const alertService = new AlertService();
export default alertService;
export { alertService };
