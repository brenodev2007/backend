import { Router } from 'express';
import WebhookService from '../services/webhook.service';

const router = Router();

/**
 * Webhook unificado do Mercado Pago
 * Processa todas as notificações (pagamentos e assinaturas)
 * Não requer autenticação
 */
router.post('/', WebhookService.handleMercadoPagoWebhook);

export default router;
