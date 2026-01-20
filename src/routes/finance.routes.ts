import { Router } from 'express';
import { FinanceController } from '../controllers/finance.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePro } from '../middlewares/planRestriction.middleware';

const router = Router();

router.use(authMiddleware);

// Relatórios Básicos - Disponível para todos (Summary apenas com totais e gráfico simples)
router.get('/summary', FinanceController.getSummary);

// Relatórios Avançados e Gestão - Apenas Pro
router.get('/transactions', requirePro, FinanceController.getTransactions);
router.post('/transactions', requirePro, FinanceController.create);
router.delete('/transactions/:id', requirePro, FinanceController.delete);

export default router;
