import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * Rotas de Pagamento
 */

// Criar preferência de pagamento (protegido)
router.post('/create', authMiddleware, PaymentController.createPayment);

// Buscar status de um pagamento (protegido)
router.get('/:paymentId', authMiddleware, PaymentController.getPaymentStatus);

export default router;
