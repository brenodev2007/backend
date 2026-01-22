import { Router } from 'express';
import { ShopeeController } from '../controllers/shopee.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/stats', ShopeeController.getStats);
router.get('/orders', ShopeeController.getOrders);

export default router;
