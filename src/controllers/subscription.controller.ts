import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import axios from 'axios';

export class SubscriptionController {
  static async createCheckout(req: AuthRequest, res: Response) {
    try {
      const mpAccessToken = process.env.MP_ACCESS_TOKEN;

      if (!mpAccessToken) {
        return res.status(500).json({ error: 'Mercado Pago não configurado' });
      }

      const payload = {
        reason: 'Assinatura Stock Savvy Pro',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 50.00,
          currency_id: 'BRL'
        },
        free_trial: {
          frequency: 14,
          frequency_type: 'days'
        },
        back_url: req.body.back_url || 'http://localhost:5173/dashboard?success=true',
        status: 'pending',
        payer_email: req.body.email
      };

      const response = await axios.post(
        'https://api.mercadopago.com/preapproval',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mpAccessToken}`
          }
        }
      );

      return res.json({ init_point: response.data.init_point });
    } catch (error: any) {
      console.error('Mercado Pago error:', error.response?.data || error.message);
      return res.status(500).json({ 
        error: 'Erro ao criar assinatura',
        details: error.response?.data
      });
    }
  }
}
