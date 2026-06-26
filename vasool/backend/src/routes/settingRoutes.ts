import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getSettings);
router.put('/', updateSettings);

export default router;
