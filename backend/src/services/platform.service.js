import { query } from '../config/database.js';

export class PlatformService {
  async getAllPlatforms(includeInactive = false) {
    const sql = includeInactive
      ? 'SELECT * FROM platforms ORDER BY name ASC'
      : 'SELECT * FROM platforms WHERE is_active = TRUE ORDER BY name ASC';
    const [platforms] = await query(sql);
    return platforms;
  }

  async getPlatformById(id) {
    const [platforms] = await query('SELECT * FROM platforms WHERE id = ?', [id]);
    return platforms[0] || null;
  }

  async createPlatform({ name, slug, domain, scraperKey, logoUrl, isActive = true }) {
    const [result] = await query(
      `INSERT INTO platforms (name, slug, domain, scraper_key, logo_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, slug.toLowerCase(), domain.toLowerCase(), scraperKey.toLowerCase(), logoUrl, isActive]
    );
    return this.getPlatformById(result.insertId);
  }

  async updatePlatform(id, fields) {
    const allowed = ['name', 'domain', 'logo_url', 'is_active', 'scraper_key'];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (allowed.includes(snakeKey)) {
        updates.push(`${snakeKey} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return this.getPlatformById(id);

    values.push(id);
    await query(`UPDATE platforms SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.getPlatformById(id);
  }

  async deletePlatform(id) {
    await query('UPDATE platforms SET is_active = FALSE WHERE id = ?', [id]);
    return { success: true, message: 'Platform deactivated successfully' };
  }
}

const platformService = new PlatformService();
export default platformService;
export { platformService };
