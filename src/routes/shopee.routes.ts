import { Router } from 'express';
import { ShopeeController } from '../controllers/shopee.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/stats', ShopeeController.getStats);
router.get('/orders', ShopeeController.getOrders);
router.get('/orders/:id', ShopeeController.getOrderById);
router.post('/orders', ShopeeController.createOrder);
router.put('/orders/:id', ShopeeController.updateOrder);
router.delete('/orders/:id', ShopeeController.deleteOrder);
router.delete('/orders/bulk', ShopeeController.deleteMultipleOrders);

router.get('/accounts', ShopeeController.getAccounts);
router.post('/accounts', ShopeeController.createAccount);
router.put('/accounts/:id/active', ShopeeController.setActiveAccount);
router.delete('/accounts/:id', ShopeeController.deleteAccount);

export default router;
