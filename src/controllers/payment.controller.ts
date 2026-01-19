import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';
import { Subscription } from '../entities/Subscription.entity';
import mercadoPagoService from '../services/mercadopago.service';

interface WebhookPayload {
  action: string;
  type: string;
  data: {
    id: string;
  };
}

export class PaymentController {
  /**
   * Cria uma preferência de pagamento (checkout)
   */
  static async createPayment(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { plan = 'pro', amount = 0.01 } = req.body;

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

      console.log('Criando preferência de checkout com:');
      console.log('- URLs de retorno:', backUrls);
      console.log('- Webhook URL:', webhookUrl || 'Não configurado');
      console.log('- Email do pagador:', user.email);

      // Cria preferência de checkout
      const preference = await mercadoPagoService.createCheckoutPreference({
        items: [
          {
            title: 'Stock Savvy - Plano Pro (14 dias grátis)',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: amount
          }
        ],
        payer: {
          email: user.email
        },
        external_reference: externalReference,
        back_urls: backUrls,
        notification_url: webhookUrl
      });

      // Determina qual link usar (sandbox ou produção)
      const isSandbox = mercadoPagoService.isSandboxMode();
      const checkoutUrl = isSandbox ? preference.sandbox_init_point : preference.init_point;

      console.log(`Preferência criada: ${preference.id} (${isSandbox ? 'SANDBOX' : 'PRODUÇÃO'})`);
      console.log(`Checkout URL: ${checkoutUrl}`);

      return res.json({
        success: true,
        preference_id: preference.id,
        checkout_url: checkoutUrl,
        external_reference: externalReference,
        sandbox: isSandbox
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

  /**
   * Webhook para notificações do Mercado Pago
   */
  static async handlePaymentWebhook(req: any, res: Response) {
    try {
      const payload: WebhookPayload = req.body;
      console.log('=== WEBHOOK RECEBIDO ===');
      console.log(JSON.stringify(payload, null, 2));

      // Verifica tipo de notificação
      if (payload.type === 'payment') {
        const paymentId = payload.data.id;

        // Busca detalhes do pagamento
        const paymentDetails = await mercadoPagoService.getPaymentDetails(paymentId);

        console.log('Detalhes do pagamento:');
        console.log(`- ID: ${paymentDetails.id}`);
        console.log(`- Status: ${paymentDetails.status}`);
        console.log(`- Referência: ${paymentDetails.external_reference}`);
        console.log(`- Valor: ${paymentDetails.transaction_amount} ${paymentDetails.currency_id}`);

        // Extrai user_id da referência externa
        const externalRef = paymentDetails.external_reference;
        const userIdMatch = externalRef?.match(/payment_(.+?)_/);

        if (userIdMatch && userIdMatch[1]) {
          const userId = userIdMatch[1]; // UUID string

          const userRepository = AppDataSource.getRepository(User);
          const subscriptionRepository = AppDataSource.getRepository(Subscription);

          const user = await userRepository.findOne({
            where: { id: userId },
            relations: ['subscription']
          });

          if (user) {
            // Se pagamento aprovado, ativa a assinatura
            if (paymentDetails.status === 'approved' && paymentDetails.transaction_amount >= 0.01) {
              let subscription = user.subscription;

              if (!subscription) {
                subscription = subscriptionRepository.create({
                  user_id: userId,
                  user: user
                });
              }

              // Calcula datas
              const now = new Date();
              const trialEnd = new Date();
              trialEnd.setDate(trialEnd.getDate() + 14);

              subscription.plan = 'pro';
              subscription.status = 'trial';
              subscription.amount = paymentDetails.transaction_amount;
              subscription.currency = paymentDetails.currency_id;
              subscription.billing_cycle = 'one_time';
              subscription.trial_start = now;
              subscription.trial_end = trialEnd;
              subscription.subscription_start = now;

              await subscriptionRepository.save(subscription);

              // Atualiza usuário
              user.is_pro = true;
              user.plan = 'pro';
              user.subscription_status = 'trial';
              await userRepository.save(user);

              console.log(`✅ Assinatura ativada para usuário ${userId}`);
              console.log(`✅ Plano: ${subscription.plan} | Status: ${subscription.status}`);
              console.log(`✅ Trial até: ${trialEnd.toLocaleDateString('pt-BR')}`);
            } else {
              console.log(`⚠️ Pagamento não aprovado ou sem valor: ${paymentDetails.status}`);
            }
          } else {
            console.log(`⚠️ Usuário não encontrado: ${userId}`);
          }
        } else {
          console.log('⚠️ Não foi possível extrair user_id da referência externa');
        }
      }

      // Sempre retorna 200 para evitar retry do Mercado Pago
      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Erro ao processar webhook:', error);
      // Sempre retorna 200 para evitar retry do Mercado Pago
      return res.status(200).json({ received: true, error: error.message });
    }
  }
}
