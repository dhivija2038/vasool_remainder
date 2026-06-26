import { Router } from 'express';
import { getDashboardStats, getDashboardCharts } from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/stats', getDashboardStats);
router.get('/charts', getDashboardCharts);

export default router;
