import { Router } from 'express';
import { FinanceController } from '../controllers/finance.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/transactions', FinanceController.getTransactions);
router.post('/transactions', FinanceController.create);
router.delete('/transactions/:id', FinanceController.delete);

export default router;
