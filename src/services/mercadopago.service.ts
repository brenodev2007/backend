import axios, { AxiosInstance } from 'axios';

// ============================================
// INTERFACES - ASSINATURAS (PREAPPROVAL)
// ============================================

export interface PreapprovalPayload {
  reason: string;
  auto_recurring: {
    frequency: number;
    frequency_type: string;
    transaction_amount: number;
    currency_id: string;
  };
  back_url: string;
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



export interface CheckoutPreferencePayload {
  items: Array<{
    title: string;
    quantity: number;
    currency_id: string;
    unit_price: number;
  }>;
  payer: {
    name?: string;
    surname?: string;
    email: string;
  };
  external_reference: string;
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: 'approved' | 'all';
  notification_url?: string;
}

export interface CheckoutPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  date_created: string;
  items: any[];
  payer: any;
  back_urls: any;
  auto_return: string;
  external_reference: string;
}

export interface PaymentDetail {
  id: number;
  status: string;
  status_detail: string;
  external_reference: string;
  payment_method_id: string;
  payment_type_id: string;
  transaction_amount: number;
  currency_id: string;
  date_approved?: string;
  date_created: string;
  payer: any;
}

// ============================================
// SERVICE CLASS
// ============================================

export class MercadoPagoService {
  private client: AxiosInstance;
  private accessToken: string;
  private publicKey: string;
  private isSandbox: boolean;
  private environment: 'development' | 'production';

  constructor() {
    // Detecta o ambiente do Node.js
    const nodeEnv = (process.env.NODE_ENV as 'development' | 'production') || 'development';
    
    // Seleciona as credenciais baseado no NODE_ENV
    if (nodeEnv === 'production') {
      this.accessToken = process.env.MP_PROD_ACCESS_TOKEN || '';
      this.publicKey = process.env.MP_PROD_PUBLIC_KEY || '';
    } else {
      this.accessToken = process.env.MP_DEV_ACCESS_TOKEN || '';
      this.publicKey = process.env.MP_DEV_PUBLIC_KEY || '';
    }
    
    if (!this.accessToken) {
      throw new Error(`Credenciais do Mercado Pago não configuradas para ambiente: ${nodeEnv}`);
    }

    // DETECÇÃO AUTOMÁTICA baseada no prefixo do token
    // TEST- = Sandbox (credenciais de teste)
    // APP_USR- = Produção (credenciais reais)
    const isTestToken = this.accessToken.startsWith('TEST-');
    const isProdToken = this.accessToken.startsWith('APP_USR-');
    
    if (isTestToken) {
      this.isSandbox = true;
      this.environment = 'development';
      console.log('🟡 MERCADO PAGO: Modo SANDBOX (Teste) detectado pelo token TEST-');
    } else if (isProdToken) {
      this.isSandbox = false;
      this.environment = 'production';
      console.log('🟢 MERCADO PAGO: Modo PRODUÇÃO detectado pelo token APP_USR-');
    } else {
      // Fallback para NODE_ENV se o prefixo não for reconhecido
      this.isSandbox = nodeEnv !== 'production';
      this.environment = nodeEnv;
      console.log(`⚠️  MERCADO PAGO: Prefixo de token desconhecido. Usando NODE_ENV=${nodeEnv}`);
    }

    this.client = axios.create({
      baseURL: 'https://api.mercadopago.com',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    
    console.log(`📌 Configuração final: Environment=${this.environment}, isSandbox=${this.isSandbox}`);
  }

  /**
   * Retorna o ambiente atual
   */
  getEnvironment(): 'development' | 'production' {
    return this.environment;
  }

  /**
   * Retorna a public key do ambiente atual
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  // ============================================
  // MÉTODOS - CHECKOUT PREFERENCES (PAGAMENTOS ÚNICOS)
  // ============================================

  /**
   * Cria uma preferência de checkout (pagamento único)
   */
  async createCheckoutPreference(payload: CheckoutPreferencePayload): Promise<CheckoutPreferenceResponse> {
    try {
      // Monta payload limpo removendo campos undefined
      const cleanPayload: any = {
        items: payload.items,
        back_urls: payload.back_urls,
        external_reference: payload.external_reference,
        statement_descriptor: 'STOCK SAVVY' // Descrição na fatura do cartão
      };

      // Adiciona payer se fornecido
      if (payload.payer?.email) {
        cleanPayload.payer = {
          email: payload.payer.email
        };
        
        // Adiciona nome apenas se fornecido
        if (payload.payer.name) {
          cleanPayload.payer.name = payload.payer.name;
        }
        if (payload.payer.surname) {
          cleanPayload.payer.surname = payload.payer.surname;
        }
      }

      // Adiciona auto_return apenas se fornecido
      if (payload.auto_return) {
        cleanPayload.auto_return = payload.auto_return;
      }

      // Adiciona notification_url apenas se fornecido
      if (payload.notification_url) {
        cleanPayload.notification_url = payload.notification_url;
      }

      console.log('Enviando payload para Mercado Pago:', JSON.stringify(cleanPayload, null, 2));

      const response = await this.client.post('/checkout/preferences', cleanPayload);
      return response.data;
    } catch (error: any) {
      console.error('=== ERRO DETALHADO MERCADO PAGO ===');
      console.error('Status:', error.response?.status);
      console.error('Dados do erro:', JSON.stringify(error.response?.data, null, 2));
      console.error('Mensagem:', error.message);
      console.error('===================================');
      throw new Error(error.response?.data?.message || error.message || 'Erro ao criar preferência de checkout');
    }
  }

  /**
   * Busca detalhes de um pagamento
   */
  async getPaymentDetails(paymentId: string): Promise<PaymentDetail> {
    try {
      const response = await this.client.get(`/v1/payments/${paymentId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar detalhes do pagamento:', error.response?.data || error.message);
      throw new Error('Erro ao buscar detalhes do pagamento');
    }
  }

  /**
   * Retorna se está em modo sandbox
   */
  isSandboxMode(): boolean {
    return this.isSandbox;
  }

  // ============================================
  // MÉTODOS - ASSINATURAS (PREAPPROVAL)
  // ============================================

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
