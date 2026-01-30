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

export class SubscriptionController {
  /**
   * Cria uma nova assinatura Pro
   */
  static async createSubscription(req: AuthRequest, res: Response) {
    try {
      const { email } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const userRepository = AppDataSource.getRepository(User);
      const subscriptionRepository = AppDataSource.getRepository(Subscription);

      const user = await userRepository.findOne({ 
        where: { id: userId },
        relations: ['subscription']
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verifica se já existe uma assinatura ativa
      if (user.subscription && ['active', 'trial'].includes(user.subscription.status)) {
        return res.status(400).json({ error: 'Você já possui uma assinatura ativa' });
      }

      // Cria preapproval no Mercado Pago
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      // URL de retorno completa
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const backUrl = `${frontendUrl}/settings`;
      const environment = mercadoPagoService.getEnvironment();

      console.log(`[${environment.toUpperCase()}] Criando assinatura para usuário: ${user.email}`);

      const preapprovalData = await mercadoPagoService.createSubscription({
        reason: 'Assinatura Estoka Pro',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 0.01,
          currency_id: 'BRL'
        },
        back_url: backUrl,
        free_trial: {
          frequency: 14,
          frequency_type: 'days'
        },
        payer_email: email || user.email,
        status: 'authorized'
      });

      // Cria ou atualiza registro de assinatura
      let subscription = user.subscription;
      
      if (!subscription) {
        subscription = subscriptionRepository.create({
          user_id: userId,
          user: user
        });
      }

      subscription.preapproval_id = preapprovalData.id;
      subscription.plan = 'pro';
      subscription.status = 'trial';
      subscription.amount = 0.01;
      subscription.currency = 'BRL';
      subscription.billing_cycle = 'monthly';
      subscription.trial_start = new Date();
      subscription.trial_end = trialEndDate;
      subscription.subscription_start = new Date();

      await subscriptionRepository.save(subscription);

      // Atualiza campos do usuário para acesso rápido
      user.is_pro = true;
      user.plan = 'pro';
      user.subscription_status = 'trial';
      user.subscription_id = preapprovalData.id;
      await userRepository.save(user);

      return res.json({ 
        success: true,
        init_point: preapprovalData.init_point,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          trial_end: subscription.trial_end
        },
        environment
      });
    } catch (error: any) {
      console.error('Erro ao criar assinatura:', error);
      return res.status(500).json({ 
        error: 'Erro ao criar assinatura',
        details: error.message
      });
    }
  }

