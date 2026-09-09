import alertService from '../services/alert.service.js';
import { query } from '../config/database.js';

export class AlertController {
  async create(req, res, next) {
    try {
      const { productLinkId, alertType, targetPrice } = req.body;

      if (!productLinkId || !alertType) {
        return res.status(400).json({ error: 'productLinkId and alertType are required' });
      }

      if (!['PRICE_DROP', 'TARGET_PRICE', 'ANY_PRICE_CHANGE'].includes(alertType)) {
        return res.status(400).json({ error: 'Invalid alertType. Must be PRICE_DROP, TARGET_PRICE, or ANY_PRICE_CHANGE.' });
      }

      if (alertType === 'TARGET_PRICE' && (!targetPrice || isNaN(targetPrice))) {
        return res.status(400).json({ error: 'A valid targetPrice is required for TARGET_PRICE alert.' });
      }

      const alert = await alertService.createAlert({
        userId: req.user.id,
        productLinkId,
        alertType,
        targetPrice,
      });

      res.status(201).json({
        success: true,
        message: 'Price alert configured successfully',
        alert,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const alerts = await alertService.getUserAlerts(req.user.id);
      res.json({ success: true, count: alerts.length, alerts });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const [alerts] = await query(
        `SELECT pa.*, p.title AS product_title, pl.url AS product_url
         FROM price_alerts pa
         JOIN product_links pl ON pa.product_link_id = pl.id
         JOIN products p ON pl.product_id = p.id
         WHERE pa.id = ? AND pa.user_id = ? LIMIT 1`,
        [req.params.id, req.user.id]
      );

      if (alerts.length === 0) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      res.json({ success: true, alert: alerts[0] });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { isActive, targetPrice } = req.body;
      const alertId = req.params.id;

      const updates = [];
      const values = [];

      if (isActive !== undefined) {
        updates.push('is_active = ?');
        values.push(isActive ? 1 : 0);
      }
      if (targetPrice !== undefined) {
        updates.push('target_price = ?');
        values.push(targetPrice);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update provided' });
      }

      values.push(alertId, req.user.id);
      const [result] = await query(
        `UPDATE price_alerts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      res.json({ success: true, message: 'Alert updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const alertId = req.params.id;
      const [result] = await query(
        'DELETE FROM price_alerts WHERE id = ? AND user_id = ?',
        [alertId, req.user.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      res.json({ success: true, message: 'Alert removed successfully' });
    } catch (error) {
      next(error);
    }
  }
}

const alertController = new AlertController();
export default alertController;
export { alertController };
