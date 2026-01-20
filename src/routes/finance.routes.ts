import { Router } from 'express';
import { FinanceController } from '../controllers/finance.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePro } from '../middlewares/planRestriction.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requirePro); // Requires Pro plan for all finance routes

router.get('/summary', FinanceController.getSummary);
router.get('/transactions', FinanceController.getTransactions);
router.post('/transactions', FinanceController.create);
router.delete('/transactions/:id', FinanceController.delete);

export default router;
