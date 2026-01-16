import axios, { AxiosInstance } from 'axios';

export interface PreapprovalPayload {
  reason: string;
  auto_recurring: {
    frequency: number;
    frequency_type: string;
    transaction_amount: number;
    currency_id: string;
  };
  free_trial?: {
    frequency: number;
    frequency_type: string;
  };
  payer_email: string;
  status?: string;
}

export interface PreapprovalResponse {
  id: string;
  init_point: string;
  status: string;
  payer_email: string;
  auto_recurring: any;
  next_payment_date?: string;
}

export class MercadoPagoService {
  private client: AxiosInstance;
  private accessToken: string;

  constructor() {
    this.accessToken = process.env.MP_ACCESS_TOKEN || '';
    
    if (!this.accessToken) {
      throw new Error('MP_ACCESS_TOKEN não configurado');
    }

    this.client = axios.create({
      baseURL: 'https://api.mercadopago.com',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
  }

  /**
   * Cria uma assinatura (preapproval) no Mercado Pago
   */
  async createSubscription(payload: PreapprovalPayload): Promise<PreapprovalResponse> {
    try {
      const response = await this.client.post('/preapproval', payload);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao criar assinatura no Mercado Pago:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Erro ao criar assinatura');
    }
  }

  /**
   * Busca detalhes de uma assinatura existente
   */
  async getSubscription(preapprovalId: string): Promise<PreapprovalResponse> {
    try {
      const response = await this.client.get(`/preapproval/${preapprovalId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar assinatura:', error.response?.data || error.message);
      throw new Error('Erro ao buscar assinatura');
    }
  }

  /**
   * Cancela uma assinatura
   */
  async cancelSubscription(preapprovalId: string): Promise<void> {
    try {
      await this.client.put(`/preapproval/${preapprovalId}`, {
        status: 'cancelled'
      });
    } catch (error: any) {
      console.error('Erro ao cancelar assinatura:', error.response?.data || error.message);
      throw new Error('Erro ao cancelar assinatura');
    }
  }

  /**
   * Pausa uma assinatura
   */
  async pauseSubscription(preapprovalId: string): Promise<void> {
    try {
      await this.client.put(`/preapproval/${preapprovalId}`, {
        status: 'paused'
      });
    } catch (error: any) {
      console.error('Erro ao pausar assinatura:', error.response?.data || error.message);
      throw new Error('Erro ao pausar assinatura');
    }
  }

  /**
   * Reativa uma assinatura cancelada/pausada
   */
  async reactivateSubscription(preapprovalId: string): Promise<void> {
    try {
      await this.client.put(`/preapproval/${preapprovalId}`, {
        status: 'authorized'
      });
    } catch (error: any) {
      console.error('Erro ao reativar assinatura:', error.response?.data || error.message);
      throw new Error('Erro ao reativar assinatura');
    }
  }

  /**
   * Busca informações de um pagamento
   */
  async getPayment(paymentId: string): Promise<any> {
    try {
      const response = await this.client.get(`/v1/payments/${paymentId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar pagamento:', error.response?.data || error.message);
      throw new Error('Erro ao buscar pagamento');
    }
  }
}

export default new MercadoPagoService();
