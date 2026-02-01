import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';
import { Subscription } from '../entities/Subscription.entity';
import mercadoPagoService from './mercadopago.service';

/**
 * Interface para o payload do webhook do Mercado Pago
 */
interface WebhookPayload {
  action: string;
  type: string;
  data: {
    id: string;
  };
  live_mode?: boolean;
  date_created?: string;
}

/**
 * Serviço centralizado para processar webhooks do Mercado Pago
 * Suporta tanto pagamentos únicos quanto assinaturas
 */
export class WebhookService {
  /**
   * Processa notificações de webhook do Mercado Pago
   */
  static async handleMercadoPagoWebhook(req: any, res: Response) {
    try {
      const payload: WebhookPayload = req.body;
      const environment = mercadoPagoService.getEnvironment();
      
      console.log('=== WEBHOOK RECEBIDO ===');
      console.log(`Ambiente: ${environment.toUpperCase()}`);
      console.log(`Tipo: ${payload.type}`);
      console.log(`Ação: ${payload.action}`);
      console.log(`Live Mode: ${payload.live_mode}`);
      console.log('Payload completo:', JSON.stringify(payload, null, 2));

      // Processa baseado no tipo de notificação
      if (payload.type === 'payment') {
        await this.handlePaymentNotification(payload);
      } else if (payload.type === 'subscription_preapproval' || payload.type === 'subscription') {
        await this.handleSubscriptionNotification(payload);
      } else {
        console.log(`⚠️ Tipo de webhook não suportado: ${payload.type}`);
      }

      // Sempre retorna 200 para evitar retry do Mercado Pago
      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('❌ Erro ao processar webhook:', error);
      // Sempre retorna 200 para evitar retry do Mercado Pago
      return res.status(200).json({ received: true, error: error.message });
    }
  }

  /**
   * Processa notificações de pagamento
   */
  private static async handlePaymentNotification(payload: WebhookPayload) {
    try {
      const paymentId = payload.data.id;
      console.log(`📦 Processando pagamento: ${paymentId}`);

      // Busca detalhes do pagamento
      const paymentDetails = await mercadoPagoService.getPaymentDetails(paymentId);

      console.log('Detalhes do pagamento:');
      console.log(`- ID: ${paymentDetails.id}`);
      console.log(`- Status: ${paymentDetails.status}`);
      console.log(`- Referência: ${paymentDetails.external_reference}`);
      console.log(`- Valor: ${paymentDetails.transaction_amount} ${paymentDetails.currency_id}`);

      // External reference agora é apenas o userId
      const userId = paymentDetails.external_reference;

      if (!userId) {
        console.log('⚠️ external_reference não encontrado');
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const subscriptionRepository = AppDataSource.getRepository(Subscription);

      const user = await userRepository.findOne({
        where: { id: userId },
        relations: ['subscription']
      });

      if (!user) {
        console.log(`⚠️ Usuário não encontrado: ${userId}`);
        return;
      }

      // Se pagamento aprovado, ativa a assinatura
      if (paymentDetails.status === 'approved') {
        let subscription = user.subscription;

        if (!subscription) {
          subscription = subscriptionRepository.create({
            user_id: userId,
            user: user
          });
        }

        // Ativa assinatura por 30 dias
        const now = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        subscription.plan = 'pro';
        subscription.status = 'active';
        subscription.amount = paymentDetails.transaction_amount;
        subscription.currency = paymentDetails.currency_id;
        subscription.billing_cycle = 'one-time';
        subscription.subscription_start = now;
        subscription.subscription_end = endDate;
        subscription.payment_method = paymentDetails.payment_method_id;

        await subscriptionRepository.save(subscription);

        // Atualiza usuário
        user.is_pro = true;
        user.plan = 'pro';
        user.subscription_status = 'active';
        await userRepository.save(user);

        console.log(`✅ Assinatura PRO ativada para usuário ${userId}`);
        console.log(`✅ Plano: ${subscription.plan} | Status: ${subscription.status}`);
        console.log(`✅ Válido até: ${endDate.toLocaleDateString('pt-BR')}`);
      } else if (paymentDetails.status === 'rejected' || paymentDetails.status === 'cancelled') {
        if (user.subscription) {
          user.subscription.status = 'cancelled';
          await subscriptionRepository.save(user.subscription);
        }
        console.log(`❌ Pagamento ${paymentDetails.status} para usuário ${userId}`);
      } else {
        console.log(`⏳ Pagamento pendente: ${paymentDetails.status}`);
      }
    } catch (error: any) {
      console.error('❌ Erro ao processar notificação de pagamento:', error);
      throw error;
    }
  }

  /**
   * Processa notificações de assinatura (preapproval)
   */
  private static async handleSubscriptionNotification(payload: WebhookPayload) {
    try {
      const preapprovalId = payload.data.id;
      console.log(`📋 Processando assinatura: ${preapprovalId}`);

      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const userRepository = AppDataSource.getRepository(User);

      // Busca assinatura no banco
      const subscription = await subscriptionRepository.findOne({
        where: { preapproval_id: preapprovalId },
        relations: ['user']
      });

      if (!subscription) {
        console.log(`⚠️ Assinatura não encontrada para preapproval_id: ${preapprovalId}`);
        return;
      }

      // Busca dados atualizados do Mercado Pago
      const mpData = await mercadoPagoService.getSubscription(preapprovalId);

      console.log('Detalhes da assinatura:');
      console.log(`- ID: ${mpData.id}`);
      console.log(`- Status MP: ${mpData.status}`);
      console.log(`- Ação: ${payload.action}`);

      // Atualiza status baseado na ação e status do MP
      let newStatus = subscription.status;

      if (payload.action === 'created') {
        newStatus = 'trial';
      } else if (payload.action === 'payment.created') {
        newStatus = 'active';
        // Finaliza trial se estava ativo
        if (subscription.status === 'trial' && subscription.trial_end) {
          subscription.trial_end = new Date();
        }
      } else if (payload.action === 'cancelled' || mpData.status === 'cancelled') {
        newStatus = 'cancelled';
        subscription.cancelled_at = new Date();
      } else if (payload.action === 'paused' || mpData.status === 'paused') {
        newStatus = 'paused';
      } else if (mpData.status === 'authorized') {
        newStatus = 'active';
      }

      subscription.status = newStatus;

      // Atualiza próxima data de cobrança
      if (mpData.next_payment_date) {
        subscription.next_billing_date = new Date(mpData.next_payment_date);
      }

      await subscriptionRepository.save(subscription);

      // Atualiza usuário
      const user = subscription.user;
      user.is_pro = ['active', 'trial', 'authorized'].includes(subscription.status);
      user.subscription_status = subscription.status;
      await userRepository.save(user);

      console.log(`✅ Assinatura atualizada: ${subscription.id}`);
      console.log(`✅ Novo status: ${subscription.status}`);
      console.log(`✅ Usuário PRO: ${user.is_pro}`);
    } catch (error: any) {
      console.error('❌ Erro ao processar notificação de assinatura:', error);
      throw error;
    }
  }
}

export default WebhookService;
