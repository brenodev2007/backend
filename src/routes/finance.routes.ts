import { Router } from 'express';
import { FinanceController } from '../controllers/finance.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireActive } from '../middlewares/access.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireActive);

router.get('/summary', FinanceController.getSummary);
router.get('/transactions', FinanceController.getTransactions);
router.post('/transactions', FinanceController.create);
router.delete('/transactions/:id', FinanceController.delete);

export default router;
