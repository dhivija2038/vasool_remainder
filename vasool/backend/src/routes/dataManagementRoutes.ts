import { Router } from 'express';
import { deleteDataByDateRange } from '../controllers/dataManagementController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/delete-range', deleteDataByDateRange);

export default router;
