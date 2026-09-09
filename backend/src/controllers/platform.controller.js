import platformService from '../services/platform.service.js';

export class PlatformController {
  async list(req, res, next) {
    try {
      const platforms = await platformService.getAllPlatforms(false);
      res.json({ success: true, platforms });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const platform = await platformService.getPlatformById(req.params.id);
      if (!platform) {
        return res.status(404).json({ error: 'Platform not found' });
      }
      res.json({ success: true, platform });
    } catch (error) {
      next(error);
    }
  }
}

const platformController = new PlatformController();
export default platformController;
export { platformController };