  /**
   * Busca status da assinatura atual
   */
  static async getSubscriptionStatus(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;

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

      if (!user.subscription) {
        return res.json({
          plan: 'basic',
          status: 'inactive',
          is_pro: false
        });
      }

      return res.json({
        id: user.subscription.id,
        plan: user.subscription.plan,
        status: user.subscription.status,
        is_pro: user.is_pro,
        amount: user.subscription.amount,
        currency: user.subscription.currency,
        billing_cycle: user.subscription.billing_cycle,
        trial_start: user.subscription.trial_start,
        trial_end: user.subscription.trial_end,
        next_billing_date: user.subscription.next_billing_date,
        subscription_start: user.subscription.subscription_start,
        subscription_end: user.subscription.subscription_end
      });
    } catch (error: any) {
      console.error('Erro ao buscar status da assinatura:', error);
      return res.status(500).json({ error: 'Erro ao buscar assinatura' });
    }
  }

  /**
   * Cancela assinatura ativa
   */
  static async cancelSubscription(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { reason } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const userRepository = AppDataSource.getRepository(User);
      const subscriptionRepository = AppDataSource.getRepository(Subscription);

      const user = await userRepository.findOne({ 
        where: { id: userId },
        relations: ['subscription']
      });

      if (!user || !user.subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      const subscription = user.subscription;

      if (!['active', 'trial'].includes(subscription.status)) {
        return res.status(400).json({ error: 'Assinatura não está ativa' });
      }

      // Cancela no Mercado Pago
      if (subscription.preapproval_id) {
        await mercadoPagoService.cancelSubscription(subscription.preapproval_id);
      }

      // Atualiza no banco
      subscription.status = 'cancelled';

      subscription.cancelled_at = new Date();
      subscription.cancellation_reason = reason || '';
      subscription.subscription_end = new Date();

      await subscriptionRepository.save(subscription);

      // Atualiza usuário
      user.is_pro = false;
      user.plan = 'basic';
      user.subscription_status = 'cancelled';
      await userRepository.save(user);

      return res.json({ 
        success: true,
        message: 'Assinatura cancelada com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao cancelar assinatura:', error);
      return res.status(500).json({ 
        error: 'Erro ao cancelar assinatura',
        details: error.message
      });
    }
  }

  /**
   * Reativa assinatura cancelada
   */
  static async reactivateSubscription(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const userRepository = AppDataSource.getRepository(User);
      const subscriptionRepository = AppDataSource.getRepository(Subscription);

      const user = await userRepository.findOne({ 
        where: { id: userId },
        relations: ['subscription']
      });

      if (!user || !user.subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      const subscription = user.subscription;

      if (subscription.status !== 'cancelled') {
        return res.status(400).json({ error: 'Apenas assinaturas canceladas podem ser reativadas' });
      }

      // Reativa no Mercado Pago
      if (subscription.preapproval_id) {
        await mercadoPagoService.reactivateSubscription(subscription.preapproval_id);
      }

      // Atualiza no banco
      subscription.status = 'active';
      subscription.cancelled_at = null;
      subscription.cancellation_reason = null;
      subscription.subscription_end = null;

      await subscriptionRepository.save(subscription);

      // Atualiza usuário
      user.is_pro = true;
      user.plan = 'pro';
      user.subscription_status = 'active';
      await userRepository.save(user);

      return res.json({ 
        success: true,
        message: 'Assinatura reativada com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao reativar assinatura:', error);
      return res.status(500).json({ 
        error: 'Erro ao reativar assinatura',
        details: error.message
      });
    }
  }

  /**
   * Sincroniza status com Mercado Pago
   */
  static async syncSubscriptionStatus(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const userRepository = AppDataSource.getRepository(User);
      const subscriptionRepository = AppDataSource.getRepository(Subscription);

      const user = await userRepository.findOne({ 
        where: { id: userId },
        relations: ['subscription']
      });

      if (!user || !user.subscription || !user.subscription.preapproval_id) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      const subscription = user.subscription;
      
      // Busca dados atualizados do Mercado Pago
      const mpData = await mercadoPagoService.getSubscription(subscription.preapproval_id);

      // Atualiza status
      subscription.status = mpData.status === 'authorized' ? 'active' : mpData.status;
      if (mpData.next_payment_date) {
        subscription.next_billing_date = new Date(mpData.next_payment_date);
      }

      await subscriptionRepository.save(subscription);

      // Atualiza usuário
      user.is_pro = ['active', 'trial', 'authorized'].includes(subscription.status);
      user.subscription_status = subscription.status;
      await userRepository.save(user);

      return res.json({ 
        success: true,
        subscription: {
          status: subscription.status,
          next_billing_date: subscription.next_billing_date
        }
      });
    } catch (error: any) {
      console.error('Erro ao sincronizar assinatura:', error);
      return res.status(500).json({ 
        error: 'Erro ao sincronizar assinatura',
        details: error.message
      });
    }
  }

  /**
   * Webhook para notificações do Mercado Pago
   */
  static async handleWebhook(req: any, res: Response) {
    try {
      const payload: WebhookPayload = req.body;
      console.log('Webhook recebido:', JSON.stringify(payload, null, 2));

      // Verifica tipo de notificação
      if (payload.type === 'subscription_preapproval') {
        const preapprovalId = payload.data.id;

        const subscriptionRepository = AppDataSource.getRepository(Subscription);
        const userRepository = AppDataSource.getRepository(User);

        // Busca assinatura no banco
        const subscription = await subscriptionRepository.findOne({
          where: { preapproval_id: preapprovalId },
          relations: ['user']
        });

        if (!subscription) {
          console.log('Assinatura não encontrada para preapproval_id:', preapprovalId);
          return res.status(200).json({ received: true });
        }

        // Busca dados atualizados do Mercado Pago
        const mpData = await mercadoPagoService.getSubscription(preapprovalId);

        // Atualiza status baseado na ação
        if (payload.action === 'created') {
          subscription.status = 'trial';
        } else if (payload.action === 'payment.created') {
          subscription.status = 'active';
          
          // Atualiza trial_end se estava em trial
          if (subscription.status === 'trial') {
            subscription.trial_end = new Date();
          }
        } else if (payload.action === 'cancelled' || mpData.status === 'cancelled') {
          subscription.status = 'cancelled';
          subscription.cancelled_at = new Date();
        } else if (payload.action === 'paused' || mpData.status === 'paused') {
          subscription.status = 'paused';
        }

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

        console.log('Assinatura atualizada:', subscription.id, 'Status:', subscription.status);
      }

      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Erro ao processar webhook:', error);
      // Sempre retorna 200 para evitar retry do Mercado Pago
      return res.status(200).json({ received: true, error: error.message });
    }
  }
}
