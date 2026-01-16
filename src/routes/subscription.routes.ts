import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { getPlanLimits } from '../middlewares/planRestriction.middleware';

const router = Router();

// Rotas autenticadas
router.use(authMiddleware);

router.post('/create', SubscriptionController.createSubscription);
router.get('/status', SubscriptionController.getSubscriptionStatus);
router.post('/cancel', SubscriptionController.cancelSubscription);
router.post('/reactivate', SubscriptionController.reactivateSubscription);
router.post('/sync', SubscriptionController.syncSubscriptionStatus);
router.get('/limits', getPlanLimits);

export default router;

export const webhookRouter = Router();
// Webhook não requer autenticação
webhookRouter.post('/webhook', SubscriptionController.handleWebhook);

