import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';
import { Subscription } from '../entities/Subscription.entity';
import mercadoPagoService from '../services/mercadopago.service';


export class PaymentController {
  /**
   * Cria uma preferência de pagamento (checkout)
   */
  static async createPayment(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { plan = 'pro', amount = 1.00 } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ 
        where: { id: userId },
        relations: ['subscription']
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verifica se já possui assinatura ativa
      if (user.subscription && ['active', 'trial'].includes(user.subscription.status)) {
        return res.status(400).json({ error: 'Você já possui uma assinatura ativa' });
      }

      // Gera referência única
      const externalReference = `payment_${userId}_${Date.now()}`;

      // URLs de retorno
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const backUrls = {
        success: `${frontendUrl}/payment/success`,
        failure: `${frontendUrl}/payment/failure`,
        pending: `${frontendUrl}/payment/pending`
      };

      // URL de webhook (se configurada)
      const webhookUrl = process.env.WEBHOOK_URL;
      const environment = mercadoPagoService.getEnvironment();

      // Em sandbox, DEVE usar email de usuário de teste do Mercado Pago
      const payerEmail = environment === 'development' 
        ? (process.env.MP_DEV_TEST_USER_EMAIL || user.email)
        : user.email;

      console.log(`[${environment.toUpperCase()}] Criando preferência de checkout com:`);
      console.log('- URLs de retorno:', backUrls);
      console.log('- Webhook URL:', webhookUrl || 'Não configurado');
      console.log('- Email do pagador:', payerEmail);
      if (environment === 'development') {
        console.log('⚠️  SANDBOX: Usando email de teste. Configure MP_DEV_TEST_USER_EMAIL no .env');
      }

      // Cria preferência de checkout
      const preference = await mercadoPagoService.createCheckoutPreference({
        items: [
          {
            title: 'Estoka - Plano Pro',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: amount
          }
        ],
        payer: {
          email: payerEmail
        },
        external_reference: externalReference,
        back_urls: backUrls,
        notification_url: webhookUrl
      });

      // Determina qual link usar (sandbox ou produção)
      const isSandbox = mercadoPagoService.isSandboxMode();
      const checkoutUrl = isSandbox ? preference.sandbox_init_point : preference.init_point;

      console.log(`Preferência criada: ${preference.id} (${environment.toUpperCase()})`);
      console.log(`Checkout URL: ${checkoutUrl}`);

      return res.json({
        success: true,
        preference_id: preference.id,
        checkout_url: checkoutUrl,
        external_reference: externalReference,
        sandbox: isSandbox,
        environment
      });
    } catch (error: any) {
      console.error('Erro ao criar pagamento:', error);
      return res.status(500).json({
        error: 'Erro ao criar pagamento',
        details: error.message
      });
    }
  }

  /**
   * Busca status de um pagamento
   */
  static async getPaymentStatus(req: AuthRequest, res: Response) {
    try {
      const { paymentId } = req.params;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const paymentDetails = await mercadoPagoService.getPaymentDetails(paymentId);

      return res.json({
        id: paymentDetails.id,
        status: paymentDetails.status,
        status_detail: paymentDetails.status_detail,
        external_reference: paymentDetails.external_reference,
        payment_method: paymentDetails.payment_method_id,
        transaction_amount: paymentDetails.transaction_amount,
        currency: paymentDetails.currency_id,
        date_approved: paymentDetails.date_approved,
        date_created: paymentDetails.date_created
      });
    } catch (error: any) {
      console.error('Erro ao buscar status do pagamento:', error);
      return res.status(500).json({
        error: 'Erro ao buscar status do pagamento',
        details: error.message
      });
    }
  }
}

