import { Router } from 'express';
import { getReminderLogs, createReminderLog } from '../controllers/reminderController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getReminderLogs);
router.post('/', createReminderLog);

export default router;
