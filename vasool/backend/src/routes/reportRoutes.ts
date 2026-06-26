import { Router } from 'express';
import {
  getCollectionReport,
  getDueReport,
  getOverdueReport,
  getLedgerReport,
  logReportGeneration
} from '../controllers/reportController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/collection', getCollectionReport);
router.get('/due', getDueReport);
router.get('/overdue', getOverdueReport);
router.get('/ledger/:customerId', getLedgerReport);
router.post('/log', logReportGeneration);

export default router;
