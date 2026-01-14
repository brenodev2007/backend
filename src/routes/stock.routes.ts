import { Router } from 'express';
import { StockController } from '../controllers/stock.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/balances', StockController.getBalances);
router.get('/movements', StockController.getMovements);
router.post('/movements', StockController.createMovement);

export default router;
