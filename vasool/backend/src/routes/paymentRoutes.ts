import { Router } from 'express';
import { getPaymentsByCustomer, createPayment, deletePayment } from '../controllers/paymentController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/customer/:customerId', getPaymentsByCustomer);
router.post('/', createPayment);
router.delete('/:id', deletePayment);

export default router;
